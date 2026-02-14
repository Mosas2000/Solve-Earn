import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getSubmission, approveSubmission, rejectSubmission, getBounty, getTotalSubmissions } from '../utils/contractCalls';
import type { Submission } from '../types';

interface SubmissionWithBounty extends Submission {
    bountyTitle?: string;
}

export function ManageSubmissions() {
    const { address, isConnected } = useStacks();
    const [submissions, setSubmissions] = useState<SubmissionWithBounty[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isConnected) {
            loadSubmissions();
        }
    }, [isConnected]);

    const loadSubmissions = async () => {
        setLoading(true);
        setError('');
        try {
            // Get actual submission count from contract
            let totalSubs = 50;
            try {
                const totalResult = await getTotalSubmissions(address);
                totalSubs = totalResult.value?.value || 50;
            } catch (err) {
                console.log('Could not get total submissions, using default');
            }

            // Fetch all submissions in parallel
            const subIds = Array.from({ length: totalSubs }, (_, i) => i + 1);
            const subResults = await Promise.allSettled(
                subIds.map((id) => getSubmission(id, address))
            );

            // Collect valid submissions with their bounty IDs for the second pass
            const validSubs: { index: number; bountyId: number; value: any }[] = [];
            subResults.forEach((result, i) => {
                if (result.status === 'fulfilled' && result.value?.value) {
                    validSubs.push({
                        index: subIds[i],
                        bountyId: result.value.value['bounty-id'].value,
                        value: result.value.value,
                    });
                }
            });

            // Deduplicate bounty IDs so each bounty is fetched only once
            const uniqueBountyIds = [...new Set(validSubs.map((s) => s.bountyId))];
            const bountyResults = await Promise.allSettled(
                uniqueBountyIds.map((id) => getBounty(id, address))
            );

            // Build a lookup map from bountyId to bounty data
            const bountyMap = new Map<number, any>();
            bountyResults.forEach((result, i) => {
                if (result.status === 'fulfilled' && result.value?.value) {
                    bountyMap.set(uniqueBountyIds[i], result.value.value);
                }
            });

            // Filter submissions that belong to bounties owned by the current user
            const submissionData: SubmissionWithBounty[] = [];
            for (const sub of validSubs) {
                const bounty = bountyMap.get(sub.bountyId);
                if (bounty && bounty.project.value === address) {
                    submissionData.push({
                        id: sub.index,
                        bountyId: sub.bountyId,
                        researcher: sub.value.researcher.value,
                        severity: sub.value.severity.value,
                        reportHash: sub.value['report-hash'].value,
                        submittedAt: sub.value['submitted-at'].value,
                        status: sub.value.status.value,
                        rewardAmount: sub.value['reward-amount'].value / 1000000,
                        bountyTitle: bounty.title.value,
                    });
                }
            }

            setSubmissions(submissionData);
        } catch (err) {
            console.error('Failed to load submissions:', err);
            setError('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (submissionId: number) => {
        setActionLoading(submissionId);
        setError('');
        try {
            const txid = await approveSubmission(submissionId, address);
            console.log('Submission approved! TxID:', txid);
            
            // Refresh submissions after a short delay
            setTimeout(() => {
                loadSubmissions();
            }, 3000);
        } catch (err) {
            console.error('Failed to approve submission:', err);
            setError(err instanceof Error ? err.message : 'Failed to approve submission');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (submissionId: number) => {
        setActionLoading(submissionId);
        setError('');
        try {
            const txid = await rejectSubmission(submissionId, address);
            console.log('Submission rejected! TxID:', txid);
            
            // Refresh submissions after a short delay
            setTimeout(() => {
                loadSubmissions();
            }, 3000);
        } catch (err) {
            console.error('Failed to reject submission:', err);
            setError(err instanceof Error ? err.message : 'Failed to reject submission');
        } finally {
            setActionLoading(null);
        }
    };

    const getSeverityClass = (severity: string) => {
        return `severity-${severity.toLowerCase()}`;
    };

    const getStatusClass = (status: string) => {
        return `status-${status.toLowerCase()}`;
    };

    if (!isConnected) {
        return (
            <div className="manage-submissions">
                <div className="empty-state">
                    <p>Please connect your wallet to manage submissions</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="manage-submissions">
                <div className="loading">Loading submissions...</div>
            </div>
        );
    }

    return (
        <div className="manage-submissions">
            <div className="header">
                <h2>Manage Submissions</h2>
                <button onClick={loadSubmissions} disabled={loading}>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {submissions.length === 0 ? (
                <div className="empty-state">
                    <p>No submissions found for your bounties</p>
                </div>
            ) : (
                <div className="submissions-list">
                    {submissions.map((submission) => (
                        <div key={submission.id} className="submission-card">
                            <div className="submission-header">
                                <div className="submission-info">
                                    <h3>Submission #{submission.id}</h3>
                                    <span className="bounty-title">{submission.bountyTitle}</span>
                                </div>
                                <div className="submission-badges">
                                    <span className={`severity-badge ${getSeverityClass(submission.severity)}`}>
                                        {submission.severity.toUpperCase()}
                                    </span>
                                    <span className={`status-badge ${getStatusClass(submission.status)}`}>
                                        {submission.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="submission-details">
                                <div className="detail-row">
                                    <span className="label">Researcher:</span>
                                    <span className="value">
                                        {submission.researcher.slice(0, 8)}...{submission.researcher.slice(-6)}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Reward Amount:</span>
                                    <span className="value">{submission.rewardAmount} STX</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Report Hash:</span>
                                    <span className="value hash">
                                        {submission.reportHash.slice(0, 16)}...
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Submitted At:</span>
                                    <span className="value">Block #{submission.submittedAt}</span>
                                </div>
                            </div>

                            {submission.status === 'pending' && (
                                <div className="submission-actions">
                                    <button
                                        className="approve-btn"
                                        onClick={() => handleApprove(submission.id)}
                                        disabled={actionLoading === submission.id}
                                    >
                                        {actionLoading === submission.id ? 'Processing...' : 'Approve'}
                                    </button>
                                    <button
                                        className="reject-btn"
                                        onClick={() => handleReject(submission.id)}
                                        disabled={actionLoading === submission.id}
                                    >
                                        {actionLoading === submission.id ? 'Processing...' : 'Reject'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
