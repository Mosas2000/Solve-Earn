import { useState } from 'react';
import { Lock, Users, Shield, Clock, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import '../../styles/EscrowSystem.css';

export interface EscrowContract {
  id: string;
  bountyId: string;
  employer: string;
  worker: string;
  amount: string;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'refunded';
  createdAt: Date;
  releaseConditions: string[];
  deadline?: Date;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  description: string;
  amount: string;
  status: 'pending' | 'approved' | 'released';
  approvedAt?: Date;
}

interface EscrowSystemProps {
  contract?: EscrowContract;
  onCreateEscrow?: (data: CreateEscrowData) => Promise<void>;
  onReleasePayment?: (escrowId: string) => Promise<void>;
  onDispute?: (escrowId: string, reason: string) => Promise<void>;
  className?: string;
}

export interface CreateEscrowData {
  bountyId: string;
  worker: string;
  amount: string;
  milestones?: Array<{ description: string; amount: string }>;
  deadline?: Date;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-glow-gold',
    bg: 'bg-glow-gold/10',
    border: 'border-glow-gold/30',
    label: 'Pending Acceptance',
  },
  active: {
    icon: Lock,
    color: 'text-glow-blue',
    bg: 'bg-glow-blue/10',
    border: 'border-glow-blue/30',
    label: 'Active',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-glow-green',
    bg: 'bg-glow-green/10',
    border: 'border-glow-green/30',
    label: 'Completed',
  },
  disputed: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Disputed',
  },
  refunded: {
    icon: AlertCircle,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    label: 'Refunded',
  },
};

export const EscrowSystem = ({
  contract,
  onCreateEscrow,
  onReleasePayment,
  onDispute,
  className,
}: EscrowSystemProps) => {
  const [view, setView] = useState<'overview' | 'create' | 'dispute'>('overview');
  const [createData, setCreateData] = useState<CreateEscrowData>({
    bountyId: '',
    worker: '',
    amount: '',
    milestones: [],
  });
  const [disputeReason, setDisputeReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEscrow = async () => {
    if (!onCreateEscrow) return;
    setLoading(true);
    try {
      await onCreateEscrow(createData);
      setView('overview');
      setCreateData({ bountyId: '', worker: '', amount: '', milestones: [] });
    } catch (error) {
      console.error('Failed to create escrow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!contract || !onReleasePayment) return;
    setLoading(true);
    try {
      await onReleasePayment(contract.id);
    } catch (error) {
      console.error('Failed to release payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!contract || !onDispute || !disputeReason) return;
    setLoading(true);
    try {
      await onDispute(contract.id, disputeReason);
      setView('overview');
      setDisputeReason('');
    } catch (error) {
      console.error('Failed to submit dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'create') {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Create Escrow Contract</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Bounty ID</label>
            <input
              type="text"
              value={createData.bountyId}
              onChange={(e) => setCreateData({ ...createData, bountyId: e.target.value })}
              placeholder="Enter bounty ID"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Worker Address</label>
            <input
              type="text"
              value={createData.worker}
              onChange={(e) => setCreateData({ ...createData, worker: e.target.value })}
              placeholder="SP..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Escrow Amount (STX)</label>
            <input
              type="number"
              value={createData.amount}
              onChange={(e) => setCreateData({ ...createData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
            <Shield className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Funds will be locked in a smart contract until work is completed and verified.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('overview')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEscrow}
              disabled={loading || !createData.bountyId || !createData.worker || !createData.amount}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Escrow'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'dispute' && contract) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Submit Dispute</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Dispute Reason</label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain why you are disputing this escrow contract..."
              rows={5}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              A dispute will freeze the escrow and require resolution through the dispute resolver contract.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('overview')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDispute}
              disabled={loading || !disputeReason}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="text-center py-12">
          <Lock className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Active Escrow</h3>
          <p className="text-slate-400 mb-6">Create an escrow contract to secure payments</p>
          {onCreateEscrow && (
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
            >
              Create Escrow
            </button>
          )}
        </div>
      </div>
    );
  }

  const statusCfg = statusConfig[contract.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Escrow Contract</h3>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
              statusCfg.bg,
              statusCfg.color
            )}
          >
            <StatusIcon className="h-4 w-4" />
            {statusCfg.label}
          </div>
        </div>

        <p className="text-sm text-slate-400 font-mono">ID: {contract.id}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount */}
        <div className="text-center py-6 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">Secured Amount</p>
          <p className="text-3xl font-bold text-white">{contract.amount} STX</p>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">Employer</p>
            <p className="text-sm text-white font-mono break-all">{contract.employer.slice(0, 10)}...</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">Worker</p>
            <p className="text-sm text-white font-mono break-all">{contract.worker.slice(0, 10)}...</p>
          </div>
        </div>

        {/* Milestones */}
        {contract.milestones && contract.milestones.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Milestones</h4>
            <div className="space-y-2">
              {contract.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-white">{milestone.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{milestone.amount} STX</p>
                  </div>
                  <div
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      milestone.status === 'released' && 'bg-glow-green/10 text-glow-green',
                      milestone.status === 'approved' && 'bg-glow-blue/10 text-glow-blue',
                      milestone.status === 'pending' && 'bg-slate-700 text-slate-400'
                    )}
                  >
                    {milestone.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {contract.status === 'active' && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('dispute')}
              className="flex-1 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-semibold rounded-lg transition-colors"
            >
              Raise Dispute
            </button>
            <button
              onClick={handleRelease}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-glow-green hover:bg-glow-green/90 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Releasing...' : 'Release Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
