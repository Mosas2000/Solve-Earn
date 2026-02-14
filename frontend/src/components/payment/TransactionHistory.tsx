import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionType = 'send' | 'receive' | 'contract_call';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  from: string;
  to: string;
  timestamp: Date;
  status: TransactionStatus;
  txHash: string;
  memo?: string;
  fee?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  currentAddress: string;
  onViewDetails?: (tx: Transaction) => void;
  className?: string;
}

const truncateAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-glow-gold',
    bg: 'bg-glow-gold/10',
    border: 'border-glow-gold/30',
    label: 'Pending',
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-glow-green',
    bg: 'bg-glow-green/10',
    border: 'border-glow-green/30',
    label: 'Confirmed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Failed',
  },
};

export const TransactionHistory = ({
  transactions,
  currentAddress,
  onViewDetails,
  className,
}: TransactionHistoryProps) => {
  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-white">Transaction History</h3>
      </div>

      <div className="divide-y divide-slate-800">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isSending = tx.from.toLowerCase() === currentAddress.toLowerCase();
            const StatusIcon = statusConfig[tx.status].icon;
            const statusCfg = statusConfig[tx.status];

            return (
              <div
                key={tx.id}
                onClick={() => onViewDetails?.(tx)}
                className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      isSending ? 'bg-red-500/10' : 'bg-glow-green/10'
                    )}
                  >
                    {isSending ? (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-glow-green" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="text-white font-semibold text-sm">
                          {isSending ? 'Sent' : 'Received'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {isSending ? 'To' : 'From'}: {truncateAddress(isSending ? tx.to : tx.from)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            'font-bold text-sm',
                            isSending ? 'text-red-500' : 'text-glow-green'
                          )}
                        >
                          {isSending ? '-' : '+'}{tx.amount} STX
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-2">
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
                      {tx.memo && (
                        <span className="text-xs text-slate-500 truncate">{tx.memo}</span>
                      )}
                    </div>

                    {/* Transaction Hash */}
                    <p className="text-xs text-slate-600 font-mono mt-2">
                      {truncateAddress(tx.txHash)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface TransactionDetailsModalProps {
  transaction: Transaction;
  onClose: () => void;
  className?: string;
}

export const TransactionDetailsModal = ({
  transaction,
  onClose,
  className,
}: TransactionDetailsModalProps) => {
  const statusCfg = statusConfig[transaction.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full',
          className
        )}
      >
        <h3 className="text-xl font-bold text-white mb-6">Transaction Details</h3>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status</span>
            <div
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                statusCfg.bg,
                statusCfg.color
              )}
            >
              <StatusIcon className="h-4 w-4" />
              {statusCfg.label}
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Amount</span>
            <span className="text-white font-bold">{transaction.amount} STX</span>
          </div>

          {/* Fee */}
          {transaction.fee && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Network Fee</span>
              <span className="text-white">{transaction.fee} STX</span>
            </div>
          )}

          {/* From */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">From</span>
            <span className="text-white font-mono text-sm">{truncateAddress(transaction.from)}</span>
          </div>

          {/* To */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">To</span>
            <span className="text-white font-mono text-sm">{truncateAddress(transaction.to)}</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Date</span>
            <span className="text-white">{new Date(transaction.timestamp).toLocaleString()}</span>
          </div>

          {/* Memo */}
          {transaction.memo && (
            <div>
              <span className="text-slate-400 block mb-2">Memo</span>
              <p className="text-white bg-slate-800 rounded-lg p-3 text-sm">{transaction.memo}</p>
            </div>
          )}

          {/* Transaction Hash */}
          <div>
            <span className="text-slate-400 block mb-2">Transaction Hash</span>
            <a
              href={`https://explorer.stacks.co/txid/${transaction.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-glow-blue hover:underline font-mono text-sm break-all"
            >
              {transaction.txHash}
            </a>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
