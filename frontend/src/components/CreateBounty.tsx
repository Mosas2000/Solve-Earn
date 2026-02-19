import { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { createBounty } from '@/utils/contractCalls';
import { useToast } from './ToastProvider';
import type { CreateBountyForm } from '@/types';

export function CreateBounty() {
    const { address, isConnected } = useStacks();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) return;

        setLoading(true);
        try {
            const txId = await createBounty(
                formData,
                address,
                () => {
                    // Success callback - transaction confirmed
                    showToast('Bounty created successfully!', 'success');
                    // Form is already reset
                },
                (error: string) => {
                    // Error callback - transaction failed
                    showToast(`Failed to create bounty: ${error}`, 'error');
                }
            );
            
            // Transaction broadcast - show info
            setTxId(txId);
            showToast('Transaction broadcast! Waiting for confirmation...', 'info');
            console.log('Transaction ID:', txId);
            
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
            console.error('Failed to create bounty:', error);
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
            [name]: name.includes('Reward') || name === 'totalPool' || name === 'durationDays'
                ? Number(value)
                : value,
        }));
    };

    return (
        <div className="create-bounty">
            <h2>Create Bounty Program</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Title (max 50 characters)</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g., Critical API Security Audit"
                        maxLength={50}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description (max 200 characters)</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the scope and requirements..."
                        rows={4}
                        maxLength={200}
                        required
                    />
                </div>

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
                    <div className="form-group">
                        <label htmlFor="criticalReward">Critical (STX)</label>
                        <input
                            type="number"
                            id="criticalReward"
                            name="criticalReward"
                            value={formData.criticalReward}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="highReward">High (STX)</label>
                        <input
                            type="number"
                            id="highReward"
                            name="highReward"
                            value={formData.highReward}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="mediumReward">Medium (STX)</label>
                        <input
                            type="number"
                            id="mediumReward"
                            name="mediumReward"
                            value={formData.mediumReward}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="lowReward">Low (STX)</label>
                        <input
                            type="number"
                            id="lowReward"
                            name="lowReward"
                            value={formData.lowReward}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                            required
                        />
                    </div>
                </div>

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

                <button type="submit" disabled={loading || !isConnected}>
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
