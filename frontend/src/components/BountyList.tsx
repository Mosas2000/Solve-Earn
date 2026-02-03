import { useState, useEffect } from 'react';
import { useStacks } from '../hooks/useStacks';
import { getBounty } from '../utils/contractCalls';
import type { Bounty } from '../types';

export function BountyList() {
    const { address, isConnected } = useStacks();
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isConnected) {
            loadBounties();
        }
    }, [isConnected]);

    const loadBounties = async () => {
        setLoading(true);
        try {
            const bountyData: Bounty[] = [];
            for (let i = 1; i <= 10; i++) {
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
            setBounties(bountyData.filter((b) => b.isActive));
        } catch (error) {
            console.error('Failed to load bounties:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading bounties...</div>;
    }

    return (
        <div className="bounty-list">
            <div className="header">
                <h2>Active Bounties</h2>
                <button onClick={loadBounties}>Refresh</button>
            </div>

            {bounties.length === 0 ? (
                <div className="empty-state">
                    <p>No active bounties found</p>
                </div>
            ) : (
                <div className="bounties-grid">
                    {bounties.map((bounty) => (
                        <div key={bounty.id} className="bounty-card">
                            <div className="bounty-header">
                                <h3>{bounty.title}</h3>
                                <span className="bounty-id">#{bounty.id}</span>
                            </div>

                            <p className="description">{bounty.description}</p>

                            <div className="bounty-stats">
                                <div className="stat">
                                    <span className="label">Total Pool</span>
                                    <span className="value">{bounty.totalPool} STX</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Remaining</span>
                                    <span className="value">{bounty.remainingPool} STX</span>
                                </div>
                            </div>

                            <div className="rewards">
                                <h4>Reward Tiers</h4>
                                <div className="reward-tier critical">
                                    <span>Critical</span>
                                    <span>{bounty.criticalReward} STX</span>
                                </div>
                                <div className="reward-tier high">
                                    <span>High</span>
                                    <span>{bounty.highReward} STX</span>
                                </div>
                                <div className="reward-tier medium">
                                    <span>Medium</span>
                                    <span>{bounty.mediumReward} STX</span>
                                </div>
                                <div className="reward-tier low">
                                    <span>Low</span>
                                    <span>{bounty.lowReward} STX</span>
                                </div>
                            </div>

                            <div className="bounty-footer">
                                <button className="submit-btn">Submit Finding</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
