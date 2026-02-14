import { Bell, BellOff, Volume2, VolumeX, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageNotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  emailDigest: boolean;
  mentionsOnly: boolean;
  mutedConversations: string[];
}

interface MessageNotificationSettingsProps {
  settings: MessageNotificationSettings;
  onUpdateSettings: (settings: Partial<MessageNotificationSettings>) => Promise<void>;
  className?: string;
}

export const MessageNotificationSettingsPanel = ({
  settings,
  onUpdateSettings,
  className,
}: MessageNotificationSettingsProps) => {
  const handleToggle = async (key: keyof MessageNotificationSettings, value: boolean) => {
    await onUpdateSettings({ [key]: value });
  };

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-glow-blue/20 rounded-full flex items-center justify-center">
          <Settings className="h-5 w-5 text-glow-blue" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Message Notifications</h3>
          <p className="text-sm text-slate-400">Customize your messaging alerts</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable Notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className={cn('h-5 w-5', settings.enabled ? 'text-glow-green' : 'text-slate-500')} />
            <div>
              <p className="text-sm font-semibold text-white">Enable Notifications</p>
              <p className="text-xs text-slate-400">Receive message notifications</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('enabled', !settings.enabled)}
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

        {/* Sound */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            {settings.sound ? (
              <Volume2 className="h-5 w-5 text-glow-blue" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">Sound</p>
              <p className="text-xs text-slate-400">Play sound for new messages</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('sound', !settings.sound)}
            disabled={!settings.enabled}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.sound && settings.enabled ? 'bg-glow-blue' : 'bg-slate-700',
              !settings.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                settings.sound ? 'translate-x-6' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {/* Desktop Notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className={cn('h-5 w-5', settings.desktop ? 'text-glow-pink' : 'text-slate-500')} />
            <div>
              <p className="text-sm font-semibold text-white">Desktop Notifications</p>
              <p className="text-xs text-slate-400">Show desktop popup alerts</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('desktop', !settings.desktop)}
            disabled={!settings.enabled}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.desktop && settings.enabled ? 'bg-glow-pink' : 'bg-slate-700',
              !settings.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                settings.desktop ? 'translate-x-6' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {/* Email Digest */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className={cn('h-5 w-5', settings.emailDigest ? 'text-glow-gold' : 'text-slate-500')} />
            <div>
              <p className="text-sm font-semibold text-white">Email Digest</p>
              <p className="text-xs text-slate-400">Receive daily email summaries</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('emailDigest', !settings.emailDigest)}
            disabled={!settings.enabled}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.emailDigest && settings.enabled ? 'bg-glow-gold' : 'bg-slate-700',
              !settings.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                settings.emailDigest ? 'translate-x-6' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {/* Mentions Only */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className={cn('h-5 w-5', settings.mentionsOnly ? 'text-purple-500' : 'text-slate-500')} />
            <div>
              <p className="text-sm font-semibold text-white">Mentions Only</p>
              <p className="text-xs text-slate-400">Only notify when mentioned</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('mentionsOnly', !settings.mentionsOnly)}
            disabled={!settings.enabled}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.mentionsOnly && settings.enabled ? 'bg-purple-500' : 'bg-slate-700',
              !settings.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                settings.mentionsOnly ? 'translate-x-6' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {/* Muted Conversations */}
        {settings.mutedConversations.length > 0 && (
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <BellOff className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-white">Muted Conversations</p>
            </div>
            <div className="space-y-2">
              {settings.mutedConversations.map((convId) => (
                <div key={convId} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                  <span className="text-xs text-slate-400 font-mono">{convId.slice(0, 16)}...</span>
                  <button className="text-xs text-glow-blue hover:underline">Unmute</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
