import { useState } from 'react';
import { useStacks } from '../hooks/useStacks';
import { createBounty } from '../utils/contractCalls';
import type { CreateBountyForm } from '../types';

export function CreateBounty() {
    const { address, isConnected } = useStacks();
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState('');
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
            const txid = await createBounty(formData, address);
            setTxId(txid);
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
            console.error('Failed to create bounty:', error);
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
                        Bounty created! Transaction ID: {txId}
                    </div>
                )}
            </form>
        </div>
    );
}
