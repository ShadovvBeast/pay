import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
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
  QrCode,
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

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scanIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // QR Code for receiving
  const [showReceiveQR, setShowReceiveQR] = useState(false);
  const [walletQrDataUrl, setWalletQrDataUrl] = useState<string>('');

  // Generate QR code when wallet ID is available
  useEffect(() => {
    if (!walletId) return;
    const qrPayload = JSON.stringify({ type: 'sb0pay_wallet', walletId, shopName: user?.shopName || '' });
    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: '#e8f5e9', light: '#0a1a0f' },
      errorCorrectionLevel: 'M',
    }).then(setWalletQrDataUrl).catch(() => {});
  }, [walletId, user?.shopName]);
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

  // ── QR Scanner logic ────────────────────────────────────────
  const startScanner = async () => {
    setScanError('');
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Start scanning frames using a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !ctx) return;
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Use BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(imageData);
            if (barcodes.length > 0) {
              handleScannedData(barcodes[0].rawValue);
            }
          } catch {}
        }
      }, 500);
    } catch (err) {
      setScanError('Camera access denied. Please allow camera permissions.');
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  const handleScannedData = (rawValue: string) => {
    stopScanner();
    try {
      const data = JSON.parse(rawValue);
      if (data.type === 'sb0pay_wallet' && data.walletId) {
        setTransferWalletId(data.walletId);
        setSuccess(`Scanned wallet: ${data.shopName || data.walletId}`);
      } else {
        // Maybe it's just a raw wallet ID
        setScanError('Invalid QR code. Please scan an SB0 Pay wallet QR.');
      }
    } catch {
      // Try treating it as a plain wallet ID (20 uppercase alphanumeric chars)
      const cleaned = rawValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length === 20) {
        setTransferWalletId(cleaned);
        setSuccess(`Scanned wallet ID: ${cleaned}`);
      } else {
        setScanError('Could not read wallet ID from QR code.');
      }
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

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
              onClick={() => { setShowTransfer(true); setShowWithdraw(false); setShowReceiveQR(false); setError(''); setSuccess(''); setConfirmTransfer(false); setLookupResult(null); }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" /> Send
            </button>
            <button
              onClick={() => { setShowReceiveQR(!showReceiveQR); setShowWithdraw(false); setShowTransfer(false); setError(''); setSuccess(''); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors ${
                showReceiveQR ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              <QrCode className="h-4 w-4" /> Receive
            </button>
            <button
              onClick={() => { setShowWithdraw(!showWithdraw); setShowTransfer(false); setShowReceiveQR(false); setError(''); setSuccess(''); }}
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

      {/* ── Receive QR Code ─────────────────────────────────── */}
      {showReceiveQR && walletQrDataUrl && (
        <div className="bg-card rounded-2xl border border-border p-6 text-center animate-fade-up">
          <h3 className="font-semibold text-card-foreground mb-1">Receive Assets</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Share this QR code or Wallet ID. The sender can scan it to send any supported asset to your wallet.
          </p>
          <div className="inline-block p-3 rounded-2xl bg-background border border-border">
            <img src={walletQrDataUrl} alt="Wallet QR Code" className="w-56 h-56 mx-auto rounded-xl" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <code className="text-sm font-mono bg-secondary/60 px-3 py-1 rounded text-foreground tracking-wider">{walletId}</code>
            <button onClick={copyWalletId} className="text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Supports: Card Balance, USDT (Polygon/Plasma), BTC, and more
          </p>
        </div>
      )}

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

          {/* Method choice: Scan or Enter ID */}
          {!confirmTransfer && !transferWalletId && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">How would you like to identify the recipient?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startScanner()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <QrCode className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium text-foreground">Scan QR</span>
                  <span className="text-xs text-muted-foreground text-center">Use camera to scan</span>
                </button>
                <button
                  onClick={() => setTransferWalletId(' ')}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Copy className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium text-foreground">Enter ID</span>
                  <span className="text-xs text-muted-foreground text-center">Type wallet ID manually</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowTransfer(false); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Scanner active */}
          {showScanner && (
            <div className="space-y-3">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-2 border-primary/50 bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary/70 rounded-xl" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">Point camera at the recipient's wallet QR code</p>
              {scanError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center">
                  <p className="text-xs text-red-400">{scanError}</p>
                </div>
              )}
              <button
                type="button"
                onClick={stopScanner}
                className="w-full px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {/* Manual entry form (shown when transferWalletId has value) */}
          {!confirmTransfer && transferWalletId && !showScanner && (
            <>
              <div>
                <label className="text-sm text-foreground block mb-1.5">Recipient Wallet ID</label>
                <input
                  type="text"
                  placeholder="e.g. 649UPYTKAGBJV8B38RC9"
                  value={transferWalletId.trim()}
                  onChange={(e) => setTransferWalletId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                  className="input-field font-mono tracking-wider"
                  maxLength={20}
                  disabled={lookingUp}
                  autoFocus
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
                  disabled={lookingUp || transferWalletId.trim().length !== 20 || !transferAmount}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-glow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {lookingUp ? 'Looking up…' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTransferWalletId(''); setTransferAmount(''); setTransferDesc(''); }}
                  className="px-4 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}

          {/* Confirmation */}
          {confirmTransfer && lookupResult && (
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
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  setError('');
                  const data = await walletService.getDepositAddress('polygon');
                  setSuccess(`Polygon address: ${data.address} — Send USDT, USDC, or MATIC here.`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Crypto not available yet');
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              Deposit (Polygon)
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              onClick={async () => {
                try {
                  setError('');
                  const data = await walletService.getDepositAddress('plasma');
                  setSuccess(`Plasma address: ${data.address} — Send USDT here (zero fees).`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Crypto not available yet');
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              Deposit (Plasma)
            </button>
          </div>
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
