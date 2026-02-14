import { Share2, Facebook, Twitter, Linkedin, Mail, Link as LinkIcon, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ShareableMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string;
}

interface ShareAPIIntegrationProps {
  message?: ShareableMessage;
  onShare?: (platform: string, messageId: string) => Promise<void>;
  className?: string;
}

export const ShareAPIIntegration = ({
  message,
  onShare,
  className,
}: ShareAPIIntegrationProps) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareLink = message
    ? `${window.location.origin}/messages/${message.conversationId}#${message.id}`
    : '';

  const handleNativeShare = async () => {
    if (!message) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Message',
          text: message.content,
          url: shareLink,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handlePlatformShare = async (platform: string) => {
    if (!message) return;

    setSharing(true);
    try {
      if (onShare) {
        await onShare(platform, message.id);
      }

      // Open share URLs
      const encodedText = encodeURIComponent(message.content);
      const encodedUrl = encodeURIComponent(shareLink);

      const shareUrls: { [key: string]: string } = {
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        email: `mailto:?subject=Shared Message&body=${encodedText}%0A%0A${encodedUrl}`,
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      }
    } catch (error) {
      console.error('Platform share failed:', error);
    } finally {
      setSharing(false);
    }
  };

  if (!message) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="text-center py-12 text-slate-500">
          <Share2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No message selected to share</p>
        </div>
      </div>
    );
  }

  const sharePlatforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'text-[#1DA1F2]',
      bg: 'bg-[#1DA1F2]/10',
      hover: 'hover:bg-[#1DA1F2]/20',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-[#4267B2]',
      bg: 'bg-[#4267B2]/10',
      hover: 'hover:bg-[#4267B2]/20',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'text-[#0077B5]',
      bg: 'bg-[#0077B5]/10',
      hover: 'hover:bg-[#0077B5]/20',
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'text-glow-gold',
      bg: 'bg-glow-gold/10',
      hover: 'hover:bg-glow-gold/20',
    },
  ];

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-glow-blue/20 rounded-full flex items-center justify-center">
          <Share2 className="h-5 w-5 text-glow-blue" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Share Message</h3>
          <p className="text-sm text-slate-400">Share this message with others</p>
        </div>
      </div>

      {/* Message Preview */}
      <div className="p-4 bg-slate-800/30 rounded-lg mb-6">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {message.sender.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-glow-blue font-semibold">{message.sender}</p>
            <p className="text-xs text-slate-500">{message.timestamp.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-sm text-white line-clamp-3 mt-2">{message.content}</p>
      </div>

      {/* Native Share (if supported) */}
      {navigator.share && (
        <button
          onClick={handleNativeShare}
          className="w-full px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors mb-4 flex items-center justify-center gap-2"
        >
          <Share2 className="h-5 w-5" />
          Share via Device
        </button>
      )}

      {/* Share Platforms */}
      <div className="space-y-3 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Share on Platform
        </p>
        <div className="grid grid-cols-2 gap-3">
          {sharePlatforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <button
                key={platform.id}
                onClick={() => handlePlatformShare(platform.id)}
                disabled={sharing}
                className={cn(
                  'p-4 rounded-lg border border-slate-700 transition-colors flex items-center gap-3',
                  platform.bg,
                  platform.hover,
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Icon className={cn('h-5 w-5', platform.color)} />
                <span className="text-sm font-semibold text-white">{platform.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Copy Link */}
      <div className="pt-4 border-t border-slate-800">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Share Link
        </p>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-sm text-white font-mono truncate">{shareLink}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className={cn(
              'px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2',
              copied
                ? 'bg-glow-green text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            )}
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" />
                Copied!
              </>
            ) : (
              <>
                <LinkIcon className="h-5 w-5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
