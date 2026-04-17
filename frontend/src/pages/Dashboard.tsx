import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { PaymentFlow } from '../components/PaymentFlow';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { TransactionHistory } from '../components/TransactionHistory';
import { Settings } from '../components/Settings';
import { paymentService } from '../services/payment';
import {
  LayoutDashboard, CreditCard, List, Settings as SettingsIcon,
  LogOut, Store, Globe, Plus,
  TrendingUp, ArrowUpRight, CheckCircle2,
} from 'lucide-react';
import logo from '../assets/logo.png';

type View = 'overview' | 'payment' | 'transactions' | 'settings';

const navItems: { view: View; icon: typeof LayoutDashboard; label: string }[] = [
  { view: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { view: 'payment', icon: CreditCard, label: 'Payment' },
  { view: 'transactions', icon: List, label: 'History' },
  { view: 'settings', icon: SettingsIcon, label: 'Settings' },
];

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };
const LANG: Record<string, string> = { he: 'Hebrew', en: 'English', ru: 'Russian', ar: 'Arabic' };

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [view, setView] = useState<View>('overview');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Stats
  const [stats, setStats] = useState({ revenue: 0, total: 0, completed: 0 });
  useEffect(() => {
    paymentService.getTransactionHistory(100, 0)
      .then(r => {
        const txs = r.transactions || [];
        const today = new Date().toISOString().slice(0, 10);
        const completed = txs.filter((t: any) => t.status === 'completed');
        const todayRevenue = completed
          .filter((t: any) => t.createdAt?.slice?.(0, 10) === today)
          .reduce((s: number, t: any) => s + (t.amount || 0), 0);
        setStats({ revenue: todayRevenue, total: txs.length, completed: completed.length });
      })
      .catch(() => {});
  }, [view]);

  const go = (v: View) => { setView(v); setSuccess(''); setError(''); };
  const currency = user?.merchantConfig?.currency || 'ILS';
  const sym = SYM[currency] || currency;

  return (
    <div className={`min-h-screen bg-background ${theme}`}>
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => go('overview')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src={logo} alt="SB0 Pay" className="h-7 w-auto rounded-md" />
              <span className="font-semibold tracking-tight hidden sm:inline text-foreground">SB0 Pay</span>
            </button>
            {view !== 'overview' && (
              <button onClick={() => go('overview')} className="text-sm text-primary hover:underline ml-2">← Dashboard</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground">{user?.shopName}</span>
            <button onClick={logout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Bottom mobile nav ──────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border md:hidden safe-area-inset">
        <div className="flex">
          {navItems.map(item => (
            <button key={item.view} onClick={() => go(item.view)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${view === item.view ? 'text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-5 w-5" />
              {item.label}
              {view === item.view && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {/* Desktop nav pills */}
        <div className="hidden md:flex gap-2 mb-6">
          {navItems.map(item => (
            <button key={item.view} onClick={() => go(item.view)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                view === item.view ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 glass rounded-2xl p-4 text-center border border-primary/30">
            <p className="text-primary font-medium text-sm">✅ {success}</p>
            <button onClick={() => setSuccess('')} className="text-xs text-primary hover:underline mt-1">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="mb-6 glass rounded-2xl p-4 text-center border border-destructive/30">
            <p className="text-destructive font-medium text-sm">❌ {error}</p>
            <button onClick={() => setError('')} className="text-xs text-destructive hover:underline mt-1">Dismiss</button>
          </div>
        )}

        {/* ── Overview ───────────────────────────────────────────── */}
        {view === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            {/* Full-width Create Payment CTA */}
            <button
              onClick={() => go('payment')}
              className="w-full h-16 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold shadow-glow hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 group"
            >
              <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
              Create Payment
            </button>

            {/* Stats row — 3 cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl border border-border p-4 text-center hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{sym}{stats.revenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 text-center hover:border-primary/30 hover:shadow-soft transition-all">
                <p className="text-2xl font-display font-bold text-card-foreground mt-2">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Transactions</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 text-center hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-center justify-center mb-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>

            {/* Info cards row */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Shop Info */}
              <div className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-card-foreground">Shop Info</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Shop</span><span className="text-card-foreground font-medium">{user?.shopName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-card-foreground font-medium">{user?.ownerName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-card-foreground font-medium">{user?.email || '—'}</span></div>
                </div>
              </div>

              {/* Configuration */}
              <div className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-card-foreground">Configuration</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Reg. Number</span><span className="text-card-foreground font-mono">{user?.merchantConfig?.companyNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="text-card-foreground">{sym} {currency}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Language</span><span className="text-card-foreground">{LANG[user?.merchantConfig?.language || ''] || user?.merchantConfig?.language || '—'}</span></div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-soft transition-all">
                <h3 className="font-semibold text-card-foreground mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Create Payment', icon: CreditCard, v: 'payment' as View },
                    { label: 'View Transactions', icon: List, v: 'transactions' as View },
                    { label: 'Settings', icon: SettingsIcon, v: 'settings' as View },
                  ].map(a => (
                    <button key={a.label} onClick={() => go(a.v)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border text-sm font-medium text-card-foreground hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
                      <a.icon className="h-4 w-4 text-muted-foreground" /> {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PWA prompt */}
            <PWAInstallPrompt />
          </div>
        )}

        {/* ── Payment ────────────────────────────────────────────── */}
        {view === 'payment' && (
          <div className="max-w-md mx-auto animate-fade-up">
            <div className="text-center mb-6">
              <h2 className="font-display text-3xl text-gradient mb-1">Create Payment</h2>
              <p className="text-muted-foreground text-sm">Enter the amount to generate a QR code</p>
            </div>
            <PaymentFlow
              onPaymentComplete={id => { setSuccess(`Payment completed! ID: ${id}`); setTimeout(() => setSuccess(''), 5000); }}
              onPaymentError={e => { setError(e); setTimeout(() => setError(''), 5000); }}
            />
          </div>
        )}

        {/* ── Transactions ───────────────────────────────────────── */}
        {view === 'transactions' && (
          <div className="max-w-4xl mx-auto animate-fade-up">
            <div className="text-center mb-6">
              <h2 className="font-display text-3xl text-gradient mb-1">Transactions</h2>
              <p className="text-muted-foreground text-sm">Your recent payment history</p>
            </div>
            <TransactionHistory />
          </div>
        )}

        {/* ── Settings ───────────────────────────────────────────── */}
        {view === 'settings' && <div className="animate-fade-up"><Settings /></div>}
      </main>
    </div>
  );
};
