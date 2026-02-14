import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getSubmission, approveSubmission, rejectSubmission, getBounty, getTotalSubmissions } from '../utils/contractCalls';
import { getReport } from '../utils/reportStorage';
import { useToast } from './ToastProvider';
import type { Submission, StoredReport } from '../types';
import '../styles/ErrorStates.css';
import '../styles/ReportDisplay.css';

interface SubmissionWithBounty extends Submission {
    bountyTitle?: string;
    reportContent?: StoredReport | null;
}

export function ManageSubmissions() {
    const { address, isConnected } = useStacks();
    const { showToast } = useToast();
    const [submissions, setSubmissions] = useState<SubmissionWithBounty[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

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
                if (!totalResult?.value?.value) {
                    console.warn('getTotalSubmissions returned unexpected format:', totalResult);
                    throw new Error('Invalid response format from getTotalSubmissions');
                }
                totalSubs = totalResult.value.value;
            } catch (err) {
                console.error('Failed to get total submissions count:', err);
                setError('Failed to fetch submission count. Using default value.');
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
                    const v = result.value.value;
                    if (v['bounty-id']?.value) {
                        validSubs.push({
                            index: subIds[i],
                            bountyId: v['bounty-id'].value,
                            value: v,
                        });
                    } else {
                        console.warn(`Submission ${subIds[i]} missing bounty-id:`, v);
                    }
                } else if (result.status === 'rejected') {
                    console.error(`Failed to fetch submission ${subIds[i]}:`, result.reason);
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
                } else if (result.status === 'rejected') {
                    console.error(`Failed to fetch bounty ${uniqueBountyIds[i]}:`, result.reason);
                }
            });

            // Filter submissions that belong to bounties owned by the current user
            const submissionData: SubmissionWithBounty[] = [];
            for (const sub of validSubs) {
                try {
                    const bounty = bountyMap.get(sub.bountyId);
                    if (bounty && bounty.project?.value === address) {
                        // Validate required fields
                        if (!sub.value.researcher?.value || !sub.value.severity?.value) {
                            console.warn(`Submission ${sub.index} missing required fields:`, sub.value);
                            continue;
                        }
                        
                        const reportHash = sub.value['report-hash']?.value || '';
                        
                        // Fetch off-chain report content if available
                        let reportContent: StoredReport | null = null;
                        if (reportHash) {
                            reportContent = getReport(reportHash);
                            if (!reportContent) {
                                console.warn(`Report not found for hash: ${reportHash}`);
                            }
                        }
                        
                        submissionData.push({
                            id: sub.index,
                            bountyId: sub.bountyId,
                            researcher: sub.value.researcher.value,
                            severity: sub.value.severity.value,
                            reportHash,
                            submittedAt: sub.value['submitted-at']?.value || 0,
                            status: sub.value.status?.value || 'pending',
                            rewardAmount: (sub.value['reward-amount']?.value || 0) / 1000000,
                            bountyTitle: bounty.title?.value || 'Untitled Bounty',
                            reportContent,
                        });
                    }
                } catch (parseErr) {
                    console.error(`Failed to parse submission ${sub.index}:`, parseErr);
                }
            }

            if (submissionData.length === 0 && validSubs.length > 0) {
                setError('No submissions found for your bounties. The submissions may belong to other projects.');
            }

            setSubmissions(submissionData);
        } catch (err) {
            console.error('Failed to load submissions:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to load submissions: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (submissionId: number) => {
        setActionLoading(submissionId);
        setError('');
        try {
            const txId = await approveSubmission(
                submissionId,
                address,
                () => {
                    // Success callback - transaction confirmed
                    showToast('Submission approved successfully!', 'success');
                    loadSubmissions();
                },
                (error: string) => {
                    // Error callback - transaction failed
                    showToast(`Failed to approve submission: ${error}`, 'error');
                }
            );
            
            // Transaction broadcast
            showToast('Transaction broadcast! Waiting for confirmation...', 'info');
            console.log('Submission approved! TxID:', txId);
        } catch (err) {
            console.error('Failed to approve submission:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to approve submission';
            setError(errorMsg);
            showToast(errorMsg, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (submissionId: number) {
        setActionLoading(submissionId);
        setError('');
        try {
            const txId = await rejectSubmission(
                submissionId,
                address,
                () => {
                    // Success callback - transaction confirmed
                    showToast('Submission rejected successfully!', 'success');
                    loadSubmissions();
                },
                (error: string) => {
                    // Error callback - transaction failed
                    showToast(`Failed to reject submission: ${error}`, 'error');
                }
            );
            
            // Transaction broadcast
            showToast('Transaction broadcast! Waiting for confirmation...', 'info');
            console.log('Submission rejected! TxID:', txId);
        } catch (err) {
            console.error('Failed to reject submission:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to reject submission';
            setError(errorMsg);
            showToast(errorMsg, 'error');
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

    const toggleExpanded = (submissionId: number) => {
        setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
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

    if (error && submissions.length === 0) {
        return (
            <div className="manage-submissions">
                <div className="header">
                    <h2>Manage Submissions</h2>
                </div>
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Failed to Load Submissions</h3>
                    <p>{error}</p>
                    <button onClick={loadSubmissions} className="retry-btn">
                        Try Again
                    </button>
                </div>
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

                            {submission.reportContent ? (
                                <div className="report-section">
                                    <button 
                                        className="view-report-btn"
                                        onClick={() => toggleExpanded(submission.id)}
                                    >
                                        {expandedSubmission === submission.id ? '▼ Hide Report' : '▶ View Full Report'}
                                    </button>
                                    
                                    {expandedSubmission === submission.id && (
                                        <div className="report-content">
                                            <div className="report-field">
                                                <h4>Description</h4>
                                                <p>{submission.reportContent.description || 'No description provided'}</p>
                                            </div>
                                            
                                            {submission.reportContent.proofOfConcept && (
                                                <div className="report-field">
                                                    <h4>Proof of Concept</h4>
                                                    <pre>{submission.reportContent.proofOfConcept}</pre>
                                                </div>
                                            )}
                                            
                                            {submission.reportContent.impact && (
                                                <div className="report-field">
                                                    <h4>Impact Assessment</h4>
                                                    <p>{submission.reportContent.impact}</p>
                                                </div>
                                            )}
                                            
                                            {submission.reportContent.recommendation && (
                                                <div className="report-field">
                                                    <h4>Recommended Fix</h4>
                                                    <p>{submission.reportContent.recommendation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="report-unavailable">
                                    <p>⚠️ Report content not available off-chain</p>
                                    <small>Only the hash is stored on the blockchain</small>
                                </div>
                            )}

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
