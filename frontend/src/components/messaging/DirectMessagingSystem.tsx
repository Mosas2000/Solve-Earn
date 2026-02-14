import { useState } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  delivered: boolean;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'link';
  url: string;
  name: string;
  size?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: DirectMessage;
  unreadCount: number;
  updatedAt: Date;
}

interface DirectMessagingSystemProps {
  currentUserId: string;
  conversations: Conversation[];
  messages: DirectMessage[];
  selectedConversationId?: string;
  onSendMessage: (conversationId: string, content: string, attachments?: MessageAttachment[]) => Promise<void>;
  onSelectConversation: (conversationId: string) => void;
  onMarkAsRead: (messageIds: string[]) => Promise<void>;
  className?: string;
}

export const DirectMessagingSystem = ({
  currentUserId,
  conversations,
  messages,
  selectedConversationId,
  onSendMessage,
  onSelectConversation,
  onMarkAsRead,
  className,
}: DirectMessagingSystemProps) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const conversationMessages = messages
    .filter((m) => m.conversationId === selectedConversationId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const getOtherParticipant = (conv: Conversation): string => {
    return conv.participants.find((p) => p !== currentUserId) || '';
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;

    setSending(true);
    try {
      await onSendMessage(selectedConversationId, messageText);
      setMessageText('');
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

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden flex', className)}>
      {/* Conversations List */}
      <div className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Messages</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500">
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherParticipant = getOtherParticipant(conv);
              const isSelected = conv.id === selectedConversationId;

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    'p-4 border-b border-slate-800 cursor-pointer transition-colors',
                    isSelected ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {otherParticipant.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-semibold text-sm truncate">
                          {otherParticipant.slice(0, 10)}...
                        </span>
                        {conv.lastMessage && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatTimestamp(conv.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-slate-400 truncate">{conv.lastMessage.content}</p>
                      )}
                      {conv.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-glow-pink rounded-full text-xs text-white font-semibold">
                            {conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p>Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getOtherParticipant(selectedConversation).slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">
                    {getOtherParticipant(selectedConversation).slice(0, 12)}...
                  </h4>
                  <p className="text-xs text-slate-400">Active</p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <MoreVertical className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                conversationMessages.map((message) => {
                  const isSent = message.senderId === currentUserId;

                  return (
                    <div key={message.id} className={cn('flex', isSent ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-md', isSent ? 'items-end' : 'items-start', 'flex flex-col')}>
                        <div
                          className={cn(
                            'px-4 py-2 rounded-2xl',
                            isSent
                              ? 'bg-glow-pink text-white rounded-br-sm'
                              : 'bg-slate-800 text-white rounded-bl-sm'
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-xs text-slate-500">{formatTimestamp(message.timestamp)}</span>
                          {isSent && (
                            <>
                              {message.read ? (
                                <CheckCheck className="h-3 w-3 text-glow-blue" />
                              ) : message.delivered ? (
                                <CheckCheck className="h-3 w-3 text-slate-500" />
                              ) : (
                                <Check className="h-3 w-3 text-slate-500" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-end gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Paperclip className="h-5 w-5 text-slate-400" />
                </button>

                <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 focus-within:border-glow-pink transition-colors">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                </div>

                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Smile className="h-5 w-5 text-slate-400" />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  className="p-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
