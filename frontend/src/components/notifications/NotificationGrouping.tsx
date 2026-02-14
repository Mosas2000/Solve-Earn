import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface NotificationGroup {
  id: string;
  type: 'bounty_updates' | 'messages' | 'achievements' | 'system';
  title: string;
  count: number;
  items: Array<{
    id: string;
    message: string;
    timestamp: Date;
  }>;
  icon?: React.ReactNode;
}

interface NotificationGroupingProps {
  groups: NotificationGroup[];
  onDismissGroup: (groupId: string) => void;
  onExpandGroup: (groupId: string) => void;
  className?: string;
}

const groupTypeConfig = {
  bounty_updates: {
    color: 'text-glow-blue',
    bgColor: 'bg-glow-blue/10',
    borderColor: 'border-glow-blue/30',
  },
  messages: {
    color: 'text-glow-green',
    bgColor: 'bg-glow-green/10',
    borderColor: 'border-glow-green/30',
  },
  achievements: {
    color: 'text-glow-gold',
    bgColor: 'bg-glow-gold/10',
    borderColor: 'border-glow-gold/30',
  },
  system: {
    color: 'text-glow-pink',
    bgColor: 'bg-glow-pink/10',
    borderColor: 'border-glow-pink/30',
  },
};

export const NotificationGrouping = ({
  groups,
  onDismissGroup,
  onExpandGroup,
  className,
}: NotificationGroupingProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
        onExpandGroup(groupId);
      }
      return next;
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <AnimatePresence>
        {groups.map((group) => {
          const config = groupTypeConfig[group.type];
          const isExpanded = expandedGroups.has(group.id);

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
              className={cn(
                'bg-slate-900/50 backdrop-blur-sm border rounded-lg overflow-hidden',
                config.borderColor
              )}
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors',
                  config.bgColor
                )}
              >
                <div className="flex items-center gap-3">
                  {group.icon || <Bell className={cn('h-5 w-5', config.color)} />}
                  <div className="text-left">
                    <h4 className={cn('font-semibold text-sm', config.color)}>{group.title}</h4>
                    <p className="text-xs text-slate-500">
                      {group.count} {group.count === 1 ? 'notification' : 'notifications'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-bold',
                      config.bgColor,
                      config.color
                    )}
                  >
                    {group.count}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissGroup(group.id);
                    }}
                    className="text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </button>

              {/* Expanded Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800"
                  >
                    <div className="divide-y divide-slate-800">
                      {group.items.map((item) => (
                        <div key={item.id} className="p-3 hover:bg-slate-800/30 transition-colors">
                          <p className="text-sm text-slate-300 mb-1">{item.message}</p>
                          <span className="text-xs text-slate-500">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {groups.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No notification groups</p>
        </div>
      )}
    </div>
  );
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Hook for grouping notifications
export const useNotificationGrouping = (notifications: any[]) => {
  const [groups, setGroups] = useState<NotificationGroup[]>([]);

  useEffect(() => {
    // Group notifications by type
    const groupMap = new Map<string, NotificationGroup>();

    notifications.forEach((notif) => {
      const typeKey = notif.type || 'system';
      
      if (!groupMap.has(typeKey)) {
        groupMap.set(typeKey, {
          id: `group-${typeKey}`,
          type: typeKey as NotificationGroup['type'],
          title: getTitleForType(typeKey),
          count: 0,
          items: [],
        });
      }

      const group = groupMap.get(typeKey)!;
      group.count++;
      group.items.push({
        id: notif.id,
        message: notif.message || notif.title,
        timestamp: notif.timestamp,
      });
    });

    setGroups(Array.from(groupMap.values()));
  }, [notifications]);

  return groups;
};

const getTitleForType = (type: string): string => {
  const titles: Record<string, string> = {
    bounty_updates: 'Bounty Updates',
    messages: 'Messages',
    achievements: 'Achievements',
    system: 'System Notifications',
  };
  return titles[type] || 'Other';
};
