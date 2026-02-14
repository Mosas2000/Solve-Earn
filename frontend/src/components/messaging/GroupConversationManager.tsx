import { useState } from 'react';
import { Users, Plus, X, UserMinus, Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupMember {
  id: string;
  username: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  online: boolean;
}

export interface GroupConversation {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: Date;
  avatar?: string;
}

interface GroupConversationManagerProps {
  group?: GroupConversation;
  currentUserId: string;
  onCreateGroup?: (name: string, description: string, members: string[]) => Promise<void>;
  onAddMembers?: (groupId: string, memberIds: string[]) => Promise<void>;
  onRemoveMember?: (groupId: string, memberId: string) => Promise<void>;
  onChangeRole?: (groupId: string, memberId: string, role: GroupMember['role']) => Promise<void>;
  onLeaveGroup?: (groupId: string) => Promise<void>;
  className?: string;
}

export const GroupConversationManager = ({
  group,
  currentUserId,
  onCreateGroup,
  onAddMembers,
  onRemoveMember,
  onChangeRole,
  onLeaveGroup,
  className,
}: GroupConversationManagerProps) => {
  const [view, setView] = useState<'overview' | 'create' | 'addMembers'>('overview');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [loading, setLoading] = useState(false);

  const currentMember = group?.members.find((m) => m.id === currentUserId);
  const isAdmin = currentMember?.role === 'admin';
  const canModerate = isAdmin || currentMember?.role === 'moderator';

  const handleCreateGroup = async () => {
    if (!onCreateGroup) return;
    setLoading(true);
    try {
      await onCreateGroup(groupName, groupDescription, newMemberIds);
      setView('overview');
      setGroupName('');
      setGroupDescription('');
      setNewMemberIds([]);
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!group || !onAddMembers) return;
    setLoading(true);
    try {
      await onAddMembers(group.id, newMemberIds);
      setView('overview');
      setNewMemberIds([]);
    } catch (error) {
      console.error('Failed to add members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberId = () => {
    if (newMemberInput && !newMemberIds.includes(newMemberInput)) {
      setNewMemberIds([...newMemberIds, newMemberInput]);
      setNewMemberInput('');
    }
  };

  const roleIcons = {
    admin: Crown,
    moderator: Shield,
    member: Users,
  };

  const roleColors = {
    admin: 'text-glow-gold',
    moderator: 'text-glow-blue',
    member: 'text-slate-400',
  };

  if (view === 'create') {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <h3 className="text-xl font-bold text-white mb-6">Create Group Conversation</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Description (Optional)</label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Add Members</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
                placeholder="Enter user ID or address"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-glow-pink"
              />
              <button
                onClick={handleAddMemberId}
                disabled={!newMemberInput}
                className="px-4 py-3 bg-glow-blue hover:bg-glow-blue/90 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {newMemberIds.length > 0 && (
              <div className="space-y-2">
                {newMemberIds.map((id) => (
                  <div key={id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                    <span className="text-sm text-white font-mono">{id}</span>
                    <button
                      onClick={() => setNewMemberIds(newMemberIds.filter((i) => i !== id))}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setView('overview')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupName || newMemberIds.length === 0}
              className="flex-1 px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Group Selected</h3>
          <p className="text-slate-400 mb-6">Create or select a group conversation</p>
          {onCreateGroup && (
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors"
            >
              Create Group
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-glow-pink to-glow-blue rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-slate-400 mb-2">{group.description}</p>
            )}
            <p className="text-xs text-slate-500">
              {group.members.length} members · Created {group.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Members</h4>
          {canModerate && onAddMembers && (
            <button
              onClick={() => setView('addMembers')}
              className="text-xs text-glow-blue hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Members
            </button>
          )}
        </div>

        <div className="space-y-2">
          {group.members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            const roleColor = roleColors[member.role];

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {member.username.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900',
                        member.online ? 'bg-glow-green' : 'bg-slate-600'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-semibold">{member.username}</p>
                      <RoleIcon className={cn('h-3 w-3', roleColor)} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Joined {member.joinedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {canModerate && member.id !== currentUserId && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && member.role !== 'admin' && onChangeRole && (
                      <select
                        value={member.role}
                        onChange={(e) => onChangeRole(group.id, member.id, e.target.value as any)}
                        className="px-2 py-1 bg-slate-700 text-white text-xs rounded"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    )}
                    {onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(group.id, member.id)}
                        className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {onLeaveGroup && (
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={() => onLeaveGroup(group.id)}
            className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-semibold rounded-lg transition-colors"
          >
            Leave Group
          </button>
        </div>
      )}
    </div>
  );
};
