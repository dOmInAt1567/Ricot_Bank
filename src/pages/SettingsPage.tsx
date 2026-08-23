import { Sun, Moon, Star, Volume2, Eye, EyeOff } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hapticImpact } from '@/lib/telegram';
import { playClick } from '@/lib/sounds';
import { useState } from 'react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('ricot-sounds') !== 'off');

  const themes: { key: Theme; label: string; icon: typeof Sun; preview: string }[] = [
    { key: 'light', label: 'Light', icon: Sun, preview: '#ffffff' },
    { key: 'dark', label: 'Dark', icon: Moon, preview: '#1e293b' },
    { key: 'midnight', label: 'Midnight', icon: Star, preview: '#000000' },
  ];

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    playClick();
    hapticImpact('light');
  };

  const toggleSounds = () => {
    const newVal = !soundsEnabled;
    setSoundsEnabled(newVal);
    localStorage.setItem('ricot-sounds', newVal ? 'on' : 'off');
    if (newVal) playClick();
  };

  const togglePasswordVisible = async () => {
    if (!user) return;
    hapticImpact('medium');
    await supabase
      .from('profiles')
      .update({ password_visible: !profile?.password_visible })
      .eq('id', user.id);
    await refreshProfile();
    playClick();
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold text-main mb-6">Settings</h1>

      {/* Theme */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Theme</h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleThemeChange(t.key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition ${
                  active ? 'border-primary ring-2 ring-red-500/20' : 'surface-border surface-card'
                }`}
                style={active ? { outline: '2px solid var(--primary)', outlineOffset: '2px' } : {}}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: t.preview }}>
                  <Icon className="w-6 h-6" style={{ color: t.key === 'light' ? '#dc2626' : '#fff' }} />
                </div>
                <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Preferences</h2>
        <div className="surface-card border surface-border rounded-2xl overflow-hidden">
          <button
            onClick={toggleSounds}
            className="w-full flex items-center justify-between p-4 border-b surface-border hover:surface-2 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full surface-2 flex items-center justify-center text-muted">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-main">Sound Effects</p>
                <p className="text-xs text-faint">Notifications and transfer sounds</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition ${soundsEnabled ? 'bg-primary' : 'surface-2'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-soft transition-transform mt-0.5 ${soundsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <button
            onClick={togglePasswordVisible}
            className="w-full flex items-center justify-between p-4 hover:surface-2 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full surface-2 flex items-center justify-center text-muted">
                {profile?.password_visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-main">Password Visibility</p>
                <p className="text-xs text-faint">Show passwords in your account</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition ${profile?.password_visible ? 'bg-primary' : 'surface-2'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-soft transition-transform mt-0.5 ${profile?.password_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
