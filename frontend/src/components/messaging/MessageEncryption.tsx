import { Lock, Shield, Key, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'AES-256' | 'RSA-2048';
  keyRotationDays: number;
}

interface MessageEncryptionPanelProps {
  settings: EncryptionSettings;
  onUpdateSettings: (settings: Partial<EncryptionSettings>) => Promise<void>;
  onGenerateNewKey: () => Promise<void>;
  className?: string;
}

export const MessageEncryptionPanel = ({
  settings,
  onUpdateSettings,
  onGenerateNewKey,
  className,
}: MessageEncryptionPanelProps) => {
  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-glow-green/20 rounded-full flex items-center justify-center">
          <Lock className="h-5 w-5 text-glow-green" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Message Encryption</h3>
          <p className="text-sm text-slate-400">End-to-end encryption for your messages</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable Encryption */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className={cn('h-5 w-5', settings.enabled ? 'text-glow-green' : 'text-slate-500')} />
            <div>
              <p className="text-sm font-semibold text-white">Enable Encryption</p>
              <p className="text-xs text-slate-400">Encrypt all your messages</p>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.enabled ? 'bg-glow-green' : 'bg-slate-700'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* Algorithm Selection */}
            <div className="p-4 bg-slate-800/30 rounded-lg">
              <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
                <Key className="h-4 w-4 text-glow-blue" />
                Encryption Algorithm
              </label>
              <select
                value={settings.algorithm}
                onChange={(e) => onUpdateSettings({ algorithm: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
              >
                <option value="AES-256">AES-256 (Recommended)</option>
                <option value="RSA-2048">RSA-2048</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {settings.algorithm === 'AES-256'
                  ? 'Fast and secure symmetric encryption'
                  : 'Asymmetric encryption with public/private keys'}
              </p>
            </div>

            {/* Key Rotation */}
            <div className="p-4 bg-slate-800/30 rounded-lg">
              <label className="text-sm font-semibold text-white mb-3 block">
                Key Rotation Period
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="7"
                  max="365"
                  step="7"
                  value={settings.keyRotationDays}
                  onChange={(e) => onUpdateSettings({ keyRotationDays: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-white font-semibold min-w-[60px] text-right">
                  {settings.keyRotationDays} days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Encryption keys will automatically rotate every {settings.keyRotationDays} days for enhanced security
              </p>
            </div>

            {/* Generate New Key */}
            <button
              onClick={onGenerateNewKey}
              className="w-full px-4 py-3 bg-glow-blue hover:bg-glow-blue/90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Key className="h-4 w-4" />
              Generate New Encryption Key
            </button>

            {/* Security Info */}
            <div className="flex items-start gap-2 p-3 bg-glow-green/10 border border-glow-green/30 rounded-lg">
              <Lock className="h-4 w-4 text-glow-green flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-white mb-1">Your messages are secure</p>
                <p>
                  All messages are encrypted end-to-end. Only you and the recipient can read them. Not even we can access your encrypted messages.
                </p>
              </div>
            </div>
          </>
        )}

        {!settings.enabled && (
          <div className="flex items-start gap-2 p-3 bg-glow-gold/10 border border-glow-gold/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-glow-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Encryption is currently disabled. Your messages are sent without encryption. Enable encryption for maximum privacy and security.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
