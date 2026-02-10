import { useState, useEffect, useRef } from 'react';
import { Send, Users, Phone, Video, MoreVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system' | 'join' | 'leave';
}

export interface TypingIndicator {
  userId: string;
  username: string;
}

interface RealtimeChatProps {
  roomId: string;
  roomName: string;
  currentUserId: string;
  currentUsername: string;
  messages: ChatMessage[];
  participants: Array<{ id: string; username: string; online: boolean }>;
  typingUsers: TypingIndicator[];
  onSendMessage: (content: string) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
  className?: string;
}

export const RealtimeChat = ({
  roomId,
  roomName,
  currentUserId,
  currentUsername,
  messages,
  participants,
  typingUsers,
  onSendMessage,
  onTyping,
  onStopTyping,
  className,
}: RealtimeChatProps) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (value: string) => {
    setMessageText(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      onTyping();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onStopTyping();
      }
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setSending(true);
    try {
      await onSendMessage(messageText);
      setMessageText('');
      if (isTyping) {
        setIsTyping(false);
        onStopTyping();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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

  const onlineCount = participants.filter((p) => p.online).length;

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl flex flex-col h-[700px]', className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{roomName}</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-glow-green rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">
                  {onlineCount} online · {participants.length} members
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Phone className="h-5 w-5 text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Video className="h-5 w-5 text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <MoreVertical className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => {
              if (message.type === 'system' || message.type === 'join' || message.type === 'leave') {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="px-3 py-1 bg-slate-800/50 rounded-full">
                      <p className="text-xs text-slate-400">{message.content}</p>
                    </div>
                  </div>
                );
              }

              const isOwn = message.userId === currentUserId;

              return (
                <div key={message.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {message.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Message */}
                  <div className={cn('flex flex-col max-w-md', isOwn ? 'items-end' : 'items-start')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-semibold', isOwn ? 'text-glow-pink' : 'text-glow-blue')}>
                        {message.username}
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                    </div>
                    <div
                      className={cn(
                        'px-4 py-2 rounded-2xl',
                        isOwn
                          ? 'bg-glow-pink/20 text-white border border-glow-pink/30'
                          : 'bg-slate-800 text-white'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-400">
                  {typingUsers.map((u) => u.username).join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 focus-within:border-glow-pink transition-colors">
                <textarea
                  value={messageText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none"
                  style={{ maxHeight: '120px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sending}
                className="p-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Send className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Participants Sidebar */}
        <div className="w-64 border-l border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <h4 className="text-sm font-semibold text-white">
                Participants ({participants.length})
              </h4>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {participant.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900',
                      participant.online ? 'bg-glow-green' : 'bg-slate-600'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{participant.username}</p>
                  <p className="text-xs text-slate-500">{participant.online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
