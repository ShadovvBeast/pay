import React, { useState, useEffect, useCallback } from 'react';
import { walletService, WalletTransaction, WalletLookupResult, AssetBalance } from '../services/walletService';
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
  Copy,
  Check,
  Repeat,
} from 'lucide-react';

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };

const TYPE_META: Record<string, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  deposit:      { label: 'Deposit',       color: 'text-emerald-400', icon: ArrowDownLeft },
  withdrawal:   { label: 'Withdrawal',    color: 'text-orange-400',  icon: ArrowUpRight },
  refund_debit: { label: 'Refund Debit',  color: 'text-red-400',     icon: ArrowUpRight },
  adjustment:   { label: 'Adjustment',    color: 'text-blue-400',    icon: RefreshCw },
  transfer_in:  { label: 'Received',      color: 'text-emerald-400', icon: ArrowDownLeft },
  transfer_out: { label: 'Sent',          color: 'text-orange-400',  icon: Send },
  swap_in:      { label: 'Swap In',       color: 'text-emerald-400', icon: Repeat },
  swap_out:     { label: 'Swap Out',      color: 'text-orange-400',  icon: Repeat },
};

const PAGE_SIZE = 10;

export const Wallet: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.merchantConfig?.currency || 'ILS';
  const sym = SYM[currency] || currency;

  // Balance
  const [balance, setBalance] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<string>('');
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Multi-asset
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState<number>(0);
  const [assetsLoading, setAssetsLoading] = useState(true);

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

  // Transfer form
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferWalletId, setTransferWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [lookupResult, setLookupResult] = useState<WalletLookupResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const data = await walletService.getBalance();
      setBalance(data.balance);
      setWalletId(data.walletId);
    } catch (e) {
      console.error('Failed to load balance:', e);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const data = await walletService.getAssets();
      setAssets(data.balances);
      setTotalValueUsd(data.totalValueUsd);
    } catch (e) {
      console.error('Failed to load assets:', e);
    } finally {
      setAssetsLoading(false);
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

  useEffect(() => { fetchBalance(); fetchAssets(); }, [fetchBalance, fetchAssets]);
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

  const handleLookupWallet = async () => {
    if (transferWalletId.trim().length !== 20) {
      setError('Wallet ID must be 20 characters');
      return;
    }
    setError('');
    setLookingUp(true);
    try {
      const result = await walletService.lookupWallet(transferWalletId);
      setLookupResult(result);
      setConfirmTransfer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet not found');
      setLookupResult(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleTransfer = async () => {
    setError('');
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (balance !== null && amount > balance) {
      setError('Insufficient balance');
      return;
    }

    setTransferring(true);
    try {
      await walletService.transfer(transferWalletId, amount, transferDesc || undefined);
      setSuccess(`${sym}${amount.toFixed(2)} sent to ${lookupResult?.shopName || transferWalletId}`);
      setTransferWalletId('');
      setTransferAmount('');
      setTransferDesc('');
      setShowTransfer(false);
      setLookupResult(null);
      setConfirmTransfer(false);
      fetchBalance();
      fetchTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const copyWalletId = () => {
    navigator.clipboard.writeText(walletId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <>
              <p className="text-4xl font-display font-bold text-card-foreground">
                ${fmt(totalValueUsd)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total Portfolio Value (USD)</p>
            </>
          )}

          {/* Wallet ID */}
          {walletId && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Wallet ID:</span>
              <code className="text-xs font-mono bg-secondary/60 px-2 py-0.5 rounded text-foreground">{walletId}</code>
              <button onClick={copyWalletId} className="text-muted-foreground hover:text-primary transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => { setShowTransfer(true); setShowWithdraw(false); setError(''); setSuccess(''); setConfirmTransfer(false); setLookupResult(null); }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" /> Send
            </button>
            <button
              onClick={() => { setShowWithdraw(!showWithdraw); setShowTransfer(false); setError(''); setSuccess(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" /> Withdraw
            </button>
            <button
              onClick={() => { fetchBalance(); fetchTransactions(); fetchAssets(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
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

      {/* ── Transfer Form ─────────────────────────────────────── */}
      {showTransfer && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-fade-up">
          <h3 className="font-semibold text-card-foreground">Send to SB0 Pay Wallet</h3>

          {!confirmTransfer ? (
            <>
              <div>
                <label className="text-sm text-foreground block mb-1.5">Recipient Wallet ID</label>
                <input
                  type="text"
                  placeholder="e.g. 649UPYTKAGBJV8B38RC9"
                  value={transferWalletId}
                  onChange={(e) => setTransferWalletId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                  className="input-field font-mono tracking-wider"
                  maxLength={20}
                  disabled={lookingUp}
                />
                <p className="text-xs text-muted-foreground mt-1">20-character wallet ID of the recipient</p>
              </div>
              <div>
                <label className="text-sm text-foreground block mb-1.5">Amount ({sym})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="input-field"
                  disabled={lookingUp}
                />
              </div>
              <div>
                <label className="text-sm text-foreground block mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Payment for supplies"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="input-field"
                  disabled={lookingUp}
                  maxLength={255}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleLookupWallet}
                  disabled={lookingUp || transferWalletId.length !== 20 || !transferAmount}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {lookingUp ? 'Looking up…' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTransfer(false); setLookupResult(null); setConfirmTransfer(false); }}
                  className="px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : lookupResult && (
            <>
              <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Sending to:</p>
                <p className="text-lg font-semibold text-card-foreground">{lookupResult.shopName}</p>
                <p className="text-sm text-muted-foreground">{lookupResult.ownerName}</p>
                <p className="text-xs font-mono text-muted-foreground">{lookupResult.walletId}</p>
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-lg font-bold text-primary">{sym}{parseFloat(transferAmount).toFixed(2)}</p>
                  {transferDesc && <p className="text-xs text-muted-foreground">{transferDesc}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {transferring ? 'Sending…' : 'Confirm Transfer'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmTransfer(false); setLookupResult(null); }}
                  className="px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Asset Balances ────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">Assets</h3>
          <button
            onClick={async () => {
              try {
                setError('');
                const data = await walletService.getDepositAddress();
                setSuccess(`Your Polygon deposit address: ${data.address}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Crypto not available yet');
              }
            }}
            className="text-xs text-primary hover:underline"
          >
            Deposit Crypto
          </button>
        </div>
        {assetsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-muted-foreground text-sm">No assets yet. Completed payments will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {assets.map((asset) => (
              <li key={asset.assetCode} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${asset.assetType === 'crypto' ? 'bg-purple-500/10' : 'bg-emerald-500/10'}`}>
                  {asset.assetCode.startsWith('BTC') ? '₿' : asset.assetCode.includes('USDT') ? '₮' : asset.assetCode.includes('USDC') ? '💲' : asset.assetCode.includes('MATIC') ? '⬡' : asset.assetCode === 'FIAT_CARD' ? '💳' : '📱'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.network}{asset.isSwappable ? ' · Swappable' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-card-foreground">
                    {asset.assetCode.startsWith('BTC') ? asset.balance.toFixed(8) : asset.balance.toFixed(asset.assetType === 'crypto' ? 4 : 2)} {asset.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground">${fmt(asset.valueUsd)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
                const isCredit = tx.type === 'deposit' || tx.type === 'transfer_in' || tx.type === 'swap_in';
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
