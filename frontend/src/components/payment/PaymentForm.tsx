import { useState } from 'react';
import { Send, User, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentFormProps {
  onSubmit: (data: PaymentData) => void;
  maxAmount?: string;
  recipient?: string;
  className?: string;
}

export interface PaymentData {
  recipient: string;
  amount: string;
  memo?: string;
  fee: string;
}

export const PaymentForm = ({ onSubmit, maxAmount, recipient: initialRecipient, className }: PaymentFormProps) => {
  const [formData, setFormData] = useState<PaymentData>({
    recipient: initialRecipient || '',
    amount: '',
    memo: '',
    fee: '0.001',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentData, string>> = {};

    if (!formData.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!formData.recipient.startsWith('SP') && !formData.recipient.startsWith('SM')) {
      newErrors.recipient = 'Invalid Stacks address';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (maxAmount && parseFloat(formData.amount) > parseFloat(maxAmount)) {
      newErrors.amount = 'Insufficient balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const setMaxAmount = () => {
    if (maxAmount) {
      const fee = parseFloat(formData.fee);
      const max = Math.max(0, parseFloat(maxAmount) - fee);
      setFormData((prev) => ({ ...prev, amount: max.toString() }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Recipient */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Recipient Address
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            value={formData.recipient}
            onChange={(e) => setFormData((prev) => ({ ...prev, recipient: e.target.value }))}
            placeholder="SP..."
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2',
              errors.recipient ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-glow-blue'
            )}
          />
        </div>
        {errors.recipient && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.recipient}
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">Amount</label>
          {maxAmount && (
            <button
              type="button"
              onClick={setMaxAmount}
              className="text-xs text-glow-blue hover:underline"
            >
              Max: {maxAmount} STX
            </button>
          )}
        </div>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="number"
            step="0.000001"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            className={cn(
              'w-full pl-10 pr-16 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2',
              errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-glow-blue'
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
            STX
          </span>
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.amount}
          </p>
        )}
      </div>

      {/* Memo */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Memo (Optional)
        </label>
        <textarea
          value={formData.memo}
          onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-glow-blue resize-none"
        />
      </div>

      {/* Fee */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <span className="text-sm text-slate-400">Network Fee</span>
        <span className="text-sm font-semibold text-white">{formData.fee} STX</span>
      </div>

      {/* Total */}
      {formData.amount && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-glow-blue/10 to-glow-green/10 border border-glow-blue/30 rounded-lg">
          <span className="text-sm font-medium text-white">Total Amount</span>
          <span className="text-lg font-bold text-glow-blue">
            {(parseFloat(formData.amount) + parseFloat(formData.fee)).toFixed(6)} STX
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-glow-pink to-glow-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
      >
        <Send className="h-5 w-5" />
        Send Payment
      </button>
    </form>
  );
};
