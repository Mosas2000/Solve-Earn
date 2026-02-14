import { CheckCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReadReceipt {
  userId: string;
  username: string;
  readAt: Date;
}

export interface MessageWithReceipts {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  delivered: boolean;
  readBy: ReadReceipt[];
}

interface ReadReceiptsDisplayProps {
  message: MessageWithReceipts;
  totalRecipients: number;
  currentUserId: string;
  className?: string;
}

export const ReadReceiptsDisplay = ({
  message,
  totalRecipients,
  currentUserId,
  className,
}: ReadReceiptsDisplayProps) => {
  const isSent = message.senderId === currentUserId;
  if (!isSent) return null;

  const readCount = message.readBy.length;
  const allRead = readCount === totalRecipients;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {allRead ? (
        <CheckCheck className="h-3 w-3 text-glow-blue" />
      ) : message.delivered ? (
        <CheckCheck className="h-3 w-3 text-slate-500" />
      ) : (
        <Check className="h-3 w-3 text-slate-500" />
      )}
      <span className="text-xs text-slate-500">
        {allRead ? 'Read by all' : readCount > 0 ? `Read by ${readCount}` : message.delivered ? 'Delivered' : 'Sent'}
      </span>
    </div>
  );
};

interface ReadReceiptsTooltipProps {
  receipts: ReadReceipt[];
  className?: string;
}

export const ReadReceiptsTooltip = ({ receipts, className }: ReadReceiptsTooltipProps) => {
  return (
    <div className={cn('bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl', className)}>
      <p className="text-xs font-semibold text-white mb-2">Read by</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {receipts.map((receipt) => (
          <div key={receipt.userId} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {receipt.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-white">{receipt.username}</span>
            </div>
            <span className="text-xs text-slate-400">
              {receipt.readAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
