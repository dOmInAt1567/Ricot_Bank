import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, CreditCard, AtSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, validateUsername } from '@/lib/format';
import { hapticImpact, hapticNotify } from '@/lib/telegram';
import { playClick, playError } from '@/lib/sounds';
import SuccessAnimation from '@/components/SuccessAnimation';
import type { Account } from '@/lib/supabase';

export default function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [method, setMethod] = useState<'card' | 'username'>('card');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setAccount(data as Account | null);
    })();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    hapticImpact('medium');

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount');
      playError();
      setLoading(false);
      return;
    }

    if (method === 'username') {
      const usernameError = validateUsername(recipient.trim());
      if (usernameError) {
        setError(usernameError);
        playError();
        setLoading(false);
        return;
      }
    }

    const rpcName = method === 'card' ? 'transfer_by_card' : 'transfer_by_username';
    const { error: rpcError } = await supabase.rpc(rpcName, {
      [method === 'card' ? 'p_to_card_number' : 'p_to_username']: recipient.trim(),
      p_amount: amt,
      p_description: description.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      playError();
      hapticNotify('error');
      setLoading(false);
      return;
    }

    hapticNotify('success');
    setSuccess(true);
  };

  if (success) {
    return (
      <SuccessAnimation
        message={`${formatMoney(parseFloat(amount), 'USD')} sent successfully`}
        onComplete={() => navigate('/')}
      />
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold text-main mb-6">Transfer Money</h1>

      {/* Balance */}
      {account && (
        <div className="surface-2 rounded-xl p-4 mb-5">
          <p className="text-sm text-muted">Available</p>
          <p className="text-lg font-bold text-main">{formatMoney(account.balance, 'USD')}</p>
        </div>
      )}

      {/* Method Toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => {
            setMethod('card');
            setRecipient('');
            setError(null);
            playClick();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition ${
            method === 'card' ? 'bg-primary text-white border-primary' : 'surface-card surface-border text-muted'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-sm font-medium">By Card</span>
        </button>
        <button
          onClick={() => {
            setMethod('username');
            setRecipient('');
            setError(null);
            playClick();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition ${
            method === 'username' ? 'bg-primary text-white border-primary' : 'surface-card surface-border text-muted'
          }`}
        >
          <AtSign className="w-4 h-4" />
          <span className="text-sm font-medium">By Username</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            {method === 'card' ? 'Recipient Card Number' : 'Recipient Username'}
          </label>
          {method === 'username' ? (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint font-medium">@</span>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.toLowerCase())}
                placeholder="johnsmith"
                className="w-full pl-9 pr-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
              />
            </div>
          ) : (
            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="4000 0000 0000 0000"
              className="w-full px-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition font-mono"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Amount</label>
          <div className="relative">
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 pr-10 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition text-lg font-semibold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this for?"
            className="w-full px-4 py-3 rounded-xl border surface-border surface-card text-main input-bg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-primary transition"
          />
        </div>

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
              <Send className="w-5 h-5" />
              Send {amount ? formatMoney(parseFloat(amount), 'USD') : ''}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
