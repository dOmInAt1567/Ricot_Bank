import { useEffect, useState } from 'react';
import { Shield, ScrollText, Users, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { hapticImpact } from '@/lib/telegram';
import { playClick } from '@/lib/sounds';
import type { Profile, AdminLog } from '@/lib/supabase';

export default function AdminPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'logs' | 'users'>('logs');

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
      setLogs((l as AdminLog[]) ?? []);

      const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers((u as Profile[]) ?? []);

      setLoading(false);
    })();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    hapticImpact('medium');
    await supabase.rpc('set_user_role', { p_target_user_id: userId, p_role: role });
    const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((u as Profile[]) ?? []);
    playClick();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-main">Admin Panel</h1>
        <span className="text-xs font-medium text-primary bg-primary-surface px-2 py-0.5 rounded-full">
          {profile?.role}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab('logs'); playClick(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'logs' ? 'bg-primary text-white' : 'surface-card surface-border text-muted'}`}
        >
          <ScrollText className="w-4 h-4" />
          Logs
        </button>
        <button
          onClick={() => { setTab('users'); playClick(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'users' ? 'bg-primary text-white' : 'surface-card surface-border text-muted'}`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-faint text-center py-12">No admin actions logged yet</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="surface-card border surface-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full surface-2 flex items-center justify-center text-muted shrink-0">
                  <ScrollText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-main">{log.action}</p>
                  <p className="text-xs text-faint">{formatDate(log.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
            />
          </div>

          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.id} className="surface-card border surface-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                  {u.display_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-main truncate">{u.display_name}</p>
                  <p className="text-xs text-faint">@{u.username || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    u.role === 'creator' ? 'bg-primary-surface text-primary' :
                    u.role === 'admin' ? 'bg-primary-surface text-primary' :
                    'surface-2 text-muted'
                  }`}>
                    {u.role}
                  </span>
                  {profile?.role === 'creator' && u.role !== 'creator' && (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border surface-border surface-card text-main rounded-lg px-2 py-1 input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    >
                      <option value="client">client</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                  {profile?.role === 'creator' && u.role === 'admin' && (
                    <button
                      onClick={() => handleRoleChange(u.id, 'creator')}
                      className="text-xs px-2 py-1 rounded-lg border border-primary-border text-primary hover:bg-primary-surface transition"
                    >
                      Make Creator
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
