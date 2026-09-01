import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate } from '@/lib/format';
import { hapticImpact, hapticNotify } from '@/lib/telegram';
import { playClick, playError, playSuccess } from '@/lib/sounds';
import type { Account, Credit } from '@/lib/supabase';

export default function CreditsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const { data: acct } = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
    setAccount(acct as Account | null);
    const { data: cr } = await supabase.from('credits').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setCredits((cr as Credit[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount');
      playError();
      return;
    }
    setSubmitting(true);
    hapticImpact('medium');
    const { error: rpcError } = await supabase.rpc('create_credit', { p_amount: amt });
    if (rpcError) {
      setError(rpcError.message);
      playError();
      setSubmitting(false);
      return;
    }
    playSuccess();
    hapticNotify('success');
    setSuccess(true);
    setSubmitting(false);
    setAmount('');
    setShowForm(false);
    setTimeout(() => setSuccess(false), 2500);
    loadData();
  };

  const handleRepay = async (creditId: string) => {
    hapticImpact('medium');
    const { error } = await supabase.rpc('repay_credit', { p_credit_id: creditId, p_amount: 100 });
    if (error) {
      playError();
      return;
    }
    playSuccess();
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-main">Credits & Loans</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            playClick();
          }}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold bg-primary-hover transition"
        >
          {showForm ? 'Cancel' : 'New Credit'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-surface rounded-lg px-3.5 py-2.5 mb-4 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Credit approved! Funds added to your balance.</span>
        </div>
      )}

      {/* New Credit Form */}
      {showForm && (
        <form onSubmit={handleCreateCredit} className="surface-card border surface-border rounded-2xl p-5 mb-6 space-y-4 animate-slide-up">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Credit Amount (max $50,000)</label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                max="50000"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full px-4 py-3 pr-10 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition text-lg font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
            </div>
            <p className="text-xs text-faint mt-1.5">Interest rate: 12% APR. Funds added to your balance instantly.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-surface rounded-lg px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold bg-primary-hover transition disabled:opacity-60"
          >
            {submitting ? 'Processing...' : 'Request Credit'}
          </button>
        </form>
      )}

      {/* Active Credits */}
      {credits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-faint">
          <CreditCard className="w-12 h-12 mb-3" />
          <p className="text-sm">No credits yet</p>
          <p className="text-xs mt-1">Take a loan to get instant funds</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map((cr) => (
            <div key={cr.id} className="surface-card border surface-border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-muted">Credit</p>
                  <p className="text-xl font-bold text-main">{formatMoney(cr.amount, 'USD')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${cr.status === 'active' ? 'bg-danger-surface text-danger' : 'bg-success-surface text-success'}`}>
                  {cr.status === 'active' ? 'Active' : 'Paid Off'}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <div>
                  <p className="text-faint text-xs">Remaining</p>
                  <p className="font-semibold text-danger">{formatMoney(cr.remaining, 'USD')}</p>
                </div>
                <div>
                  <p className="text-faint text-xs">Interest Rate</p>
                  <p className="font-semibold text-main">{cr.interest_rate}%</p>
                </div>
                <div>
                  <p className="text-faint text-xs">Issued</p>
                  <p className="font-semibold text-main">{formatDate(cr.created_at)}</p>
                </div>
              </div>
              {cr.status === 'active' && (
                <button
                  onClick={() => handleRepay(cr.id)}
                  className="w-full py-2.5 rounded-xl border border-primary-border text-primary font-medium text-sm hover:bg-primary-surface transition flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  Repay $100
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
