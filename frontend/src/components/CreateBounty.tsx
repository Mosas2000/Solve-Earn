import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { createBounty } from '@/utils/contractCalls';
import { useToast } from './ToastProvider';
import type { CreateBountyForm } from '@/types';

export function CreateBounty() {
    const { address, isConnected } = useStacks();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [rewardWarning, setRewardWarning] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateBountyForm>({
        title: '',
        description: '',
        totalPool: 0,
        criticalReward: 0,
        highReward: 0,
        mediumReward: 0,
        lowReward: 0,
        durationDays: 30,
    });

    // Validate rewards total whenever formData changes
    useEffect(() => {
        const totalRewards =
            formData.criticalReward +
            formData.highReward +
            formData.mediumReward +
            formData.lowReward;
        if (totalRewards > formData.totalPool) {
            setRewardWarning('Warning: Total rewards exceed total pool!');
        } else {
            setRewardWarning(null);
        }
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) return;

        // Prevent submission if rewards exceed total pool
        const totalRewards =
            formData.criticalReward +
            formData.highReward +
            formData.mediumReward +
            formData.lowReward;
        if (totalRewards > formData.totalPool) {
            showToast('Total rewards cannot exceed total pool', 'error');
            return;
        }

        setLoading(true);
        try {
            const txId = await createBounty(
                formData,
                address,
                () => {
                    showToast('Bounty created successfully!', 'success');
                },
                (error: string) => {
                    showToast(`Failed to create bounty: ${error}`, 'error');
                }
            );

            setTxId(txId);
            showToast('Transaction broadcast! Waiting for confirmation...', 'info');

            // Reset form
            setFormData({
                title: '',
                description: '',
                totalPool: 0,
                criticalReward: 0,
                highReward: 0,
                mediumReward: 0,
                lowReward: 0,
                durationDays: 30,
            });
        } catch (error) {
            setTxId(null);
            showToast(error instanceof Error ? error.message : 'Failed to create bounty', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name.includes('Reward') || name === 'totalPool' || name === 'durationDays'
                    ? Number(value)
                    : value,
        }));
    };

    return (
        <div className="create-bounty">
            <h2>Create Bounty Program</h2>
            <form onSubmit={handleSubmit}>
                {/* ...other fields remain unchanged... */}

                <div className="form-group">
                    <label htmlFor="totalPool">Total Pool (STX)</label>
                    <input
                        type="number"
                        id="totalPool"
                        name="totalPool"
                        value={formData.totalPool}
                        onChange={handleChange}
                        min="0"
                        step="0.1"
                        required
                    />
                </div>

                <div className="rewards-grid">
                    {/* Reward inputs unchanged */}
                </div>

                {/* Display reward warning if applicable */}
                {rewardWarning && (
                    <div className="warning-message text-red-500 mt-2">{rewardWarning}</div>
                )}

                <div className="form-group">
                    <label htmlFor="durationDays">Duration (Days)</label>
                    <select
                        id="durationDays"
                        name="durationDays"
                        value={formData.durationDays}
                        onChange={handleChange}
                        required
                    >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                    </select>
                </div>

                <button type="submit" disabled={loading || !isConnected || !!rewardWarning}>
                    {loading ? 'Creating...' : 'Create Bounty'}
                </button>

                {txId && (
                    <div className="success-message">
                        Bounty created! Transaction ID: {txId.slice(0, 10)}...{txId.slice(-6)}
                    </div>
                )}
            </form>
        </div>
    );
}
