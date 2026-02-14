import { Bell, Check, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from './NotificationCenter';

interface NotificationFilters {
  types: NotificationType[];
  read: boolean | 'all';
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  className?: string;
}

const typeLabels: Record<NotificationType, string> = {
  success: 'Success',
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
};

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onDeleteAll,
  className,
}: NotificationListProps) => {
  const [filters, setFilters] = useState<NotificationFilters>({
    types: [],
    read: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters
  const filteredNotifications = notifications.filter((notif) => {
    if (filters.types.length > 0 && !filters.types.includes(notif.type)) {
      return false;
    }
    if (filters.read !== 'all' && notif.read !== filters.read) {
      return false;
    }
    return true;
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const toggleTypeFilter = (type: NotificationType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800', className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-glow-blue" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-glow-blue/10 hover:bg-glow-blue/20 text-glow-blue rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onDeleteAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            {/* Type Filters */}
            <div>
              <span className="text-xs text-slate-400 mb-2 block">Filter by type:</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(typeLabels) as NotificationType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      filters.types.includes(type)
                        ? 'bg-glow-blue/20 text-glow-blue border-glow-blue/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    )}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Read/Unread Filter */}
            <div>
              <span className="text-xs text-slate-400 mb-2 block">Filter by status:</span>
              <div className="flex gap-2">
                {(['all', true, false] as const).map((status) => (
                  <button
                    key={String(status)}
                    onClick={() => setFilters((prev) => ({ ...prev, read: status }))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      filters.read === status
                        ? 'bg-glow-blue/20 text-glow-blue border-glow-blue/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    )}
                  >
                    {status === 'all' ? 'All' : status ? 'Read' : 'Unread'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications to display</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const typeConfig = {
    success: 'text-glow-green',
    info: 'text-glow-blue',
    warning: 'text-glow-gold',
    error: 'text-red-500',
  };

  return (
    <div
      className={cn(
        'p-4 hover:bg-slate-800/50 transition-colors relative',
        !notification.read && 'bg-slate-800/30'
      )}
    >
      {!notification.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-glow-blue rounded-full" />
      )}

      <div className={cn('space-y-2', !notification.read && 'pl-3')}>
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('font-semibold text-sm', typeConfig[notification.type])}>
            {notification.title}
          </h4>
          <div className="flex items-center gap-1">
            {!notification.read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="text-slate-500 hover:text-glow-blue transition-colors p-1"
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="text-slate-500 hover:text-red-500 transition-colors p-1"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400">{notification.message}</p>
        <span className="text-xs text-slate-500">
          {new Date(notification.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
