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
    const [sortBy, setSortBy] = useState<'reputation' | 'earnings' | 'submissions'>('reputation');

    useEffect(() => {
        if (isConnected) {
            loadLeaderboard();
        }
    }, [isConnected]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const totalResult = await getTotalResearchers(address);
            const total = totalResult.value?.value || 0;

            const leaderboardData: LeaderboardEntry[] = [];

            // For demo purposes, we'll load a sample of researchers
            // In production, you'd want to implement pagination or load from a backend
            const sampleAddresses = [
                address, // Include current user
                // Add more known addresses if available
            ];

            for (const researcherAddress of sampleAddresses) {
                try {
                    const profileResult = await getResearcherProfile(researcherAddress, address);
                    
                    if (profileResult.value) {
                        const successRateResult = await calculateSuccessRate(researcherAddress, address);
                        const successRate = successRateResult.value?.value || 0;

                        leaderboardData.push({
                            researcher: researcherAddress,
                            totalSubmissions: profileResult.value['total-submissions'].value,
                            acceptedSubmissions: profileResult.value['accepted-submissions'].value,
                            rejectedSubmissions: profileResult.value['rejected-submissions'].value,
                            totalEarned: profileResult.value['total-earned'].value / 1000000,
                            reputationScore: profileResult.value['reputation-score'].value,
                            joinedAt: profileResult.value['joined-at'].value,
                            isVerified: profileResult.value['is-verified'].value,
                            successRate: successRate,
                        });
                    }
                } catch (err) {
                    console.error(`Failed to load profile for ${researcherAddress}:`, err);
                }
            }

            setResearchers(leaderboardData);
        } catch (err) {
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

    return (
        <div className="leaderboard">
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
