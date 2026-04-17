import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/payment';
import { RefreshCw, X } from 'lucide-react';

interface Transaction { id: string; amount: number; currency: string; status: string; createdAt: Date; updatedAt: Date; }

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£', UGX: 'USh' };
const fmtCur = (a: number, c: string) => `${SYM[c.toUpperCase()] || c}${a.toFixed(2)}`;
const fmtDate = (d: Date | string) => new Date(typeof d === 'string' ? d : d.getTime()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusCls = (s: string) => {
  switch (s.toLowerCase()) {
    case 'completed': return 'text-primary bg-primary/10 border-primary/20';
    case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'failed': return 'text-destructive bg-destructive/10 border-destructive/20';
    default: return 'text-muted-foreground bg-secondary border-border';
  }
};

export const TransactionHistory: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pag, setPag] = useState({ limit: 20, offset: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detLoading, setDetLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmt, setRefundAmt] = useState('');

  const load = async (offset = 0, isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true); setError('');
      const r = await paymentService.getTransactionHistory(pag.limit, offset);
      const processed = r.transactions.map((tx: any) => ({ ...tx, createdAt: new Date(tx.createdAt), updatedAt: new Date(tx.updatedAt) }));
      offset === 0 ? setTxs(processed) : setTxs(p => [...p, ...processed]);
      setPag(p => ({ ...p, offset, total: r.pagination.total }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadDetails = async (id: string) => {
    setDetLoading(true); setSelId(id);
    try { const d = await paymentService.getTransactionDetails(id); setDetails(d); } catch {} finally { setDetLoading(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this payment?')) return;
    setActionLoading(id);
    try { await paymentService.cancelPayment(id); await load(0, true); if (selId === id) { setSelId(null); setDetails(null); } } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleRefund = async (id: string, amount?: number) => {
    setActionLoading(id);
    try { await paymentService.refundPayment(id, amount); await load(0, true); setShowRefund(false); setRefundAmt(''); if (selId === id) { setSelId(null); setDetails(null); } } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  useEffect(() => { load(); }, []);
  const hasMore = pag.offset + txs.length < pag.total;

  if (loading && txs.length === 0) return (
    <div className={className}><div className="glass rounded-2xl p-8"><div className="animate-pulse space-y-4"><div className="h-4 bg-secondary rounded w-1/4" />{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary rounded-xl" />)}</div></div></div>
  );

  if (error && txs.length === 0) return (
    <div className={className}><div className="glass rounded-2xl p-8 text-center"><div className="text-4xl mb-4">⚠️</div><h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load</h3><p className="text-muted-foreground mb-4">{error}</p><button onClick={() => load()} className="btn-primary">Try Again</button></div></div>
  );

  if (txs.length === 0) return (
    <div className={className}><div className="glass rounded-2xl p-8 text-center"><div className="text-4xl mb-4">📋</div><h3 className="text-lg font-semibold text-foreground mb-2">No Transactions Yet</h3><p className="text-muted-foreground">Transactions will appear here after your first payment.</p></div></div>
  );

  return (
    <div className={className}>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div><h3 className="text-lg font-semibold text-foreground">Transaction History</h3><p className="text-sm text-muted-foreground mt-1">{pag.total} total</p></div>
          <button onClick={() => load(0, true)} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="divide-y divide-border">
          {txs.map(tx => (
            <div key={tx.id} className="p-5 hover:bg-card/50 transition-colors flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">Payment #{tx.id.slice(-8)}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCls(tx.status)}`}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <button onClick={() => loadDetails(tx.id)} className="text-xs text-primary hover:underline">Details</button>
                  {tx.status === 'pending' && <button onClick={() => handleCancel(tx.id)} disabled={actionLoading === tx.id} className="text-xs text-destructive hover:underline disabled:opacity-50">{actionLoading === tx.id ? 'Canceling…' : 'Cancel'}</button>}
                  {tx.status === 'completed' && <button onClick={() => { setSelId(tx.id); setRefundAmt(tx.amount.toString()); setShowRefund(true); }} disabled={actionLoading === tx.id} className="text-xs text-yellow-400 hover:underline disabled:opacity-50">{actionLoading === tx.id ? 'Processing…' : 'Refund'}</button>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold text-foreground font-mono">{fmtCur(tx.amount, tx.currency)}</p>
              </div>
            </div>
          ))}
        </div>

        {hasMore && <div className="p-5 border-t border-border text-center"><button onClick={() => load(pag.offset + pag.limit)} disabled={loading} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors disabled:opacity-50">{loading ? 'Loading…' : `Load More (${pag.total - txs.length} remaining)`}</button></div>}
        {!hasMore && txs.length > 0 && <div className="p-4 border-t border-border text-center"><p className="text-xs text-muted-foreground">All {txs.length} transactions shown</p></div>}
      </div>

      {/* Details Modal */}
      {selId && !showRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-2xl shadow-elegant max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Transaction Details</h3>
              <button onClick={() => { setSelId(null); setDetails(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {detLoading ? <div className="text-center py-8"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading…</p></div>
              : details ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-card p-4 space-y-2 text-sm">
                    {[['Transaction ID', details.transaction.id], ['Amount', fmtCur(details.transaction.amount, details.transaction.currency)], ['Status', details.transaction.status], ['Created', fmtDate(details.transaction.createdAt)]].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between"><span className="text-muted-foreground">{k}:</span><span className="text-foreground font-medium font-mono">{v}</span></div>
                    ))}
                  </div>
                  {details.allPayDetails && !details.allPayDetails.error && (
                    <div className="rounded-xl bg-card p-4 space-y-2 text-sm">
                      <h4 className="font-medium text-foreground mb-2">Payment Details</h4>
                      {Object.entries(details.allPayDetails).filter(([k, v]) => v && !['receipt', 'sign', 'error'].includes(k)).map(([k, v]) => (
                        <div key={k} className="flex justify-between"><span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span><span className="text-foreground font-mono text-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              {details?.allPayDetails?.receipt?.trim() && <button onClick={() => window.open(details.allPayDetails.receipt, '_blank')} className="flex-1 btn-primary">📄 View Receipt</button>}
              <button onClick={() => { setSelId(null); setDetails(null); }} className="flex-1 btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefund && selId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-2xl shadow-elegant max-w-md w-full">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Process Refund</h3>
              <button onClick={() => { setShowRefund(false); setRefundAmt(''); }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm text-foreground block mb-1.5">Refund Amount</label><input type="number" step="0.01" min="0.01" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} className="input-field" placeholder="Enter amount" /><p className="text-xs text-muted-foreground mt-1">Leave full amount for complete refund.</p></div>
              <div className="rounded-xl bg-card p-3 border border-border"><p className="text-xs text-muted-foreground"><strong className="text-foreground">Note:</strong> Refunds use available AllPay funds.</p></div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={() => { setShowRefund(false); setRefundAmt(''); }} disabled={actionLoading === selId} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => handleRefund(selId!, refundAmt ? parseFloat(refundAmt) : undefined)} disabled={actionLoading === selId || !refundAmt || parseFloat(refundAmt) <= 0} className="flex-1 btn-primary disabled:opacity-50">{actionLoading === selId ? 'Processing…' : 'Process Refund'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
