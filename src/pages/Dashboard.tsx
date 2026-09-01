import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowDownLeft, ArrowUpRight, Eye, EyeOff, Copy, Check, Receipt, CreditCard, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate, maskCardNumber } from '@/lib/format';
import { hapticImpact } from '@/lib/telegram';
import { playClick } from '@/lib/sounds';
import CardDisplay from '@/components/CardDisplay';
import type { Account, Card, Transaction, Credit } from '@/lib/supabase';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [hideCard, setHideCard] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: acct } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setAccount(acct as Account | null);

    if (acct) {
      const { data: c } = await supabase
        .from('cards')
        .select('*')
        .eq('account_id', acct.id)
        .maybeSingle();
      setCard(c as Card | null);

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_account_id.eq.${acct.id},to_account_id.eq.${acct.id}`)
        .order('created_at', { ascending: false })
        .limit(5);
      setTransactions((txs as Transaction[]) ?? []);

      const { data: cr } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setCredits((cr as Credit[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyCardNumber = () => {
    if (!card) return;
    navigator.clipboard.writeText(card.card_number);
    setCopied(true);
    playClick();
    hapticImpact('light');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
      {/* Greeting */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold text-main">{profile?.display_name || 'User'}</h1>
          {profile?.role && profile.role !== 'client' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary-surface px-2 py-0.5 rounded-full mt-1">
              <Shield className="w-3 h-3" />
              {profile.role === 'creator' ? 'Creator' : 'Admin'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Card + Balance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Card */}
          <div className="surface-card rounded-2xl p-6 shadow-soft surface-border border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted text-sm font-medium">Available Balance</span>
              <button
                onClick={() => {
                  setHideBalance(!hideBalance);
                  playClick();
                }}
                className="text-muted hover:text-main transition"
              >
                {hideBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-4xl font-bold text-main tracking-tight mb-4">
              {hideBalance ? '••••' : formatMoney(account?.balance ?? 0, 'USD')}
            </div>
            <div className="flex items-center gap-2 text-muted text-sm">
              <span className="font-mono">{maskCardNumber(card?.card_number ?? '')}</span>
              <button onClick={copyCardNumber} className="hover:text-main transition">
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Virtual Card */}
          {card && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-main">Your Card</h2>
                <button
                  onClick={() => {
                    setHideCard(!hideCard);
                    playClick();
                  }}
                  className="text-sm text-primary font-medium flex items-center gap-1 hover:opacity-80 transition"
                >
                  {hideCard ? <><Eye className="w-4 h-4" /> Show</> : <><EyeOff className="w-4 h-4" /> Hide</>}
                </button>
              </div>
              <div className="flex justify-center lg:justify-start">
                <CardDisplay
                  cardNumber={card.card_number}
                  cardHolder={card.card_holder}
                  expiryMonth={card.expiry_month}
                  expiryYear={card.expiry_year}
                  cvv={card.cvv}
                  design={card.design}
                  showDetails={!hideCard}
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                hapticImpact('medium');
                navigate('/transfer');
              }}
              className="flex flex-col items-center gap-2 surface-card border surface-border rounded-2xl p-5 hover:border-primary-border hover:shadow-soft transition active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-primary-surface flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-main">Transfer</span>
            </button>
            <button
              onClick={() => {
                hapticImpact('medium');
                navigate('/credits');
              }}
              className="flex flex-col items-center gap-2 surface-card border surface-border rounded-2xl p-5 hover:border-primary-border hover:shadow-soft transition active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-primary-surface flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-main">Credits</span>
            </button>
            <button
              onClick={() => {
                hapticImpact('medium');
                navigate('/history');
              }}
              className="flex flex-col items-center gap-2 surface-card border surface-border rounded-2xl p-5 hover:border-primary-border hover:shadow-soft transition active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-primary-surface flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-main">History</span>
            </button>
          </div>
        </div>

        {/* Right column: Recent Transactions + Active Credits */}
        <div className="space-y-6">
          {/* Active Credits Summary */}
          {credits.length > 0 && (
            <div className="surface-card rounded-2xl p-5 shadow-soft surface-border border">
              <h3 className="text-sm font-bold text-main mb-3">Active Credits</h3>
              {credits.map((cr) => (
                <div key={cr.id} className="flex items-center justify-between py-2 border-b surface-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-main">{formatMoney(cr.amount)}</p>
                    <p className="text-xs text-faint">{cr.interest_rate}% APR</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-danger">{formatMoney(cr.remaining)}</p>
                    <p className="text-xs text-faint">remaining</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          <div className="surface-card rounded-2xl p-5 shadow-soft surface-border border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-main">Recent Activity</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-primary font-medium hover:opacity-80 transition"
              >
                View All
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-faint">
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isOutgoing = tx.from_account_id === account?.id;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:surface-2 transition"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isOutgoing ? 'bg-danger-surface' : 'bg-success-surface'
                        }`}
                      >
                        {isOutgoing ? (
                          <ArrowUpRight className="w-4 h-4 text-danger" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-main truncate">
                          {tx.description || (isOutgoing ? 'Transfer' : 'Deposit')}
                        </p>
                        <p className="text-xs text-faint">{formatDate(tx.created_at)}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold shrink-0 ${isOutgoing ? 'text-danger' : 'text-success'}`}
                      >
                        {isOutgoing ? '−' : '+'}
                        {formatMoney(tx.amount, 'USD')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
