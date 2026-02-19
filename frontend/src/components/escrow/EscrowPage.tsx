import { useState, useEffect, useCallback } from 'react';
import { useStacks } from '@/hooks/useStacks';
import {
    createEscrow,
    getEscrow,
    getTotalEscrows,
    getMilestone,
    releaseMilestone,
    disputeEscrow,
} from '@/utils/contractCalls';
import { EscrowSystem } from './EscrowSystem';
import type { EscrowContract, Milestone, CreateEscrowData } from './EscrowSystem';

const BLOCKS_PER_DAY = 144;
const MS_PER_BLOCK = (24 * 60 * 60 * 1000) / BLOCKS_PER_DAY; // ~10 minutes

function parseEscrowResponse(data: any, escrowId: number): EscrowContract | null {
    if (!data || !data.value) return null;

    const val = data.value?.value || data.value;
    if (!val) return null;

    const statusMap: Record<string, EscrowContract['status']> = {
        pending: 'pending',
        active: 'active',
        completed: 'completed',
        disputed: 'disputed',
        refunded: 'refunded',
    };

    const rawStatus = val.status?.value || 'pending';

    return {
        id: String(escrowId),
        bountyId: '',
        employer: val.employer?.value || '',
        worker: val.worker?.value || '',
        amount: val['total-amount']?.value
            ? String(Number(val['total-amount'].value) / 1_000_000)
            : '0',
        status: statusMap[rawStatus] || 'pending',
        createdAt: new Date(),
        releaseConditions: ['Milestone completion verified by employer'],
        milestones: [],
    };
}

function parseMilestoneResponse(data: any, index: number): Milestone | null {
    if (!data || !data.value) return null;

    const val = data.value?.value || data.value;
    if (!val) return null;

    const statusMap: Record<string, Milestone['status']> = {
        pending: 'pending',
        approved: 'approved',
        released: 'released',
    };

    const rawStatus = val.status?.value || 'pending';

    return {
        id: String(index),
        description: val.description?.value || `Milestone ${index + 1}`,
        amount: val.amount?.value
            ? String(Number(val.amount.value) / 1_000_000)
            : '0',
        status: statusMap[rawStatus] || 'pending',
    };
}

export const EscrowPage = () => {
    const { address, isConnected } = useStacks();
    const [activeEscrow, setActiveEscrow] = useState<EscrowContract | null>(null);
    const [escrowId, setEscrowId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lookupId, setLookupId] = useState('');

    const loadEscrow = useCallback(async (id: number) => {
        if (!address) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getEscrow(id, address);
            const escrow = parseEscrowResponse(result, id);

            if (!escrow) {
                setError(`Escrow #${id} not found`);
                setActiveEscrow(null);
                return;
            }

            // Load milestones for the escrow
            const milestones: Milestone[] = [];
            for (let i = 0; i < 10; i++) {
                try {
                    const msResult = await getMilestone(id, i, address);
                    const milestone = parseMilestoneResponse(msResult, i);
                    if (milestone) {
                        milestones.push(milestone);
                    } else {
                        break;
                    }
                } catch {
                    break;
                }
            }

            escrow.milestones = milestones;
            setActiveEscrow(escrow);
            setEscrowId(id);
        } catch (err) {
            console.error('Failed to load escrow:', err);
            setError(err instanceof Error ? err.message : 'Failed to load escrow');
            setActiveEscrow(null);
        } finally {
            setLoading(false);
        }
    }, [address]);

    const handleCreateEscrow = useCallback(async (data: CreateEscrowData) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const amountMicro = Math.round(parseFloat(data.amount) * 1_000_000);
        const durationBlocks = data.deadline
            ? Math.max(1, Math.round((data.deadline.getTime() - Date.now()) / MS_PER_BLOCK))
            : 30 * BLOCKS_PER_DAY;

        await createEscrow(
            data.worker,
            amountMicro,
            durationBlocks,
            address,
            () => {
                console.log('Escrow created successfully');
            },
            (err) => {
                console.error('Escrow creation failed:', err);
            }
        );
    }, [address]);

    const handleReleasePayment = useCallback(async (id: string) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new Error('Invalid escrow ID');
        }

        // Release the next pending milestone
        const contract = activeEscrow;
        if (!contract || !contract.milestones) return;

        const nextPending = contract.milestones.findIndex(
            (m) => m.status === 'pending' || m.status === 'approved'
        );

        if (nextPending === -1) {
            throw new Error('No pending milestones to release');
        }

        const milestoneAmount = contract.milestones[nextPending].amount;

        await releaseMilestone(
            numericId,
            nextPending,
            milestoneAmount,
            address,
            () => {
                console.log(`Milestone ${nextPending} released`);
                loadEscrow(numericId);
            },
            (err) => {
                console.error('Milestone release failed:', err);
            }
        );
    }, [address, activeEscrow, loadEscrow]);

    const handleDispute = useCallback(async (id: string, _reason: string) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new Error('Invalid escrow ID');
        }

        await disputeEscrow(
            numericId,
            address,
            () => {
                console.log('Escrow disputed successfully');
                loadEscrow(numericId);
            },
            (err) => {
                console.error('Escrow dispute failed:', err);
            }
        );
    }, [address, loadEscrow]);

    const handleLookup = () => {
        const id = parseInt(lookupId, 10);
        if (!isNaN(id) && id >= 0) {
            loadEscrow(id);
        }
    };

    if (!isConnected) {
        return (
            <div className="escrow-page">
                <h2>Escrow Management</h2>
                <p className="escrow-page-notice">
                    Connect your wallet to create and manage escrow contracts.
                </p>
            </div>
        );
    }

    return (
        <div className="escrow-page">
            <h2>Escrow Management</h2>

            <div className="escrow-lookup">
                <input
                    type="number"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    placeholder="Enter escrow ID to look up"
                    className="escrow-input"
                    min="0"
                />
                <button
                    onClick={handleLookup}
                    disabled={loading || !lookupId}
                    className="escrow-btn escrow-btn--primary"
                >
                    {loading ? 'Loading...' : 'Look Up'}
                </button>
            </div>

            {error && (
                <div className="escrow-error">
                    <p>{error}</p>
                </div>
            )}

            <EscrowSystem
                contract={activeEscrow || undefined}
                onCreateEscrow={handleCreateEscrow}
                onReleasePayment={handleReleasePayment}
                onDispute={handleDispute}
            />
        </div>
    );
};
