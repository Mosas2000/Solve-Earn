import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import {
    getResearcherProfile,
    calculateSuccessRate,
    registerResearcher,
    getBounty,
    getSubmission,
    getTotalBounties,
    getTotalSubmissions,
} from '../utils/contractCalls';
import type { ResearcherProfile, Submission, Bounty } from '../types';

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
    const [registering, setRegistering] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'bounties' | 'submissions'>('overview');

    useEffect(() => {
        if (isConnected) {
            loadDashboard();
        }
    }, [isConnected]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            // Load researcher profile
            let profile = null;
            let successRate = 0;
            
            try {
                const profileResult = await getResearcherProfile(address, address);
                if (profileResult.value) {
                    profile = {
                        researcher: address,
                        totalSubmissions: profileResult.value['total-submissions'].value,
                        acceptedSubmissions: profileResult.value['accepted-submissions'].value,
                        rejectedSubmissions: profileResult.value['rejected-submissions'].value,
                        totalEarned: profileResult.value['total-earned'].value / 1000000,
                        reputationScore: profileResult.value['reputation-score'].value,
                        joinedAt: profileResult.value['joined-at'].value,
                        isVerified: profileResult.value['is-verified'].value,
                    };

                    const rateResult = await calculateSuccessRate(address, address);
                    successRate = rateResult.value?.value || 0;
                }
            } catch (err) {
                console.log('User not registered as researcher');
            }

            // Fetch total counts in parallel
            let totalBountyCount = 20;
            let totalSubCount = 50;
            try {
                const [bountyCountResult, subCountResult] = await Promise.allSettled([
                    getTotalBounties(address),
                    getTotalSubmissions(address),
                ]);
                if (bountyCountResult.status === 'fulfilled') {
                    totalBountyCount = bountyCountResult.value?.value?.value || 20;
                }
                if (subCountResult.status === 'fulfilled') {
                    totalSubCount = subCountResult.value?.value?.value || 50;
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
                    const v = result.value.value;
                    if (v.project.value === address) {
                        myBounties.push({
                            id: bountyIds[index],
                            project: v.project.value,
                            title: v.title.value,
                            description: v.description.value,
                            totalPool: v['total-pool'].value / 1000000,
                            remainingPool: v['remaining-pool'].value / 1000000,
                            criticalReward: v['critical-reward'].value / 1000000,
                            highReward: v['high-reward'].value / 1000000,
                            mediumReward: v['medium-reward'].value / 1000000,
                            lowReward: v['low-reward'].value / 1000000,
                            expiresAt: v['expires-at'].value,
                            createdAt: v['created-at'].value,
                            isActive: v['is-active'].value,
                        });
                    }
                }
            });

            // Filter submissions belonging to the current user
            const mySubmissions: Submission[] = [];
            subResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value?.value) {
                    const v = result.value.value;
                    if (v.researcher.value === address) {
                        mySubmissions.push({
                            id: subIds[index],
                            bountyId: v['bounty-id'].value,
                            researcher: v.researcher.value,
                            severity: v.severity.value,
                            reportHash: v['report-hash'].value,
                            submittedAt: v['submitted-at'].value,
                            status: v.status.value,
                            rewardAmount: v['reward-amount'].value / 1000000,
                        });
                    }
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
