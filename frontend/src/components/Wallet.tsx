import React, { useState, useEffect, useCallback } from 'react';
import { walletService, WalletTransaction } from '../services/walletService';
import { useAuth } from '../hooks/useAuth';
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };

const TYPE_META: Record<string, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  deposit:      { label: 'Deposit',      color: 'text-emerald-400', icon: ArrowDownLeft },
  withdrawal:   { label: 'Withdrawal',   color: 'text-orange-400',  icon: ArrowUpRight },
  refund_debit: { label: 'Refund Debit', color: 'text-red-400',     icon: ArrowUpRight },
  adjustment:   { label: 'Adjustment',   color: 'text-blue-400',    icon: RefreshCw },
};

const PAGE_SIZE = 10;

export const Wallet: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.merchantConfig?.currency || 'ILS';
  const sym = SYM[currency] || currency;

  // Balance
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Transactions
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(true);

  // Withdraw form
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDesc, setWithdrawDesc] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const data = await walletService.getBalance();
      setBalance(data.balance);
    } catch (e) {
      console.error('Failed to load balance:', e);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const data = await walletService.getTransactions(PAGE_SIZE, page * PAGE_SIZE);
      setTransactions(data.transactions);
      setTotal(data.pagination.total);
    } catch (e) {
      console.error('Failed to load wallet transactions:', e);
    } finally {
      setTxLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (balance !== null && amount > balance) {
      setError('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      await walletService.withdraw(amount, withdrawDesc || undefined);
      setSuccess(`Withdrawal of ${sym}${amount.toFixed(2)} processed`);
      setWithdrawAmount('');
      setWithdrawDesc('');
      setShowWithdraw(false);
      fetchBalance();
      fetchTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Balance Card ──────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <WalletIcon className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Wallet Balance</span>
          </div>
          {balanceLoading ? (
            <div className="flex items-center justify-center h-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <p className="text-4xl font-display font-bold text-card-foreground">
              {sym}{fmt(balance ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{currency}</p>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => { setShowWithdraw(!showWithdraw); setError(''); setSuccess(''); }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" /> Withdraw
            </button>
            <button
              onClick={() => { fetchBalance(); fetchTransactions(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────── */}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm text-emerald-400">✅ {success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Withdraw Form ─────────────────────────────────────── */}
      {showWithdraw && (
        <form onSubmit={handleWithdraw} className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-fade-up">
          <h3 className="font-semibold text-card-foreground">Withdraw Funds</h3>
          <div>
            <label className="text-sm text-foreground block mb-1.5">Amount ({sym})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="input-field"
              disabled={withdrawing}
              required
            />
          </div>
          <div>
            <label className="text-sm text-foreground block mb-1.5">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly withdrawal"
              value={withdrawDesc}
              onChange={(e) => setWithdrawDesc(e.target.value)}
              className="input-field"
              disabled={withdrawing}
              maxLength={255}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={withdrawing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {withdrawing ? 'Processing…' : 'Confirm Withdrawal'}
            </button>
            <button
              type="button"
              onClick={() => setShowWithdraw(false)}
              className="px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Transaction History ────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-card-foreground">Wallet Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{total} transaction{total !== 1 ? 's' : ''}</p>
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <WalletIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No wallet activity yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Completed payments will appear here as deposits</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {transactions.map((tx) => {
                const meta = TYPE_META[tx.type] || TYPE_META.adjustment;
                const Icon = meta.icon;
                const isCredit = tx.type === 'deposit';
                return (
                  <li key={tx.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCredit ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {tx.description || meta.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {isCredit ? '+' : '−'}{sym}{fmt(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        bal {sym}{fmt(tx.balanceAfter)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
