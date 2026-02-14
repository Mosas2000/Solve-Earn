import { useState } from 'react';
import { AlertTriangle, MessageSquare, FileText, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentDispute {
  id: string;
  paymentId: string;
  txHash: string;
  amount: string;
  disputedBy: string;
  disputedAgainst: string;
  reason: string;
  description: string;
  evidence: Evidence[];
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface Evidence {
  id: string;
  type: 'message' | 'document' | 'screenshot' | 'transaction';
  content: string;
  uploadedBy: string;
  uploadedAt: Date;
}

interface PaymentDisputeResolutionProps {
  dispute?: PaymentDispute;
  disputes?: PaymentDispute[];
  currentAddress: string;
  onSubmitDispute?: (data: SubmitDisputeData) => Promise<PaymentDispute>;
  onAddEvidence?: (disputeId: string, evidence: Omit<Evidence, 'id' | 'uploadedAt'>) => Promise<void>;
  onResolveDispute?: (disputeId: string, resolution: 'refund' | 'release', reason: string) => Promise<void>;
  className?: string;
}

export interface SubmitDisputeData {
  paymentId: string;
  txHash: string;
  amount: string;
  disputedAgainst: string;
  reason: string;
  description: string;
}

const reasonOptions = [
  'Payment not received',
  'Wrong amount sent',
  'Work not completed',
  'Quality issues',
  'Unauthorized transaction',
  'Other',
];

const statusConfig = {
  open: {
    icon: AlertTriangle,
    color: 'text-glow-gold',
    bg: 'bg-glow-gold/10',
    border: 'border-glow-gold/30',
    label: 'Open',
  },
  under_review: {
    icon: Clock,
    color: 'text-glow-blue',
    bg: 'bg-glow-blue/10',
    border: 'border-glow-blue/30',
    label: 'Under Review',
  },
  resolved_refund: {
    icon: CheckCircle,
    color: 'text-glow-green',
    bg: 'bg-glow-green/10',
    border: 'border-glow-green/30',
    label: 'Resolved - Refund',
  },
  resolved_release: {
    icon: CheckCircle,
    color: 'text-glow-green',
    bg: 'bg-glow-green/10',
    border: 'border-glow-green/30',
    label: 'Resolved - Release',
  },
  dismissed: {
    icon: XCircle,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    label: 'Dismissed',
  },
};

export const PaymentDisputeResolution = ({
  dispute,
  disputes = [],
  currentAddress,
  onSubmitDispute,
  onAddEvidence,
  onResolveDispute,
  className,
}: PaymentDisputeResolutionProps) => {
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedDispute, setSelectedDispute] = useState<PaymentDispute | null>(dispute || null);
  const [submitData, setSubmitData] = useState<SubmitDisputeData>({
    paymentId: '',
    txHash: '',
    amount: '',
    disputedAgainst: '',
    reason: reasonOptions[0],
    description: '',
  });
  const [newEvidence, setNewEvidence] = useState({ type: 'message' as const, content: '' });
  const [resolutionData, setResolutionData] = useState({ type: 'refund' as const, reason: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmitDispute = async () => {
    if (!onSubmitDispute) return;
    setLoading(true);
    try {
      const dispute = await onSubmitDispute(submitData);
      setSelectedDispute(dispute);
      setView('view');
      setSubmitData({
        paymentId: '',
        txHash: '',
        amount: '',
        disputedAgainst: '',
        reason: reasonOptions[0],
        description: '',
      });
    } catch (error) {
      console.error('Failed to submit dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedDispute || !onAddEvidence || !newEvidence.content) return;
    setLoading(true);
    try {
      await onAddEvidence(selectedDispute.id, {
        type: newEvidence.type,
        content: newEvidence.content,
        uploadedBy: currentAddress,
      });
      setNewEvidence({ type: 'message', content: '' });
    } catch (error) {
      console.error('Failed to add evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !onResolveDispute || !resolutionData.reason) return;
    setLoading(true);
    try {
      await onResolveDispute(selectedDispute.id, resolutionData.type, resolutionData.reason);
      setView('list');
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'create') {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Submit Payment Dispute</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Payment/Transaction ID</label>
            <input
              type="text"
              value={submitData.paymentId}
              onChange={(e) => setSubmitData({ ...submitData, paymentId: e.target.value })}
              placeholder="Enter payment or transaction ID"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Transaction Hash</label>
            <input
              type="text"
              value={submitData.txHash}
              onChange={(e) => setSubmitData({ ...submitData, txHash: e.target.value })}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Disputed Amount (STX)</label>
            <input
              type="number"
              value={submitData.amount}
              onChange={(e) => setSubmitData({ ...submitData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Disputed Against</label>
            <input
              type="text"
              value={submitData.disputedAgainst}
              onChange={(e) => setSubmitData({ ...submitData, disputedAgainst: e.target.value })}
              placeholder="SP... address"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Reason</label>
            <select
              value={submitData.reason}
              onChange={(e) => setSubmitData({ ...submitData, reason: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            >
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Detailed Description</label>
            <textarea
              value={submitData.description}
              onChange={(e) => setSubmitData({ ...submitData, description: e.target.value })}
              placeholder="Provide a detailed explanation of the issue..."
              rows={5}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-glow-gold/10 border border-glow-gold/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-glow-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Submitting a false dispute may result in penalties. Ensure all information is accurate and truthful.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('list')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitDispute}
              disabled={
                loading ||
                !submitData.paymentId ||
                !submitData.txHash ||
                !submitData.amount ||
                !submitData.disputedAgainst ||
                !submitData.description
              }
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'view' && selectedDispute) {
    const statusCfg = statusConfig[selectedDispute.status];
    const StatusIcon = statusCfg.icon;
    const isParticipant =
      selectedDispute.disputedBy === currentAddress || selectedDispute.disputedAgainst === currentAddress;
    const canResolve = selectedDispute.status === 'under_review'; // In a real app, only admins could resolve

    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Dispute #{selectedDispute.id}</h3>
          <button onClick={() => setView('list')} className="text-sm text-glow-blue hover:underline">
            Back to List
          </button>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg',
              statusCfg.bg,
              statusCfg.border,
              'border'
            )}
          >
            <StatusIcon className={cn('h-5 w-5', statusCfg.color)} />
            <span className={cn('font-semibold', statusCfg.color)}>{statusCfg.label}</span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Amount</p>
              <p className="text-lg text-white font-bold">{selectedDispute.amount} STX</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Created</p>
              <p className="text-sm text-white">{selectedDispute.createdAt.toLocaleDateString()}</p>
            </div>
          </div>

          {/* Parties */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Parties</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-400">Disputed By</span>
                <span className="text-sm text-white font-mono">{selectedDispute.disputedBy.slice(0, 12)}...</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-400">Disputed Against</span>
                <span className="text-sm text-white font-mono">{selectedDispute.disputedAgainst.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          {/* Reason & Description */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Reason</h4>
            <p className="text-sm text-white bg-slate-800/30 rounded-lg p-3">{selectedDispute.reason}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Description</h4>
            <p className="text-sm text-slate-300 bg-slate-800/30 rounded-lg p-3">{selectedDispute.description}</p>
          </div>

          {/* Evidence */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Evidence</h4>
            {selectedDispute.evidence.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No evidence submitted yet</p>
            ) : (
              <div className="space-y-2">
                {selectedDispute.evidence.map((evidence) => (
                  <div key={evidence.id} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {evidence.type === 'message' && <MessageSquare className="h-4 w-4 text-slate-400" />}
                      {evidence.type === 'document' && <FileText className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs text-slate-400">
                        {evidence.uploadedAt.toLocaleString()} by {evidence.uploadedBy.slice(0, 10)}...
                      </span>
                    </div>
                    <p className="text-sm text-white">{evidence.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Evidence */}
            {isParticipant && (selectedDispute.status === 'open' || selectedDispute.status === 'under_review') && (
              <div className="mt-4 space-y-2">
                <textarea
                  value={newEvidence.content}
                  onChange={(e) => setNewEvidence({ ...newEvidence, content: e.target.value })}
                  placeholder="Add supporting evidence..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
                />
                <button
                  onClick={handleAddEvidence}
                  disabled={loading || !newEvidence.content}
                  className="w-full px-4 py-2 bg-glow-blue hover:bg-glow-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Adding...' : 'Add Evidence'}
                </button>
              </div>
            )}
          </div>

          {/* Resolution */}
          {selectedDispute.resolution && (
            <div className="bg-glow-green/10 border border-glow-green/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Resolution</h4>
              <p className="text-sm text-slate-300">{selectedDispute.resolution}</p>
              {selectedDispute.resolvedAt && (
                <p className="text-xs text-slate-500 mt-2">
                  Resolved on {selectedDispute.resolvedAt.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Admin Resolution (simplified - in real app, only admins would see this) */}
          {canResolve && (
            <div className="border-t border-slate-700 pt-6">
              <h4 className="text-sm font-semibold text-white mb-4">Resolve Dispute</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setResolutionData({ ...resolutionData, type: 'refund' })}
                    className={cn(
                      'px-4 py-3 rounded-lg font-semibold transition-colors',
                      resolutionData.type === 'refund'
                        ? 'bg-glow-green text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    Refund Buyer
                  </button>
                  <button
                    onClick={() => setResolutionData({ ...resolutionData, type: 'release' })}
                    className={cn(
                      'px-4 py-3 rounded-lg font-semibold transition-colors',
                      resolutionData.type === 'release'
                        ? 'bg-glow-green text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    Release to Seller
                  </button>
                </div>
                <textarea
                  value={resolutionData.reason}
                  onChange={(e) => setResolutionData({ ...resolutionData, reason: e.target.value })}
                  placeholder="Explain the resolution decision..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
                />
                <button
                  onClick={handleResolve}
                  disabled={loading || !resolutionData.reason}
                  className="w-full px-4 py-3 bg-glow-green hover:bg-glow-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Payment Disputes</h3>
          {onSubmitDispute && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Submit Dispute
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {disputes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No disputes</p>
          </div>
        ) : (
          disputes.map((dispute) => {
            const statusCfg = statusConfig[dispute.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={dispute.id}
                onClick={() => {
                  setSelectedDispute(dispute);
                  setView('view');
                }}
                className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{dispute.reason}</h4>
                    <p className="text-xs text-slate-400">Dispute #{dispute.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{dispute.amount} STX</p>
                    <p className="text-xs text-slate-500 mt-1">{dispute.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                    statusCfg.bg,
                    statusCfg.color
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
