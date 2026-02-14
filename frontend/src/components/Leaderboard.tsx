import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getTotalResearchers, getResearcherProfile, calculateSuccessRate } from '../utils/contractCalls';
import type { ResearcherProfile } from '../types';

interface LeaderboardEntry extends ResearcherProfile {
    successRate: number;
}

export function Leaderboard() {
    const { address, isConnected } = useStacks();
    const [researchers, setResearchers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'reputation' | 'earnings' | 'submissions'>('reputation');

    useEffect(() => {
        if (isConnected) {
            loadLeaderboard();
        }
    }, [isConnected]);

    const loadLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get total researchers count
            try {
                await getTotalResearchers(address);
            } catch (err) {
                console.warn('Failed to get total researchers:', err);
            }

            // For demo purposes, we'll load a sample of researchers
            // In production, you'd want to implement pagination or load from a backend
            const sampleAddresses = [
                address, // Include current user
                // Add more known addresses if available
            ];

            // Fetch all researcher profiles and success rates in parallel
            const results = await Promise.allSettled(
                sampleAddresses.map(async (researcherAddress) => {
                    try {
                        const [profileResult, successRateResult] = await Promise.all([
                            getResearcherProfile(researcherAddress, address),
                            calculateSuccessRate(researcherAddress, address),
                        ]);

                        if (!profileResult?.value) {
                            console.warn(`getResearcherProfile returned unexpected format for ${researcherAddress}:`, profileResult);
                            return null;
                        }

                        const v = profileResult.value;
                        // Validate required fields
                        if (v['total-submissions']?.value === undefined) {
                            console.warn(`Profile for ${researcherAddress} missing required fields:`, v);
                            return null;
                        }

                        const successRate = successRateResult?.value?.value ?? 0;
                        return {
                            researcher: researcherAddress,
                            totalSubmissions: v['total-submissions'].value,
                            acceptedSubmissions: v['accepted-submissions']?.value || 0,
                            rejectedSubmissions: v['rejected-submissions']?.value || 0,
                            totalEarned: (v['total-earned']?.value || 0) / 1000000,
                            reputationScore: v['reputation-score']?.value || 0,
                            joinedAt: v['joined-at']?.value || 0,
                            isVerified: v['is-verified']?.value ?? false,
                            successRate: successRate,
                        } as LeaderboardEntry;
                    } catch (parseErr) {
                        console.error(`Failed to load profile for ${researcherAddress}:`, parseErr);
                        return null;
                    }
                })
            );

            const leaderboardData: LeaderboardEntry[] = [];
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value !== null) {
                    leaderboardData.push(result.value);
                } else if (result.status === 'rejected') {
                    console.error('Failed to fetch researcher data:', result.reason);
                }
            });

            if (leaderboardData.length === 0 && sampleAddresses.length > 0) {
                setError('Unable to load researcher profiles. They may not be registered yet.');
            }

            setResearchers(leaderboardData);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to load leaderboard: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const sortedResearchers = [...researchers].sort((a, b) => {
        switch (sortBy) {
            case 'reputation':
                return b.reputationScore - a.reputationScore;
            case 'earnings':
                return b.totalEarned - a.totalEarned;
            case 'submissions':
                return b.acceptedSubmissions - a.acceptedSubmissions;
            default:
                return 0;
        }
    });

    const getRankColor = (index: number) => {
        if (index === 0) return 'gold';
        if (index === 1) return 'silver';
        if (index === 2) return 'bronze';
        return '';
    };

    if (!isConnected) {
        return (
            <div className="leaderboard">
                <div className="empty-state">
                    <p>Please connect your wallet to view the leaderboard</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="leaderboard">
                <div className="loading">Loading leaderboard...</div>
            </div>
        );
    }

    if (error && researchers.length === 0) {
        return (
            <div className="leaderboard">
                <div className="header">
                    <h2>Security Researcher Leaderboard</h2>
                </div>
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Failed to Load Leaderboard</h3>
                    <p>{error}</p>
                    <button onClick={loadLeaderboard} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard">
            {error && researchers.length > 0 && (
                <div className="warning-banner">
                    <span className="warning-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}
            <div className="header">
                <h2>Security Researcher Leaderboard</h2>
                <div className="sort-controls">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                        <option value="reputation">Reputation Score</option>
                        <option value="earnings">Total Earnings</option>
                        <option value="submissions">Accepted Submissions</option>
                    </select>
                </div>
            </div>

            {researchers.length === 0 ? (
                <div className="empty-state">
                    <p>No researchers registered yet</p>
                    <p>Be the first to start earning!</p>
                </div>
            ) : (
                <div className="leaderboard-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Researcher</th>
                                <th>Reputation</th>
                                <th>Total Earned</th>
                                <th>Submissions</th>
                                <th>Success Rate</th>
                                <th>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedResearchers.map((researcher, index) => (
                                <tr
                                    key={researcher.researcher}
                                    className={researcher.researcher === address ? 'current-user' : ''}
                                >
                                    <td className={`rank ${getRankColor(index)}`}>
                                        {index + 1}
                                    </td>
                                    <td className="address">
                                        {researcher.researcher === address ? (
                                            <span className="you-badge">You</span>
                                        ) : null}
                                        {researcher.researcher.slice(0, 8)}...
                                        {researcher.researcher.slice(-6)}
                                    </td>
                                    <td className="reputation">
                                        <div className="score-bar">
                                            <div
                                                className="score-fill"
                                                style={{ width: `${researcher.reputationScore}%` }}
                                            />
                                            <span>{researcher.reputationScore}/100</span>
                                        </div>
                                    </td>
                                    <td className="earnings">
                                        {researcher.totalEarned.toFixed(2)} STX
                                    </td>
                                    <td className="submissions">
                                        <span className="accepted">{researcher.acceptedSubmissions}</span> /{' '}
                                        <span className="total">{researcher.totalSubmissions}</span>
                                    </td>
                                    <td className="success-rate">
                                        {researcher.successRate}%
                                    </td>
                                    <td className="verified">
                                        {researcher.isVerified ? (
                                            <span className="verified-badge">✓</span>
                                        ) : (
                                            <span className="unverified">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="stats-summary">
                <div className="stat-card">
                    <h3>Total Researchers</h3>
                    <p className="stat-value">{researchers.length}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Earned</h3>
                    <p className="stat-value">
                        {researchers.reduce((sum, r) => sum + r.totalEarned, 0).toFixed(2)} STX
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Submissions</h3>
                    <p className="stat-value">
                        {researchers.reduce((sum, r) => sum + r.totalSubmissions, 0)}
                    </p>
                </div>
            </div>
        </div>
    );
}
