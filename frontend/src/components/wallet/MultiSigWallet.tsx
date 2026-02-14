import { useState } from 'react';
import { Users, Plus, Check, X, Shield, AlertCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSigWallet {
  id: string;
  name: string;
  address: string;
  owners: string[];
  requiredSignatures: number;
  balance: string;
  pendingTransactions: PendingTransaction[];
}

export interface PendingTransaction {
  id: string;
  to: string;
  amount: string;
  memo?: string;
  createdAt: Date;
  createdBy: string;
  signatures: string[];
  executed: boolean;
}

interface MultiSigWalletProps {
  wallet?: MultiSigWallet;
  currentAddress: string;
  onCreateWallet?: (data: CreateWalletData) => Promise<void>;
  onProposeTransaction?: (tx: ProposeTransactionData) => Promise<void>;
  onSignTransaction?: (txId: string) => Promise<void>;
  onExecuteTransaction?: (txId: string) => Promise<void>;
  className?: string;
}

export interface CreateWalletData {
  name: string;
  owners: string[];
  requiredSignatures: number;
}

export interface ProposeTransactionData {
  to: string;
  amount: string;
  memo?: string;
}

export const MultiSigWallet = ({
  wallet,
  currentAddress,
  onCreateWallet,
  onProposeTransaction,
  onSignTransaction,
  onExecuteTransaction,
  className,
}: MultiSigWalletProps) => {
  const [view, setView] = useState<'overview' | 'create' | 'propose'>('overview');
  const [createData, setCreateData] = useState<CreateWalletData>({
    name: '',
    owners: [currentAddress],
    requiredSignatures: 1,
  });
  const [proposeData, setProposeData] = useState<ProposeTransactionData>({
    to: '',
    amount: '',
    memo: '',
  });
  const [newOwner, setNewOwner] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAddOwner = () => {
    if (newOwner && !createData.owners.includes(newOwner)) {
      setCreateData({
        ...createData,
        owners: [...createData.owners, newOwner],
      });
      setNewOwner('');
    }
  };

  const handleRemoveOwner = (owner: string) => {
    if (createData.owners.length > 1) {
      setCreateData({
        ...createData,
        owners: createData.owners.filter((o) => o !== owner),
      });
    }
  };

  const handleCreateWallet = async () => {
    if (!onCreateWallet) return;
    setLoading(true);
    try {
      await onCreateWallet(createData);
      setView('overview');
      setCreateData({ name: '', owners: [currentAddress], requiredSignatures: 1 });
    } catch (error) {
      console.error('Failed to create wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProposeTransaction = async () => {
    if (!onProposeTransaction) return;
    setLoading(true);
    try {
      await onProposeTransaction(proposeData);
      setView('overview');
      setProposeData({ to: '', amount: '', memo: '' });
    } catch (error) {
      console.error('Failed to propose transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (txId: string) => {
    if (!onSignTransaction) return;
    setLoading(true);
    try {
      await onSignTransaction(txId);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (txId: string) => {
    if (!onExecuteTransaction) return;
    setLoading(true);
    try {
      await onExecuteTransaction(txId);
    } catch (error) {
      console.error('Failed to execute transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === 'create') {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Create Multi-Signature Wallet</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Wallet Name</label>
            <input
              type="text"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="My Multi-Sig Wallet"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Wallet Owners</label>
            <div className="space-y-2 mb-3">
              {createData.owners.map((owner, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                  <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-white font-mono flex-1 truncate">{owner}</span>
                  {createData.owners.length > 1 && (
                    <button
                      onClick={() => handleRemoveOwner(owner)}
                      className="p-1 hover:bg-slate-700 rounded text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="SP... owner address"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
              />
              <button
                onClick={handleAddOwner}
                disabled={!newOwner}
                className="px-4 py-3 bg-glow-blue hover:bg-glow-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              Required Signatures ({createData.requiredSignatures} of {createData.owners.length})
            </label>
            <input
              type="range"
              min="1"
              max={createData.owners.length}
              value={createData.requiredSignatures}
              onChange={(e) => setCreateData({ ...createData, requiredSignatures: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1</span>
              <span>{createData.owners.length}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
            <Shield className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Multi-signature wallets require multiple approvals for transactions, providing enhanced security.
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
              onClick={handleCreateWallet}
              disabled={loading || !createData.name || createData.owners.length === 0}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'propose' && wallet) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Propose Transaction</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Recipient Address</label>
            <input
              type="text"
              value={proposeData.to}
              onChange={(e) => setProposeData({ ...proposeData, to: e.target.value })}
              placeholder="SP..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Amount (STX)</label>
            <input
              type="number"
              value={proposeData.amount}
              onChange={(e) => setProposeData({ ...proposeData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
            <p className="text-xs text-slate-500 mt-1">Available: {wallet.balance} STX</p>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Memo (Optional)</label>
            <textarea
              value={proposeData.memo}
              onChange={(e) => setProposeData({ ...proposeData, memo: e.target.value })}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-glow-gold/10 border border-glow-gold/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-glow-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              This transaction will require {wallet.requiredSignatures} signature(s) before execution.
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
              onClick={handleProposeTransaction}
              disabled={loading || !proposeData.to || !proposeData.amount}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Proposing...' : 'Propose Transaction'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Multi-Sig Wallet</h3>
          <p className="text-slate-400 mb-6">Create a multi-signature wallet for enhanced security</p>
          {onCreateWallet && (
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
            >
              Create Multi-Sig Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  const isOwner = wallet.owners.includes(currentAddress);

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{wallet.name}</h3>
          <button
            onClick={() => copyAddress(wallet.address)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Copy className={cn('h-4 w-4', copied ? 'text-glow-green' : 'text-slate-400')} />
          </button>
        </div>

        <p className="text-sm text-slate-400 font-mono mb-4">{wallet.address}</p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-white">{wallet.owners.length} Owners</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-white">{wallet.requiredSignatures} Required</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Balance */}
        <div className="text-center py-6 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">Wallet Balance</p>
          <p className="text-3xl font-bold text-white">{wallet.balance} STX</p>
        </div>

        {/* Pending Transactions */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Pending Transactions</h4>
          {wallet.pendingTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No pending transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallet.pendingTransactions.map((tx) => {
                const hasSigned = tx.signatures.includes(currentAddress);
                const canExecute = tx.signatures.length >= wallet.requiredSignatures && !tx.executed;

                return (
                  <div key={tx.id} className="p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold">{tx.amount} STX</p>
                        <p className="text-xs text-slate-400 font-mono">To: {tx.to.slice(0, 10)}...</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">
                          {tx.signatures.length} / {wallet.requiredSignatures} signatures
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {tx.memo && <p className="text-sm text-slate-400 mb-3">{tx.memo}</p>}

                    <div className="flex gap-2">
                      {isOwner && !hasSigned && !tx.executed && (
                        <button
                          onClick={() => handleSign(tx.id)}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-glow-blue hover:bg-glow-blue/90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Sign
                        </button>
                      )}
                      {canExecute && (
                        <button
                          onClick={() => handleExecute(tx.id)}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-glow-green hover:bg-glow-green/90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Execute
                        </button>
                      )}
                      {hasSigned && (
                        <div className="flex-1 px-3 py-2 bg-glow-green/10 text-glow-green text-sm font-semibold rounded-lg flex items-center justify-center gap-1">
                          <Check className="h-4 w-4" />
                          Signed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {isOwner && (
          <button
            onClick={() => setView('propose')}
            className="w-full px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
          >
            Propose Transaction
          </button>
        )}
      </div>
    </div>
  );
};
