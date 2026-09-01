import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Inbox, Eye, X, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate, maskCardNumber } from '@/lib/format';
import { hapticImpact } from '@/lib/telegram';
import { playClick } from '@/lib/sounds';
import type { Account, Transaction } from '@/lib/supabase';

type TxDetails = {
  tx_id: string;
  tx_amount: number;
  tx_type: string;
  tx_description: string;
  tx_created_at: string;
  direction: string;
  counterparty_card: string;
  counterparty_name: string;
  counterparty_username: string;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<TxDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: acct } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setAccount(acct as Account | null);

      if (acct) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .or(`from_account_id.eq.${acct.id},to_account_id.eq.${acct.id}`)
          .order('created_at', { ascending: false });
        setTransactions((txs as Transaction[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const showDetails = async (txId: string) => {
    setDetailLoading(true);
    hapticImpact('medium');
    const { data, error } = await supabase.rpc('get_transaction_details', { p_tx_id: txId });
    if (!error && data) {
      setSelectedTx(data as TxDetails);
    }
    setDetailLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    playClick();
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
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-main mb-6">Transaction History</h1>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-faint">
          <Inbox className="w-12 h-12 mb-3" />
          <p className="text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const isOutgoing = tx.from_account_id === account?.id;
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 surface-card border surface-border rounded-xl p-3.5"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isOutgoing ? 'bg-danger-surface' : 'bg-success-surface'
                  }`}
                >
                  {isOutgoing ? (
                    <ArrowUpRight className="w-5 h-5 text-danger" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-success" />
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
                <button
                  onClick={() => showDetails(tx.id)}
                  className="p-2 rounded-lg hover:surface-2 transition text-muted"
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="surface-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-soft-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-main">Transaction Details</h3>
                  <button onClick={() => setSelectedTx(null)} className="text-muted hover:text-main transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Direction</span>
                    <span className={`text-sm font-semibold ${selectedTx.direction === 'outgoing' ? 'text-danger' : 'text-success'}`}>
                      {selectedTx.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Amount</span>
                    <span className="text-sm font-bold text-main">{formatMoney(selectedTx.tx_amount, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Date</span>
                    <span className="text-sm text-main">{formatDate(selectedTx.tx_created_at)}</span>
                  </div>
                  {selectedTx.tx_description && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Description</span>
                      <span className="text-sm text-main">{selectedTx.tx_description}</span>
                    </div>
                  )}

                  {selectedTx.counterparty_name && (
                    <>
                      <div className="border-t surface-border pt-3 mt-3">
                        <p className="text-xs text-faint uppercase tracking-wider mb-2">Counterparty</p>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted">Name</span>
                          <span className="text-sm font-medium text-main">{selectedTx.counterparty_name}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted">Username</span>
                          <span className="text-sm font-medium text-main">@{selectedTx.counterparty_username}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted">Card Number</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-main">{maskCardNumber(selectedTx.counterparty_card)}</span>
                            {selectedTx.counterparty_card && (
                              <button onClick={() => copyToClipboard(selectedTx.counterparty_card)} className="text-muted hover:text-main transition">
                                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
