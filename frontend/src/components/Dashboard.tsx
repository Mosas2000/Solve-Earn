import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/useStacks';
import {
    getResearcherProfile,
    calculateSuccessRate,
    registerResearcher,
    getBounty,
    getSubmission,
    getTotalBounties,
    getTotalSubmissions,
} from '@/utils/contractCalls';
import type { ResearcherProfile, Submission, Bounty } from '@/types';
import '@/styles/ErrorStates.css';

interface DashboardStats {
    myBounties: Bounty[];
    mySubmissions: Submission[];
    profile: ResearcherProfile | null;
    successRate: number;
}

export function Dashboard() {
    const { address, isConnected } = useStacks();
    const [stats, setStats] = useState<DashboardStats>({
        myBounties: [],
        mySubmissions: [],
        profile: null,
        successRate: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'bounties' | 'submissions'>('overview');

    useEffect(() => {
        if (isConnected) {
            loadDashboard();
        }
    }, [isConnected]);

    const loadDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load researcher profile
            let profile = null;
            let successRate = 0;
            
            try {
                const profileResult = await getResearcherProfile(address, address);
                if (!profileResult?.value) {
                    console.warn('getResearcherProfile returned unexpected format:', profileResult);
                } else {
                    const v = profileResult.value;
                    // Validate required fields
                    if (v['total-submissions']?.value !== undefined) {
                        profile = {
                            researcher: address,
                            totalSubmissions: v['total-submissions'].value,
                            acceptedSubmissions: v['accepted-submissions']?.value || 0,
                            rejectedSubmissions: v['rejected-submissions']?.value || 0,
                            totalEarned: (v['total-earned']?.value || 0) / 1000000,
                            reputationScore: v['reputation-score']?.value || 0,
                            joinedAt: v['joined-at']?.value || 0,
                            isVerified: v['is-verified']?.value ?? false,
                        };

                        const rateResult = await calculateSuccessRate(address, address);
                        if (rateResult?.value?.value !== undefined) {
                            successRate = rateResult.value.value;
                        }
                    }
                }
            } catch (err) {
                console.warn('User not registered as researcher:', err);
                // Not an error - user simply hasn't registered yet
            }

            // Fetch total counts in parallel
            let totalBountyCount = 20;
            let totalSubCount = 50;
            try {
                const [bountyCountResult, subCountResult] = await Promise.allSettled([
                    getTotalBounties(address),
                    getTotalSubmissions(address),
                ]);
                if (bountyCountResult.status === 'fulfilled' && bountyCountResult.value?.value?.value) {
                    totalBountyCount = bountyCountResult.value.value.value;
                } else if (bountyCountResult.status === 'rejected') {
                    console.error('Failed to get total bounties:', bountyCountResult.reason);
                }
                if (subCountResult.status === 'fulfilled' && subCountResult.value?.value?.value) {
                    totalSubCount = subCountResult.value.value.value;
                } else if (subCountResult.status === 'rejected') {
                    console.error('Failed to get total submissions:', subCountResult.reason);
                }
            } catch (err) {
                console.error('Could not get totals:', err);
                setError('Failed to fetch data counts from blockchain. Using default values.');
            }
            } catch (err) {
                console.log('Could not get totals, using defaults');
            }

            // Fetch all bounties and submissions in parallel
            const bountyIds = Array.from({ length: totalBountyCount }, (_, i) => i + 1);
            const subIds = Array.from({ length: totalSubCount }, (_, i) => i + 1);

            const [bountyResults, subResults] = await Promise.all([
                Promise.allSettled(bountyIds.map((id) => getBounty(id, address))),
                Promise.allSettled(subIds.map((id) => getSubmission(id, address))),
            ]);

            // Filter bounties owned by the current user
            const myBounties: Bounty[] = [];
            bountyResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value?.value) {
                    try {
                        const v = result.value.value;
                        if (v.project?.value === address) {
                            // Validate required fields
                            if (!v.title?.value || !v['total-pool']?.value) {
                                console.warn(`Bounty ${bountyIds[index]} missing required fields:`, v);
                                return;
                            }
                            myBounties.push({
                                id: bountyIds[index],
                                project: v.project.value,
                                title: v.title.value,
                                description: v.description?.value || '',
                                totalPool: v['total-pool'].value / 1000000,
                                remainingPool: v['remaining-pool']?.value / 1000000 || 0,
                                criticalReward: v['critical-reward']?.value / 1000000 || 0,
                                highReward: v['high-reward']?.value / 1000000 || 0,
                                mediumReward: v['medium-reward']?.value / 1000000 || 0,
                                lowReward: v['low-reward']?.value / 1000000 || 0,
                                expiresAt: v['expires-at']?.value || 0,
                                createdAt: v['created-at']?.value || 0,
                                isActive: v['is-active']?.value ?? false,
                            });
                        }
                    } catch (parseErr) {
                        console.error(`Failed to parse bounty ${bountyIds[index]}:`, parseErr);
                    }
                } else if (result.status === 'rejected') {
                    console.error(`Failed to fetch bounty ${bountyIds[index]}:`, result.reason);
                }
            });

            // Filter submissions belonging to the current user
            const mySubmissions: Submission[] = [];
            subResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value?.value) {
                    try {
                        const v = result.value.value;
                        if (v.researcher?.value === address) {
                            // Validate required fields
                            if (!v['bounty-id']?.value || !v.severity?.value) {
                                console.warn(`Submission ${subIds[index]} missing required fields:`, v);
                                return;
                            }
                            mySubmissions.push({
                                id: subIds[index],
                                bountyId: v['bounty-id'].value,
                                researcher: v.researcher.value,
                                severity: v.severity.value,
                                reportHash: v['report-hash']?.value || '',
                                submittedAt: v['submitted-at']?.value || 0,
                                status: v.status?.value || 'pending',
                                rewardAmount: (v['reward-amount']?.value || 0) / 1000000,
                            });
                        }
                    } catch (parseErr) {
                        console.error(`Failed to parse submission ${subIds[index]}:`, parseErr);
                    }
                } else if (result.status === 'rejected') {
                    console.error(`Failed to fetch submission ${subIds[index]}:`, result.reason);
                }
            });

            setStats({
                myBounties,
                mySubmissions,
                profile,
                successRate,
            });
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to load dashboard data: ${errorMessage}. Please check your connection and try again.`);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setRegistering(true);
        try {
            const txid = await registerResearcher(address);
            console.log('Registered as researcher! TxID:', txid);
            
            // Refresh dashboard after a short delay
            setTimeout(() => {
                loadDashboard();
            }, 3000);
        } catch (err) {
            console.error('Failed to register:', err);
        } finally {
            setRegistering(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="dashboard">
                <div className="empty-state">
                    <p>Please connect your wallet to view your dashboard</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dashboard">
                <div className="loading">Loading dashboard...</div>
            </div>
        );
    }

    if (error && !stats.profile && stats.myBounties.length === 0 && stats.mySubmissions.length === 0) {
        return (
            <div className="dashboard">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Failed to Load Dashboard</h3>
                    <p>{error}</p>
                    <button onClick={loadDashboard} className="retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!stats.profile) {
        return (
            <div className="dashboard">
                <div className="register-prompt">
                    <h2>Welcome to Solve-Earn!</h2>
                    <p>Register as a security researcher to start earning rewards</p>
                    <button
                        className="register-btn"
                        onClick={handleRegister}
                        disabled={registering}
                    >
                        {registering ? 'Registering...' : 'Register as Researcher'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {error && (
                <div className="warning-banner">
                    <span className="warning-icon">⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="dismiss-btn">×</button>
                </div>
            )}
            <div className="dashboard-header">
                <h1>My Dashboard</h1>
                <button onClick={loadDashboard} className="refresh-btn">
                    Refresh
                </button>
            </div>

            <div className="profile-summary">
                <div className="profile-card">
                    <h3>Profile</h3>
                    <div className="profile-info">
                        <div className="info-item">
                            <span className="label">Address:</span>
                            <span className="value">
                                {address.slice(0, 10)}...{address.slice(-8)}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="label">Reputation Score:</span>
                            <span className="value reputation-score">
                                {stats.profile.reputationScore}/100
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="label">Success Rate:</span>
                            <span className="value">{stats.successRate}%</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Status:</span>
                            <span className={`value ${stats.profile.isVerified ? 'verified' : ''}`}>
                                {stats.profile.isVerified ? 'Verified ✓' : 'Unverified'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <h4>Total Earned</h4>
                        <p className="stat-value">{stats.profile.totalEarned.toFixed(2)} STX</p>
                    </div>
                    <div className="stat-card">
                        <h4>Accepted</h4>
                        <p className="stat-value">{stats.profile.acceptedSubmissions}</p>
                    </div>
                    <div className="stat-card">
                        <h4>Pending</h4>
                        <p className="stat-value">
                            {stats.mySubmissions.filter((s) => s.status === 'pending').length}
                        </p>
                    </div>
                    <div className="stat-card">
                        <h4>My Bounties</h4>
                        <p className="stat-value">{stats.myBounties.length}</p>
                    </div>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={activeTab === 'bounties' ? 'active' : ''}
                    onClick={() => setActiveTab('bounties')}
                >
                    My Bounties ({stats.myBounties.length})
                </button>
                <button
                    className={activeTab === 'submissions' ? 'active' : ''}
                    onClick={() => setActiveTab('submissions')}
                >
                    My Submissions ({stats.mySubmissions.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview">
                        <h3>Recent Activity</h3>
                        {stats.mySubmissions.length === 0 ? (
                            <p>No submissions yet. Start hunting for bugs!</p>
                        ) : (
                            <div className="recent-submissions">
                                {stats.mySubmissions.slice(0, 5).map((submission) => (
                                    <div key={submission.id} className="activity-item">
                                        <span className={`status-dot ${submission.status}`} />
                                        <span>Submission #{submission.id}</span>
                                        <span className="severity">{submission.severity}</span>
                                        <span className="reward">{submission.rewardAmount} STX</span>
                                        <span className={`status ${submission.status}`}>
                                            {submission.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bounties' && (
                    <div className="my-bounties">
                        {stats.myBounties.length === 0 ? (
                            <p>You haven't created any bounties yet</p>
                        ) : (
                            stats.myBounties.map((bounty) => (
                                <div key={bounty.id} className="bounty-item">
                                    <h4>{bounty.title}</h4>
                                    <p>{bounty.description}</p>
                                    <div className="bounty-meta">
                                        <span>Pool: {bounty.remainingPool}/{bounty.totalPool} STX</span>
                                        <span className={bounty.isActive ? 'active' : 'inactive'}>
                                            {bounty.isActive ? 'Active' : 'Closed'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'submissions' && (
                    <div className="my-submissions">
                        {stats.mySubmissions.length === 0 ? (
                            <p>No submissions yet</p>
                        ) : (
                            stats.mySubmissions.map((submission) => (
                                <div key={submission.id} className="submission-item">
                                    <div className="submission-header">
                                        <span className="id">#{submission.id}</span>
                                        <span className={`severity ${submission.severity}`}>
                                            {submission.severity}
                                        </span>
                                        <span className={`status ${submission.status}`}>
                                            {submission.status}
                                        </span>
                                    </div>
                                    <div className="submission-details">
                                        <span>Bounty: #{submission.bountyId}</span>
                                        <span>Reward: {submission.rewardAmount} STX</span>
                                        <span>Block: #{submission.submittedAt}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
