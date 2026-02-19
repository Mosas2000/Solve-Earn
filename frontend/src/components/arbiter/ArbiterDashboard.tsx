import { useState, useEffect, useCallback } from 'react';
import { useStacks } from '@/hooks/useStacks';
import {
    getSubmission,
    getBounty,
    getTotalSubmissions,
    getApprovalConfirmation,
    getHighValueThreshold,
    confirmApproval,
} from '@/utils/contractCalls';
import { useToast } from '../ToastProvider';
import type { SeverityLevel } from '@/types';

interface PendingConfirmation {
    submissionId: number;
    bountyId: number;
    bountyTitle: string;
    researcher: string;
    severity: SeverityLevel;
    rewardAmount: number;
    submittedAt: number;
}

interface ArbiterConfirmation {
    arbiter: string;
    confirmedAt: number;
}

/**
 * Dashboard for registered arbiters to review and confirm high-value
 * submissions that require independent co-signing before a bounty
 * owner can approve them.
 */
export function ArbiterDashboard() {
    const { address, isConnected } = useStacks();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<PendingConfirmation[]>([]);
    const [confirmed, setConfirmed] = useState<Map<number, ArbiterConfirmation>>(new Map());
    const [threshold, setThreshold] = useState(5_000_000);
    const [confirming, setConfirming] = useState<number | null>(null);

    const fetchPending = useCallback(async () => {
        if (!address) return;
        setLoading(true);

        try {
            const [thresholdVal, totalResult] = await Promise.all([
                getHighValueThreshold(address),
                getTotalSubmissions(address),
            ]);

            setThreshold(thresholdVal);
            const total = totalResult?.value ?? 0;

            const items: PendingConfirmation[] = [];
            const confirmations = new Map<number, ArbiterConfirmation>();

            // Scan submissions for pending high-value ones
            for (let i = 1; i <= total; i++) {
                try {
                    const subResult = await getSubmission(i, address);
                    const sub = subResult?.value;
                    if (!sub) continue;

                    const status = sub.status?.value;
                    if (status !== 'pending') continue;

                    const rewardAmount = sub['reward-amount']?.value ?? 0;
                    if (rewardAmount <= thresholdVal) continue;

                    // Check if already confirmed
                    const conf = await getApprovalConfirmation(i, address);
                    if (conf?.value) {
                        confirmations.set(i, {
                            arbiter: conf.value.arbiter?.value || '',
                            confirmedAt: conf.value['confirmed-at']?.value || 0,
                        });
                        // Still show it, but mark as confirmed
                    }

                    const bountyId = sub['bounty-id']?.value;
                    let bountyTitle = `Bounty #${bountyId}`;
                    try {
                        const bountyResult = await getBounty(bountyId, address);
                        bountyTitle = bountyResult?.value?.title?.value || bountyTitle;
                    } catch {
                        // Use fallback title
                    }

                    items.push({
                        submissionId: i,
                        bountyId,
                        bountyTitle,
                        researcher: sub.researcher?.value || '',
                        severity: sub.severity?.value || 'medium',
                        rewardAmount,
                        submittedAt: sub['submitted-at']?.value || 0,
                    });
                } catch {
                    // Skip individual failures
                }
            }

            setPending(items);
            setConfirmed(confirmations);
        } catch (error) {
            console.error('Failed to load pending confirmations:', error);
            showToast('Failed to load pending confirmations', 'error');
        } finally {
            setLoading(false);
        }
    }, [address, showToast]);

    useEffect(() => {
        if (isConnected) {
            fetchPending();
        }
    }, [isConnected, fetchPending]);

    const handleConfirm = async (submissionId: number) => {
        if (!address) return;
        setConfirming(submissionId);

        try {
            await confirmApproval(
                submissionId,
                address,
                () => {
                    showToast(`Submission #${submissionId} confirmed`, 'success');
                    fetchPending();
                },
                (err) => {
                    showToast(err, 'error');
                },
            );
        } catch {
            showToast('Failed to submit confirmation transaction', 'error');
        } finally {
            setConfirming(null);
        }
    };

    if (!isConnected) {
        return (
            <div className="arbiter-dashboard">
                <h2>Arbiter Dashboard</h2>
                <p className="empty-state">Connect your wallet to view pending confirmations.</p>
            </div>
        );
    }

    const thresholdSTX = (threshold / 1_000_000).toFixed(2);

    return (
        <div className="arbiter-dashboard">
            <h2>Arbiter Dashboard</h2>
            <p className="threshold-info">
                Submissions with rewards above <strong>{thresholdSTX} STX</strong> require
                arbiter confirmation before the bounty owner can approve them.
            </p>

            {loading && <p className="loading-text">Loading pending confirmations...</p>}

            {!loading && pending.length === 0 && (
                <p className="empty-state">
                    No high-value submissions are awaiting confirmation right now.
                </p>
            )}

            {!loading && pending.length > 0 && (
                <table className="submissions-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Bounty</th>
                            <th>Researcher</th>
                            <th>Severity</th>
                            <th>Reward (STX)</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pending.map((item) => {
                            const isConfirmed = confirmed.has(item.submissionId);
                            const conf = confirmed.get(item.submissionId);
                            const rewardSTX = (item.rewardAmount / 1_000_000).toFixed(2);
                            const truncatedResearcher =
                                item.researcher.length > 12
                                    ? `${item.researcher.substring(0, 6)}...${item.researcher.substring(item.researcher.length - 4)}`
                                    : item.researcher;

                            return (
                                <tr key={item.submissionId}>
                                    <td>#{item.submissionId}</td>
                                    <td>{item.bountyTitle}</td>
                                    <td title={item.researcher}>{truncatedResearcher}</td>
                                    <td>
                                        <span className={`severity-badge severity-${item.severity}`}>
                                            {item.severity}
                                        </span>
                                    </td>
                                    <td>{rewardSTX}</td>
                                    <td>
                                        {isConfirmed ? (
                                            <span className="status-confirmed" title={`Confirmed by ${conf?.arbiter}`}>
                                                Confirmed
                                            </span>
                                        ) : (
                                            <span className="status-pending">Awaiting confirmation</span>
                                        )}
                                    </td>
                                    <td>
                                        {!isConfirmed && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                disabled={confirming === item.submissionId}
                                                onClick={() => handleConfirm(item.submissionId)}
                                            >
                                                {confirming === item.submissionId ? 'Confirming...' : 'Confirm'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
