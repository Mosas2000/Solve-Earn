import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Paperclip, Send, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectMessage, MessageAttachment } from './DirectMessagingSystem';

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  messages: DirectMessage[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

interface MessageThreadViewProps {
  thread: MessageThread;
  currentUserId: string;
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<void>;
  onBack?: () => void;
  className?: string;
}

export const MessageThreadView = ({
  thread,
  currentUserId,
  onSendMessage,
  onBack,
  className,
}: MessageThreadViewProps) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [thread.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      await onSendMessage(messageText, attachments.length > 0 ? attachments : undefined);
      setMessageText('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const groupMessagesByDate = (): { date: string; messages: DirectMessage[] }[] => {
    const groups: { [key: string]: DirectMessage[] } = {};

    thread.messages.forEach((msg) => {
      const dateKey = msg.timestamp.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return Object.entries(groups).map(([date, messages]) => ({
      date: formatDate(new Date(date)),
      messages: messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    }));
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl flex flex-col h-[600px]', className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-white font-semibold">{thread.subject}</h3>
            <p className="text-xs text-slate-400">
              {thread.participants.length} participants
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex gap-1">
              {thread.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-glow-blue/10 text-glow-blue text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <MoreVertical className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messageGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6">
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-4">
              <div className="px-3 py-1 bg-slate-800 rounded-full">
                <span className="text-xs text-slate-400 font-medium">{group.date}</span>
              </div>
            </div>

            {/* Messages in Group */}
            <div className="space-y-4">
              {group.messages.map((message, msgIdx) => {
                const isSent = message.senderId === currentUserId;
                const showAvatar =
                  msgIdx === 0 ||
                  group.messages[msgIdx - 1].senderId !== message.senderId;

                return (
                  <div
                    key={message.id}
                    className={cn('flex gap-3', isSent ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar */}
                    {showAvatar ? (
                      <div className="w-8 h-8 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs">
                          {message.senderId.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8" />
                    )}

                    {/* Message Content */}
                    <div className={cn('flex flex-col max-w-md', isSent ? 'items-end' : 'items-start')}>
                      {showAvatar && !isSent && (
                        <span className="text-xs text-slate-400 mb-1 px-1">
                          {message.senderId.slice(0, 10)}...
                        </span>
                      )}

                      <div
                        className={cn(
                          'px-4 py-2 rounded-2xl',
                          isSent
                            ? 'bg-glow-pink text-white rounded-br-sm'
                            : 'bg-slate-800 text-white rounded-bl-sm'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 bg-black/20 rounded-lg"
                              >
                                {attachment.type === 'image' ? (
                                  <Image className="h-4 w-4" />
                                ) : (
                                  <File className="h-4 w-4" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs truncate">{attachment.name}</p>
                                  {attachment.size && (
                                    <p className="text-xs opacity-70">
                                      {(attachment.size / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 mt-1 px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm"
              >
                {attachment.type === 'image' ? (
                  <Image className="h-4 w-4 text-slate-400" />
                ) : (
                  <File className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-white">{attachment.name}</span>
                <button
                  onClick={() => setAttachments(attachments.filter((a) => a.id !== attachment.id))}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Paperclip className="h-5 w-5 text-slate-400" />
          </button>

          <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 focus-within:border-glow-pink transition-colors">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your reply..."
              rows={2}
              className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && attachments.length === 0) || sending}
            className="p-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
