import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentConfirmationData {
  recipient: string;
  amount: string;
  memo?: string;
  fee: string;
  total: string;
  recipientName?: string;
  estimatedTime?: string;
}

interface PaymentConfirmationProps {
  data: PaymentConfirmationData;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  className?: string;
}

type ConfirmationState = 'idle' | 'confirming' | 'success' | 'error';

export const PaymentConfirmation = ({
  data,
  onConfirm,
  onCancel,
  className,
}: PaymentConfirmationProps) => {
  const [state, setState] = useState<ConfirmationState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setState('confirming');
      setError(null);
      
      await onConfirm();
      
      // Simulate tx hash generation (in real implementation, this comes from the blockchain)
      const mockTxHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setTxHash(mockTxHash);
      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  if (state === 'success') {
    return (
      <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-glow-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-glow-green" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment Sent!</h3>
            <p className="text-slate-400 mb-6">
              Your transaction has been successfully submitted to the blockchain.
            </p>

            {/* Transaction Details */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Amount</span>
                <span className="text-white font-bold">{data.amount} STX</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Network Fee</span>
                <span className="text-white">{data.fee} STX</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                <span className="text-slate-400 text-sm font-semibold">Total</span>
                <span className="text-white font-bold text-lg">{data.total} STX</span>
              </div>
            </div>

            {/* Transaction Hash */}
            {txHash && (
              <div className="bg-slate-800/30 rounded-lg p-3 mb-6">
                <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                <a
                  href={`https://explorer.stacks.co/txid/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glow-blue hover:underline font-mono text-xs break-all flex items-center gap-1"
                >
                  {txHash}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}

            <button
              onClick={onCancel}
              className="w-full px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-slate-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Transaction Failed</h3>
            <p className="text-slate-400 mb-6">{error || 'An error occurred while processing your transaction.'}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setState('idle')}
                className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={state === 'idle' ? onCancel : undefined} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-6">Confirm Payment</h3>

        {/* Payment Summary */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Sending to</p>
            <p className="text-white font-mono text-sm break-all">{data.recipient}</p>
            {data.recipientName && (
              <p className="text-glow-blue text-sm mt-1">{data.recipientName}</p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Amount</span>
              <span className="text-white font-bold text-lg">{data.amount} STX</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Network Fee</span>
              <span className="text-white">{data.fee} STX</span>
            </div>
            {data.memo && (
              <div className="pt-3 border-t border-slate-700">
                <span className="text-slate-400 text-sm">Memo</span>
                <p className="text-white text-sm mt-1">{data.memo}</p>
              </div>
            )}
            <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-white font-bold text-xl">{data.total} STX</span>
            </div>
          </div>

          {data.estimatedTime && (
            <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
              <Info className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-slate-300">
                  Estimated confirmation time: <span className="text-white font-semibold">{data.estimatedTime}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={state === 'confirming'}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={state === 'confirming'}
            className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {state === 'confirming' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm & Send'
            )}
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 flex items-start gap-2 p-3 bg-glow-gold/10 border border-glow-gold/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-glow-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            Double-check all transaction details. Cryptocurrency transactions cannot be reversed once confirmed.
          </p>
        </div>
      </div>
    </div>
  );
};
