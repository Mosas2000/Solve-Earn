import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getBounty, getTotalBounties } from '../utils/contractCalls';
import { SubmitVulnerability } from './SubmitVulnerability';
import type { Bounty } from '../types';

export function BountyList() {
    const { address, isConnected } = useStacks();
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBounty, setSelectedBounty] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

    useEffect(() => {
        if (isConnected) {
            loadBounties();
        }
    }, [isConnected]);

    const loadBounties = async () => {
        setLoading(true);
        try {
            // Get total bounties count
            let totalBounties = 10;
            try {
                const totalResult = await getTotalBounties(address);
                totalBounties = totalResult.value?.value || 10;
            } catch (err) {
                console.log('Could not get total bounties, using default');
            }

            const bountyData: Bounty[] = [];
            for (let i = 1; i <= Math.min(totalBounties, 50); i++) {
                try {
                    const result = await getBounty(i, address);
                    if (result.value) {
                        bountyData.push({
                            id: i,
                            project: result.value.project.value,
                            title: result.value.title.value,
                            description: result.value.description.value,
                            totalPool: result.value['total-pool'].value / 1000000,
                            remainingPool: result.value['remaining-pool'].value / 1000000,
                            criticalReward: result.value['critical-reward'].value / 1000000,
                            highReward: result.value['high-reward'].value / 1000000,
                            mediumReward: result.value['medium-reward'].value / 1000000,
                            lowReward: result.value['low-reward'].value / 1000000,
                            expiresAt: result.value['expires-at'].value,
                            createdAt: result.value['created-at'].value,
                            isActive: result.value['is-active'].value,
                        });
                    }
                } catch (error) {
                    break;
                }
            }
            setBounties(bountyData);
        } catch (error) {
            console.error('Failed to load bounties:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBounties = bounties.filter((bounty) => {
        if (filter === 'active') return bounty.isActive && bounty.remainingPool > 0;
        if (filter === 'expired') return !bounty.isActive || bounty.remainingPool === 0;
        return true;
    });

    const handleSubmitClick = (bountyId: number) => {
        if (!isConnected) {
            alert('Please connect your wallet first');
            return;
        }
        setSelectedBounty(bountyId);
    };

    const handleSubmitSuccess = () => {
        // Refresh bounties after successful submission
        setTimeout(() => {
            loadBounties();
        }, 2000);
    };

    if (loading) {
        return <div className="loading">Loading bounties...</div>;
    }

    return (
        <div className="bounty-list">
            <div className="header">
                <h2>Bug Bounty Programs</h2>
                <div className="header-actions">
                    <div className="filter-buttons">
                        <button
                            className={filter === 'all' ? 'active' : ''}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={filter === 'active' ? 'active' : ''}
                            onClick={() => setFilter('active')}
                        >
                            Active
                        </button>
                        <button
                            className={filter === 'expired' ? 'active' : ''}
                            onClick={() => setFilter('expired')}
                        >
                            Expired
                        </button>
                    </div>
                    <button onClick={loadBounties} className="refresh-btn">
                        Refresh
                    </button>
                </div>
            </div>

            {filteredBounties.length === 0 ? (
                <div className="empty-state">
                    <p>No {filter !== 'all' ? filter : ''} bounties found</p>
                    <p>Check back later or create your own!</p>
                </div>
            ) : (
                <div className="bounties-grid">
                    {filteredBounties.map((bounty) => (
                        <div key={bounty.id} className="bounty-card">
                            <div className="bounty-header">
                                <h3>{bounty.title}</h3>
                                <div className="bounty-meta">
                                    <span className="bounty-id">#{bounty.id}</span>
                                    {bounty.isActive && bounty.remainingPool > 0 ? (
                                        <span className="status-badge active">Active</span>
                                    ) : (
                                        <span className="status-badge inactive">Closed</span>
                                    )}
                                </div>
                            </div>

                            <p className="description">{bounty.description}</p>

                            <div className="bounty-stats">
                                <div className="stat">
                                    <span className="label">Total Pool</span>
                                    <span className="value">{bounty.totalPool.toFixed(2)} STX</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Remaining</span>
                                    <span className="value remaining">
                                        {bounty.remainingPool.toFixed(2)} STX
                                    </span>
                                </div>
                            </div>

                            <div className="rewards">
                                <h4>Reward Tiers</h4>
                                <div className="reward-tiers">
                                    <div className="reward-tier critical">
                                        <span className="tier-name">Critical</span>
                                        <span className="tier-value">{bounty.criticalReward.toFixed(2)} STX</span>
                                    </div>
                                    <div className="reward-tier high">
                                        <span className="tier-name">High</span>
                                        <span className="tier-value">{bounty.highReward.toFixed(2)} STX</span>
                                    </div>
                                    <div className="reward-tier medium">
                                        <span className="tier-name">Medium</span>
                                        <span className="tier-value">{bounty.mediumReward.toFixed(2)} STX</span>
                                    </div>
                                    <div className="reward-tier low">
                                        <span className="tier-name">Low</span>
                                        <span className="tier-value">{bounty.lowReward.toFixed(2)} STX</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bounty-footer">
                                <div className="project-info">
                                    <span className="label">Project:</span>
                                    <span className="address">
                                        {bounty.project.slice(0, 6)}...{bounty.project.slice(-4)}
                                    </span>
                                </div>
                                {bounty.isActive && bounty.remainingPool > 0 && (
                                    <button
                                        className="submit-btn"
                                        onClick={() => handleSubmitClick(bounty.id)}
                                        disabled={!isConnected}
                                    >
                                        Submit Finding
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedBounty && (
                <SubmitVulnerability
                    bountyId={selectedBounty}
                    onClose={() => setSelectedBounty(null)}
                    onSuccess={handleSubmitSuccess}
                />
            )}
        </div>
    );
}
