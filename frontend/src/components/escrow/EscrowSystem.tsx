import { useState } from 'react';
import {
  LockIcon,
  ShieldIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/components/icons/Icons';
import '@/styles/EscrowSystem.css';

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
    icon: ClockIcon,
    cssClass: 'escrow-status--pending',
    label: 'Pending Acceptance',
  },
  active: {
    icon: LockIcon,
    cssClass: 'escrow-status--active',
    label: 'Active',
  },
  completed: {
    icon: CheckCircleIcon,
    cssClass: 'escrow-status--completed',
    label: 'Completed',
  },
  disputed: {
    icon: AlertCircleIcon,
    cssClass: 'escrow-status--disputed',
    label: 'Disputed',
  },
  refunded: {
    icon: AlertCircleIcon,
    cssClass: 'escrow-status--refunded',
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
      <div className="escrow-card">
        <h3 className="escrow-title">Create Escrow Contract</h3>

        <div>
          <div className="escrow-form-group">
            <label>Bounty ID</label>
            <input
              type="text"
              value={createData.bountyId}
              onChange={(e) => setCreateData({ ...createData, bountyId: e.target.value })}
              placeholder="Enter bounty ID"
              className="escrow-input"
            />
          </div>

          <div className="escrow-form-group">
            <label>Worker Address</label>
            <input
              type="text"
              value={createData.worker}
              onChange={(e) => setCreateData({ ...createData, worker: e.target.value })}
              placeholder="SP..."
              className="escrow-input escrow-input-mono"
            />
          </div>

          <div className="escrow-form-group">
            <label>Escrow Amount (STX)</label>
            <input
              type="number"
              value={createData.amount}
              onChange={(e) => setCreateData({ ...createData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              className="escrow-input"
            />
          </div>

          <div className="escrow-info-banner escrow-info-banner--info">
            <ShieldIcon className="escrow-info-icon" size={16} />
            <p className="escrow-info-text">
              Funds will be locked in a smart contract until work is completed and verified.
            </p>
          </div>

          <div className="escrow-btn-row">
            <button
              onClick={() => setView('overview')}
              disabled={loading}
              className="escrow-btn escrow-btn--secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEscrow}
              disabled={loading || !createData.bountyId || !createData.worker || !createData.amount}
              className="escrow-btn escrow-btn--primary"
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
      <div className="escrow-card">
        <h3 className="escrow-title">Submit Dispute</h3>

        <div>
          <div className="escrow-form-group">
            <label>Dispute Reason</label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain why you are disputing this escrow contract..."
              rows={5}
              className="escrow-textarea"
            />
          </div>

          <div className="escrow-info-banner escrow-info-banner--danger">
            <AlertCircleIcon className="escrow-info-icon" size={16} />
            <p className="escrow-info-text">
              A dispute will freeze the escrow and require resolution through the dispute resolver contract.
            </p>
          </div>

          <div className="escrow-btn-row">
            <button
              onClick={() => setView('overview')}
              disabled={loading}
              className="escrow-btn escrow-btn--secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDispute}
              disabled={loading || !disputeReason}
              className="escrow-btn escrow-btn--danger"
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
      <div className="escrow-card">
        <div className="escrow-empty">
          <LockIcon className="escrow-empty-icon" />
          <h3 className="escrow-empty-title">No Active Escrow</h3>
          <p className="escrow-empty-desc">Create an escrow contract to secure payments</p>
          {onCreateEscrow && (
            <button
              onClick={() => setView('create')}
              className="escrow-empty-btn"
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
    <div className="escrow-card-flush">
      <div className="escrow-header">
        <div className="escrow-header-row">
          <h3 className="escrow-header-title">Escrow Contract</h3>
          <div className={`escrow-status-badge ${statusCfg.cssClass}`}>
            <StatusIcon className="escrow-status-icon" />
            {statusCfg.label}
          </div>
        </div>

        <p className="escrow-contract-id">ID: {contract.id}</p>
      </div>

      <div className="escrow-body">
        {/* Amount */}
        <div className="escrow-amount-box">
          <p className="escrow-amount-label">Secured Amount</p>
          <p className="escrow-amount-value">{contract.amount} STX</p>
        </div>

        {/* Parties */}
        <div className="escrow-parties">
          <div className="escrow-party-card">
            <p className="escrow-party-label">Employer</p>
            <p className="escrow-party-address">{contract.employer.slice(0, 10)}...</p>
          </div>
          <div className="escrow-party-card">
            <p className="escrow-party-label">Worker</p>
            <p className="escrow-party-address">{contract.worker.slice(0, 10)}...</p>
          </div>
        </div>

        {/* Milestones */}
        {contract.milestones && contract.milestones.length > 0 && (
          <div className="escrow-milestones">
            <h4 className="escrow-milestones-title">Milestones</h4>
            <div className="escrow-milestones-list">
              {contract.milestones.map((milestone) => (
                <div key={milestone.id} className="escrow-milestone">
                  <div className="escrow-milestone-info">
                    <p className="escrow-milestone-desc">{milestone.description}</p>
                    <p className="escrow-milestone-amount">{milestone.amount} STX</p>
                  </div>
                  <div className={`escrow-milestone-badge escrow-milestone-badge--${milestone.status}`}>
                    {milestone.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {contract.status === 'active' && (
          <div className="escrow-actions">
            <button
              onClick={() => setView('dispute')}
              className="escrow-btn escrow-btn--danger-outline"
            >
              Raise Dispute
            </button>
            <button
              onClick={handleRelease}
              disabled={loading}
              className="escrow-btn escrow-btn--success"
            >
              {loading ? 'Releasing...' : 'Release Payment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
