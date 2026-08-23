import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateUsername } from '@/lib/format';
import { CARD_DESIGNS } from '@/lib/cardDesigns';
import { BankLogo } from '@/components/CardDisplay';
import { hapticImpact, hapticNotify } from '@/lib/telegram';
import { playClick, playError as soundError } from '@/lib/sounds';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [cardDesign, setCardDesign] = useState('classic');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        soundError();
        return;
      }
    }

    setLoading(true);
    hapticImpact('medium');

    let result;
    if (mode === 'login') {
      result = await signIn(email, password);
    } else {
      result = await signUp(email, password, displayName, username, cardDesign);
    }

    if (result.error) {
      setError(result.error);
      soundError();
      hapticNotify('error');
      setLoading(false);
      return;
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen surface-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-soft-lg mb-4">
            <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
              <path d="M12 14h16M12 20h16M12 26h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="28" cy="26" r="4" fill="#fff" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--primary)' }}>Ricot Bank</h1>
          <p className="text-muted text-sm mt-1.5">
            {mode === 'login' ? 'Sign in to your account' : 'Open an account in a minute'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Username (handle)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint font-medium">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="johnsmith"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
                  />
                </div>
                <p className="text-xs text-faint mt-1">English letters, numbers, underscores only</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-11 pr-11 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                  playClick();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-faint hover:text-main transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Card Design Selection */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Choose Your Card Design</label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto scrollbar-hide p-1">
                {CARD_DESIGNS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      setCardDesign(d.key);
                      playClick();
                      hapticImpact('light');
                    }}
                    className={`relative rounded-lg h-16 overflow-hidden transition ${cardDesign === d.key ? 'ring-2 ring-offset-2 border-primary' : 'ring-0'}`}
                    style={{ background: d.gradient, outline: cardDesign === d.key ? '2px solid var(--primary)' : 'none', outlineOffset: '2px' }}
                    title={d.name}
                  >
                    {cardDesign === d.key && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-faint mt-1.5">
                {CARD_DESIGNS.find((d) => d.key === cardDesign)?.name} — {CARD_DESIGNS.find((d) => d.key === cardDesign)?.category}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-surface rounded-lg px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold bg-primary-hover active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-soft-lg"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              playClick();
            }}
            className="text-primary font-semibold hover:opacity-80 transition"
          >
            {mode === 'login' ? 'Open Account' : 'Sign In'}
          </button>
        </p>

        {mode === 'signup' && (
          <p className="text-center text-xs text-faint mt-6">
            You'll receive $3,000 starting balance on your new account
          </p>
        )}
      </div>
    </div>
  );
}
