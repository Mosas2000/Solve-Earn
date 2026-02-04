import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getSubmission, approveSubmission, rejectSubmission, getBounty } from '../utils/contractCalls';
import type { Submission, Bounty } from '../types';

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
            const submissionData: SubmissionWithBounty[] = [];
            
            // Load submissions (checking first 50)
            for (let i = 1; i <= 50; i++) {
                try {
                    const result = await getSubmission(i, address);
                    if (result.value) {
                        const bountyId = result.value['bounty-id'].value;
                        
                        // Get bounty details to check ownership
                        const bountyResult = await getBounty(bountyId, address);
                        if (bountyResult.value && bountyResult.value.project.value === address) {
                            submissionData.push({
                                id: i,
                                bountyId: bountyId,
                                researcher: result.value.researcher.value,
                                severity: result.value.severity.value,
                                reportHash: result.value['report-hash'].value,
                                submittedAt: result.value['submitted-at'].value,
                                status: result.value.status.value,
                                rewardAmount: result.value['reward-amount'].value / 1000000,
                                bountyTitle: bountyResult.value.title.value,
                            });
                        }
                    }
                } catch (err) {
                    // Submission doesn't exist, continue
                    break;
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
