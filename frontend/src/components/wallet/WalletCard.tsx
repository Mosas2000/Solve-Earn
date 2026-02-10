import { Wallet, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WalletCardProps {
  address: string;
  balance: string;
  isConnected: boolean;
  network?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export const WalletCard = ({
  address,
  balance,
  isConnected,
  network = 'Mainnet',
  onConnect,
  onDisconnect,
  className,
}: WalletCardProps) => {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-2xl p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-glow-pink to-glow-blue flex items-center justify-center">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Stacks Wallet</h3>
            <span className="text-sm text-slate-400">{network}</span>
          </div>
        </div>
        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold',
            isConnected
              ? 'bg-glow-green/20 text-glow-green border border-glow-green/30'
              : 'bg-slate-700 text-slate-400 border border-slate-600'
          )}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {isConnected ? (
        <>
          {/* Balance */}
          <div className="mb-6">
            <span className="text-sm text-slate-400">Balance</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-glow-gold to-glow-pink">
                {balance}
              </span>
              <span className="text-lg text-slate-400">STX</span>
            </div>
          </div>

          {/* Address */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Wallet Address</span>
                <span className="text-white font-mono text-sm">{truncateAddress(address)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-glow-green" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                <a
                  href={`https://explorer.stacks.co/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-3 bg-gradient-to-r from-glow-pink to-glow-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
              Send STX
            </button>
            <button
              onClick={onDisconnect}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Connect your wallet to get started</p>
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-gradient-to-r from-glow-pink to-glow-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
};

interface WalletSelectorProps {
  onSelectWallet: (walletType: 'hiro' | 'xverse' | 'leather') => void;
  className?: string;
}

export const WalletSelector = ({ onSelectWallet, className }: WalletSelectorProps) => {
  const wallets = [
    { type: 'hiro' as const, name: 'Hiro Wallet', description: 'Browser extension wallet' },
    { type: 'xverse' as const, name: 'Xverse', description: 'Mobile & desktop wallet' },
    { type: 'leather' as const, name: 'Leather Wallet', description: 'Bitcoin & Stacks wallet' },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Select Wallet</h3>
      {wallets.map((wallet) => (
        <button
          key={wallet.type}
          onClick={() => onSelectWallet(wallet.type)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-glow-blue hover:bg-slate-800/50 transition-all"
        >
          <div className="text-left">
            <div className="text-white font-semibold">{wallet.name}</div>
            <div className="text-sm text-slate-400">{wallet.description}</div>
          </div>
          <ExternalLink className="h-5 w-5 text-slate-400" />
        </button>
      ))}
    </div>
  );
};
