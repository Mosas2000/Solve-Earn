import { useState } from 'react';
import { Repeat, Calendar, AlertCircle, Pause, Play, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RecurringPayment {
  id: string;
  name: string;
  recipient: string;
  amount: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextPayment: Date;
  lastPayment?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  totalPayments: number;
  memo?: string;
}

interface RecurringPaymentSetupProps {
  payments?: RecurringPayment[];
  currentBalance: string;
  onCreatePayment?: (data: CreateRecurringPaymentData) => Promise<RecurringPayment>;
  onPausePayment?: (paymentId: string) => Promise<void>;
  onResumePayment?: (paymentId: string) => Promise<void>;
  onCancelPayment?: (paymentId: string) => Promise<void>;
  className?: string;
}

export interface CreateRecurringPaymentData {
  name: string;
  recipient: string;
  amount: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  memo?: string;
}

const frequencyLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const statusConfig = {
  active: {
    icon: Check,
    color: 'text-glow-green',
    bg: 'bg-glow-green/10',
    label: 'Active',
  },
  paused: {
    icon: Pause,
    color: 'text-glow-gold',
    bg: 'bg-glow-gold/10',
    label: 'Paused',
  },
  completed: {
    icon: Check,
    color: 'text-glow-blue',
    bg: 'bg-glow-blue/10',
    label: 'Completed',
  },
  cancelled: {
    icon: Trash2,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Cancelled',
  },
};

export const RecurringPaymentSetup = ({
  payments = [],
  currentBalance,
  onCreatePayment,
  onPausePayment,
  onResumePayment,
  onCancelPayment,
  className,
}: RecurringPaymentSetupProps) => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [createData, setCreateData] = useState<CreateRecurringPaymentData>({
    name: '',
    recipient: '',
    amount: '',
    frequency: 'monthly',
    startDate: new Date(),
    memo: '',
  });
  const [loading, setLoading] = useState(false);

  const calculateNextPayment = (startDate: Date, frequency: string): Date => {
    const next = new Date(startDate);
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  };

  const handleCreatePayment = async () => {
    if (!onCreatePayment) return;
    setLoading(true);
    try {
      await onCreatePayment(createData);
      setView('list');
      setCreateData({
        name: '',
        recipient: '',
        amount: '',
        frequency: 'monthly',
        startDate: new Date(),
        memo: '',
      });
    } catch (error) {
      console.error('Failed to create recurring payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (paymentId: string) => {
    if (!onPausePayment) return;
    setLoading(true);
    try {
      await onPausePayment(paymentId);
    } catch (error) {
      console.error('Failed to pause payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (paymentId: string) => {
    if (!onResumePayment) return;
    setLoading(true);
    try {
      await onResumePayment(paymentId);
    } catch (error) {
      console.error('Failed to resume payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (paymentId: string) => {
    if (!onCancelPayment) return;
    if (!confirm('Are you sure you want to cancel this recurring payment?')) return;
    
    setLoading(true);
    try {
      await onCancelPayment(paymentId);
    } catch (error) {
      console.error('Failed to cancel payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'create') {
    const nextPayment = calculateNextPayment(createData.startDate, createData.frequency);

    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Setup Recurring Payment</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Payment Name</label>
            <input
              type="text"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="e.g., Monthly Rent, Weekly Salary"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Recipient Address</label>
            <input
              type="text"
              value={createData.recipient}
              onChange={(e) => setCreateData({ ...createData, recipient: e.target.value })}
              placeholder="SP..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Amount (STX)</label>
            <input
              type="number"
              value={createData.amount}
              onChange={(e) => setCreateData({ ...createData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
            <p className="text-xs text-slate-500 mt-1">Available balance: {currentBalance} STX</p>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Frequency</label>
            <select
              value={createData.frequency}
              onChange={(e) => setCreateData({ ...createData, frequency: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            >
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Start Date</label>
              <input
                type="date"
                value={createData.startDate.toISOString().split('T')[0]}
                onChange={(e) => setCreateData({ ...createData, startDate: new Date(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">End Date (Optional)</label>
              <input
                type="date"
                value={createData.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setCreateData({ ...createData, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Memo (Optional)</label>
            <textarea
              value={createData.memo}
              onChange={(e) => setCreateData({ ...createData, memo: e.target.value })}
              placeholder="Add a note for each payment..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          {/* Preview */}
          <div className="bg-glow-blue/10 border border-glow-blue/30 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <Repeat className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white font-semibold mb-1">Payment Schedule</p>
                <p className="text-xs text-slate-300">
                  {createData.amount} STX will be sent {frequencyLabels[createData.frequency].toLowerCase()} starting on{' '}
                  {createData.startDate.toLocaleDateString()}
                  {createData.endDate && ` until ${createData.endDate.toLocaleDateString()}`}.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Next payment: {nextPayment.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-glow-gold/10 border border-glow-gold/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-glow-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Ensure you have sufficient balance for each payment. Failed payments will be retried once.
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
              onClick={handleCreatePayment}
              disabled={loading || !createData.name || !createData.recipient || !createData.amount}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recurring Payments</h3>
          {onCreatePayment && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-glow-pink hover:bg-glow-pink/90 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Setup Payment
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recurring payments</p>
          </div>
        ) : (
          payments.map((payment) => {
            const statusCfg = statusConfig[payment.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div key={payment.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{payment.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mb-1">
                      To: {payment.recipient.slice(0, 10)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', statusCfg.bg, statusCfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </div>
                      <span className="text-xs text-slate-500">
                        {frequencyLabels[payment.frequency]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold mb-1">{payment.amount} STX</p>
                    <p className="text-xs text-slate-500">
                      Total: {payment.totalPayments} payments
                    </p>
                  </div>
                </div>

                {payment.memo && (
                  <p className="text-sm text-slate-400 mb-3">{payment.memo}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Calendar className="h-3 w-3" />
                  <span>Next: {payment.nextPayment.toLocaleDateString()}</span>
                  {payment.lastPayment && (
                    <span className="ml-2">
                      Last: {payment.lastPayment.toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {payment.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePause(payment.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                    <button
                      onClick={() => handleCancel(payment.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                )}

                {payment.status === 'paused' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResume(payment.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-glow-green hover:bg-glow-green/90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Resume
                    </button>
                    <button
                      onClick={() => handleCancel(payment.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
