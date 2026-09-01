import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Phone, Mail, ChevronRight, Camera, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hapticImpact, hapticNotify } from '@/lib/telegram';
import { playClick, playError, playSuccess } from '@/lib/sounds';
import { formatDate } from '@/lib/format';

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    hapticImpact('medium');
    await supabase
      .from('profiles')
      .update({ display_name: displayName, phone: phone || null, avatar_url: avatarUrl || null })
      .eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setEditing(false);
    playSuccess();
  };

  const handleSignOut = async () => {
    hapticImpact('medium');
    await signOut();
    navigate('/auth');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (upErr) {
      playError();
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);

    await supabase
      .from('profiles')
      .update({ avatar_url: pub.publicUrl })
      .eq('id', user.id);

    await refreshProfile();
    setUploading(false);
    playSuccess();
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold text-main mb-6">Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-soft" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-soft-lg">
              <span className="text-2xl font-bold text-white">
                {(profile?.display_name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full surface-card border surface-border flex items-center justify-center cursor-pointer hover:surface-2 transition shadow-soft">
            <Camera className="w-3.5 h-3.5 text-muted" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <h2 className="text-lg font-bold text-main mt-3">{profile?.display_name || 'User'}</h2>
        {profile?.username && <p className="text-sm text-muted">@{profile.username}</p>}
        {profile?.role && profile.role !== 'client' && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary-surface px-2 py-0.5 rounded-full mt-1.5">
            <Shield className="w-3 h-3" />
            {profile.role === 'creator' ? 'Creator' : 'Admin'}
          </span>
        )}
        <p className="text-sm text-faint mt-1">Member since {profile ? formatDate(profile.created_at) : '—'}</p>
      </div>

      {/* Info */}
      <div className="surface-card border surface-border rounded-2xl divide-y divide-transparent mb-6 overflow-hidden">
        {editing ? (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Full Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1..."
                className="w-full px-4 py-2.5 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold bg-primary-hover transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDisplayName(profile?.display_name ?? '');
                  setPhone(profile?.phone ?? '');
                  setAvatarUrl(profile?.avatar_url ?? '');
                }}
                className="px-4 py-2.5 rounded-xl border surface-border text-muted font-medium hover:surface-2 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <InfoRow icon={<UserIcon className="w-5 h-5" />} label="Full Name" value={profile?.display_name || '—'} />
            <InfoRow icon={<Mail className="w-5 h-5" />} label="Email" value={user?.email || '—'} />
            <InfoRow icon={<Phone className="w-5 h-5" />} label="Phone" value={profile?.phone || 'Not set'} />
            <button
              onClick={() => {
                setEditing(true);
                playClick();
              }}
              className="w-full flex items-center justify-between p-4 hover:surface-2 transition"
            >
              <span className="text-sm font-medium text-primary">Edit Profile</span>
              <ChevronRight className="w-5 h-5 text-faint" />
            </button>
          </>
        )}
      </div>

      {/* Settings Link */}
      <button
        onClick={() => {
          playClick();
          navigate('/settings');
        }}
        className="w-full flex items-center justify-between surface-card border surface-border rounded-2xl p-4 mb-3 hover:surface-2 transition"
      >
        <span className="text-sm font-medium text-main">Settings & Themes</span>
        <ChevronRight className="w-5 h-5 text-faint" />
      </button>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-primary-border text-primary font-semibold hover:bg-primary-surface transition active:scale-[0.98]"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 border-b surface-border">
      <div className="w-10 h-10 rounded-full surface-2 flex items-center justify-center text-muted shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-faint">{label}</p>
        <p className="text-sm font-medium text-main truncate">{value}</p>
      </div>
    </div>
  );
}
