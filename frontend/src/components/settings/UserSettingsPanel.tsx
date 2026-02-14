import { useState } from 'react';
import { User, Mail, MapPin, Calendar, Briefcase, Globe, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserProfile {
  username: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  company: string;
  dateOfBirth?: Date;
  publicEmail: boolean;
}

interface UserSettingsPanelProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
  className?: string;
}

export const UserSettingsPanel = ({
  profile: initialProfile,
  onSave,
  className,
}: UserSettingsPanelProps) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UserProfile, string>>>({});

  const validateProfile = (): boolean => {
    const newErrors: Partial<Record<keyof UserProfile, string>> = {};

    if (!profile.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (profile.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (profile.website && !/^https?:\/\/.+/.test(profile.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;

    setSaving(true);
    setSaved(false);
    try {
      await onSave(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-glow-blue/20 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-glow-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
            <p className="text-sm text-slate-400">Manage your public profile information</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
            <User className="h-3 w-3" />
            Username *
          </label>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className={cn(
              'w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none',
              errors.username ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-glow-pink'
            )}
          />
          {errors.username && (
            <p className="text-xs text-red-500 mt-1">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
            <Mail className="h-3 w-3" />
            Email Address *
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className={cn(
              'w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none',
              errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-glow-pink'
            )}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="public-email"
              checked={profile.publicEmail}
              onChange={(e) => setProfile({ ...profile, publicEmail: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700"
            />
            <label htmlFor="public-email" className="text-xs text-slate-400">
              Show email publicly on profile
            </label>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            {profile.bio.length}/500 characters
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            Location
          </label>
          <input
            type="text"
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            placeholder="City, Country"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Company */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
              <Briefcase className="h-3 w-3" />
              Company
            </label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              placeholder="Your company"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
            />
          </div>

          {/* Website */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
              <Globe className="h-3 w-3" />
              Website
            </label>
            <input
              type="url"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              placeholder="https://example.com"
              className={cn(
                'w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none',
                errors.website ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-glow-pink'
              )}
            />
            {errors.website && (
              <p className="text-xs text-red-500 mt-1">{errors.website}</p>
            )}
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Date of Birth
          </label>
          <input
            type="date"
            value={profile.dateOfBirth?.toISOString().split('T')[0] || ''}
            onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value ? new Date(e.target.value) : undefined })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
          />
          <p className="text-xs text-slate-500 mt-1">
            This will not be displayed publicly
          </p>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            Your profile information will be visible to other users. Only share information you're comfortable making public.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            'w-full px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2',
            saved
              ? 'bg-glow-green text-white'
              : 'bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 text-white'
          )}
        >
          {saved ? (
            <>
              <Save className="h-5 w-5" />
              Saved Successfully
            </>
          ) : saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};
