import { useState } from 'react';
import { FileText, Download, Send, DollarSign, Calendar, Building, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  from: string;
  to: string;
  amount: string;
  description: string;
  items: InvoiceItem[];
  dueDate: Date;
  createdAt: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentAddress: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: string;
  amount: string;
}

interface InvoiceSystemProps {
  invoices?: Invoice[];
  currentAddress: string;
  onCreateInvoice?: (data: CreateInvoiceData) => Promise<Invoice>;
  onSendInvoice?: (invoiceId: string) => Promise<void>;
  onDownloadInvoice?: (invoice: Invoice) => void;
  className?: string;
}

export interface CreateInvoiceData {
  to: string;
  items: Omit<InvoiceItem, 'id' | 'amount'>[];
  dueDate: Date;
  notes?: string;
}

const statusConfig = {
  draft: { color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Draft' },
  sent: { color: 'text-glow-blue', bg: 'bg-glow-blue/10', label: 'Sent' },
  paid: { color: 'text-glow-green', bg: 'bg-glow-green/10', label: 'Paid' },
  overdue: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Overdue' },
  cancelled: { color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Cancelled' },
};

export const InvoiceSystem = ({
  invoices = [],
  currentAddress,
  onCreateInvoice,
  onSendInvoice,
  onDownloadInvoice,
  className,
}: InvoiceSystemProps) => {
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [createData, setCreateData] = useState<CreateInvoiceData>({
    to: '',
    items: [{ description: '', quantity: 1, rate: '' }],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const calculateItemAmount = (quantity: number, rate: string): string => {
    const rateNum = parseFloat(rate) || 0;
    return (quantity * rateNum).toFixed(2);
  };

  const calculateTotal = (): string => {
    return createData.items
      .reduce((sum, item) => {
        const amount = parseFloat(calculateItemAmount(item.quantity, item.rate));
        return sum + amount;
      }, 0)
      .toFixed(2);
  };

  const handleAddItem = () => {
    setCreateData({
      ...createData,
      items: [...createData.items, { description: '', quantity: 1, rate: '' }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (createData.items.length > 1) {
      setCreateData({
        ...createData,
        items: createData.items.filter((_, i) => i !== index),
      });
    }
  };

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id' | 'amount'>, value: any) => {
    const newItems = [...createData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setCreateData({ ...createData, items: newItems });
  };

  const handleCreateInvoice = async () => {
    if (!onCreateInvoice) return;
    setLoading(true);
    try {
      const invoice = await onCreateInvoice(createData);
      setView('list');
      setCreateData({
        to: '',
        items: [{ description: '', quantity: 1, rate: '' }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    if (!onSendInvoice) return;
    setLoading(true);
    try {
      await onSendInvoice(invoiceId);
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'create') {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Create Invoice</h3>

        <div className="space-y-6">
          {/* Client Info */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Client Address</label>
            <input
              type="text"
              value={createData.to}
              onChange={(e) => setCreateData({ ...createData, to: e.target.value })}
              placeholder="SP..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          {/* Invoice Items */}
          <div>
            <label className="text-sm text-slate-400 mb-3 block">Invoice Items</label>
            <div className="space-y-3">
              {createData.items.map((item, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-glow-pink"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Rate (STX)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Amount</label>
                      <div className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white">
                        {calculateItemAmount(item.quantity, item.rate)} STX
                      </div>
                    </div>
                  </div>
                  {createData.items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Remove Item
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddItem}
              className="mt-3 text-sm text-glow-blue hover:text-glow-blue/80"
            >
              + Add Item
            </button>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Due Date</label>
            <input
              type="date"
              value={createData.dueDate.toISOString().split('T')[0]}
              onChange={(e) => setCreateData({ ...createData, dueDate: new Date(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Notes (Optional)</label>
            <textarea
              value={createData.notes}
              onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
              placeholder="Additional notes or payment instructions..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          {/* Total */}
          <div className="bg-glow-pink/10 border border-glow-pink/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">Total Amount</span>
              <span className="text-2xl font-bold text-white">{calculateTotal()} STX</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('list')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={loading || !createData.to || createData.items.some(item => !item.description || !item.rate)}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'view' && selectedInvoice) {
    const statusCfg = statusConfig[selectedInvoice.status];
    const total = selectedInvoice.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2);

    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Invoice #{selectedInvoice.invoiceNumber}</h3>
          <button
            onClick={() => setView('list')}
            className="text-sm text-glow-blue hover:underline"
          >
            Back to List
          </button>
        </div>

        <div className="space-y-6">
          {/* Status & Info */}
          <div className="flex items-center justify-between">
            <div className={cn('px-3 py-1 rounded-full text-sm font-medium', statusCfg.bg, statusCfg.color)}>
              {statusCfg.label}
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>Created: {selectedInvoice.createdAt.toLocaleDateString()}</p>
              <p>Due: {selectedInvoice.dueDate.toLocaleDateString()}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">From</p>
              <p className="text-sm text-white font-mono break-all">{selectedInvoice.from}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">To</p>
              <p className="text-sm text-white font-mono break-all">{selectedInvoice.to}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Items</h4>
            <div className="space-y-2">
              {selectedInvoice.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × {item.rate} STX
                    </p>
                  </div>
                  <span className="text-white font-semibold">{item.amount} STX</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {selectedInvoice.notes && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-white">{selectedInvoice.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="bg-glow-pink/10 border border-glow-pink/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-lg">Total</span>
              <span className="text-3xl font-bold text-white">{total} STX</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            {onDownloadInvoice && (
              <button
                onClick={() => onDownloadInvoice(selectedInvoice)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
            {selectedInvoice.status === 'draft' && onSendInvoice && (
              <button
                onClick={() => handleSendInvoice(selectedInvoice.id)}
                disabled={loading}
                className="px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : 'Send Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Invoices</h3>
          {onCreateInvoice && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-glow-pink hover:bg-glow-pink/90 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Create Invoice
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No invoices yet</p>
          </div>
        ) : (
          invoices.map((invoice) => {
            const statusCfg = statusConfig[invoice.status];
            const total = invoice.items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2);

            return (
              <div
                key={invoice.id}
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setView('view');
                }}
                className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-semibold">Invoice #{invoice.invoiceNumber}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      To: {invoice.to.slice(0, 10)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{total} STX</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Due: {invoice.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className={cn('inline-flex px-2 py-1 rounded text-xs font-medium', statusCfg.bg, statusCfg.color)}>
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
