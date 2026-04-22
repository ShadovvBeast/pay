import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Smartphone, CheckCircle2, Wifi } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFormValidation } from '../hooks/useFormValidation';
import type { RegisterData } from '../types/auth';
import logo from '../assets/logo.png';

type Mode = 'login' | 'register';

const CURRENCIES = [
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
];
const LANGUAGES = [
  { code: 'he', native: 'עברית' },
  { code: 'en', native: 'English' },
  { code: 'ru', native: 'Русский' },
  { code: 'ar', native: 'العربية' },
];

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition';
const inputErrCls = 'w-full px-4 py-2.5 rounded-lg border border-red-500 bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition';
const selectCls = 'w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition appearance-none';

const loginRules = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 1 },
};
const regRules = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 8, custom: (v: string) => !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v) ? 'Must contain uppercase, lowercase, and a number' : null },
  confirmPassword: { required: true },
  shopName: { required: true, minLength: 2, maxLength: 100 },
  ownerName: { required: true, minLength: 2, maxLength: 100 },
  companyNumber: { required: true, minLength: 9, maxLength: 9, pattern: /^\d{9}$/, custom: (v: string) => !/^\d{9}$/.test(v) ? 'Must be exactly 9 digits' : null },
};

/* ── Field wrapper ─────────────────────────────────────────────── */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm text-foreground">{label}</label>
    {children}
  </div>
);

/* ── Password input ────────────────────────────────────────────── */
const PwdInput = ({ show, onToggle, ...props }: { show: boolean; onToggle: () => void } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative">
    <input {...props} type={show ? 'text' : 'password'} className={`${inputCls} pr-10`} />
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
);

/* ── Step dot ──────────────────────────────────────────────────── */
const StepDot = ({ n, active, done }: { n: number; active?: boolean; done?: boolean }) => (
  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-secondary text-muted-foreground'}`}>
    {done ? <CheckCircle2 className="h-4 w-4" /> : n}
  </div>
);

/* ── Main AuthPage ─────────────────────────────────────────────── */
export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<1 | 2>(1);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [language, setLanguage] = useState('he');
  const [rememberMe, setRememberMe] = useState(false);

  const loginForm = useFormValidation({ email: '', password: '' }, loginRules);
  const regForm = useFormValidation({ email: '', password: '', confirmPassword: '', shopName: '', ownerName: '', companyNumber: '' }, regRules);
  const confirmErr = regForm.touched.confirmPassword && regForm.values.confirmPassword !== regForm.values.password ? 'Passwords do not match' : '';

  React.useEffect(() => {
    const saved = localStorage.getItem('remember_email');
    if (saved) { loginForm.handleChange('email', saved); setRememberMe(true); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (mode === 'login') {
      if (!loginForm.validateForm()) return;
      loginForm.setIsSubmitting(true);
      try {
        await login(loginForm.values.email, loginForm.values.password);
        if (rememberMe) localStorage.setItem('remember_email', loginForm.values.email);
        else localStorage.removeItem('remember_email');
        setSuccess('Welcome back! Redirecting…');
        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
      finally { loginForm.setIsSubmitting(false); }
    } else {
      if (step === 1) { setStep(2); return; }
      if (!regForm.validateForm() || confirmErr) return;
      regForm.setIsSubmitting(true);
      try {
        const data: RegisterData = {
          email: regForm.values.email, password: regForm.values.password, confirmPassword: regForm.values.confirmPassword,
          shopName: regForm.values.shopName, ownerName: regForm.values.ownerName,
          merchantConfig: { companyNumber: regForm.values.companyNumber, currency, language },
        };
        await register(data);
        setSuccess('Account created! Redirecting…');
        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      } catch (err) { setError(err instanceof Error ? err.message : 'Registration failed'); }
      finally { regForm.setIsSubmitting(false); }
    }
  };

  const switchMode = () => { setMode(m => m === 'login' ? 'register' : 'login'); setStep(1); setError(''); setSuccess(''); };
  const isSubmitting = mode === 'login' ? loginForm.isSubmitting : regForm.isSubmitting;

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-secondary/30 flex-col justify-between p-10">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="relative flex items-center gap-2.5">
          <img src={logo} alt="SB0 Pay" className="h-9 w-auto rounded-md" />
        </div>
        <div className="relative space-y-6 max-w-md">
          <h2 className="font-display text-5xl leading-tight">
            Accept payments with a <span className="text-brand-gradient">single QR.</span>
          </h2>
          <p className="text-muted-foreground text-lg">Built for shop owners. Tap an amount, show the code, get paid. No hardware. No paperwork.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Smartphone, label: 'Mobile-first' },
              { icon: Wifi, label: 'Works offline' },
              { icon: CheckCircle2, label: 'Instant setup' },
            ].map((f) => (
              <div key={f.label} className="glass rounded-2xl p-4 text-center">
                <f.icon className="h-5 w-5 mx-auto text-primary mb-2" />
                <div className="text-xs text-muted-foreground">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} SB0 Pay</p>
      </aside>

      {/* Form panel */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src={logo} alt="SB0 Pay" className="h-8 w-auto rounded-md" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Online · PWA ready
            </span>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Home</Link>
          </div>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4"><p className="text-sm text-red-400">⚠️ {error}</p></div>}
          {success && <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 mb-4"><p className="text-sm text-primary">✅ {success}</p></div>}

          <h1 className="font-display text-4xl mb-2">
            {mode === 'login' ? 'Welcome back' : step === 1 ? 'Create your shop' : 'Business details'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === 'login' ? 'Sign in to your merchant dashboard.' : step === 1 ? 'Step 1 of 2 — your account credentials.' : 'Step 2 of 2 — how customers will be charged.'}
          </p>

          {mode === 'register' && (
            <div className="flex items-center gap-3 mb-8">
              <StepDot active n={1} done={step === 2} />
              <div className="h-px flex-1 bg-border" />
              <StepDot active={step === 2} n={2} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' && (
              <>
                <Field label="Email">
                  <input type="email" placeholder="you@shop.com" autoComplete="email" disabled={isSubmitting}
                    className={loginForm.errors.email && loginForm.touched.email ? inputErrCls : inputCls}
                    value={loginForm.values.email} onChange={e => loginForm.handleChange('email', e.target.value)} onBlur={() => loginForm.handleBlur('email')} />
                  {loginForm.errors.email && loginForm.touched.email && <p className="text-red-400 text-xs mt-1">{loginForm.errors.email}</p>}
                </Field>
                <Field label="Password">
                  <PwdInput show={showPwd} onToggle={() => setShowPwd(!showPwd)} placeholder="••••••••" autoComplete="current-password" disabled={isSubmitting}
                    value={loginForm.values.password} onChange={e => loginForm.handleChange('password', e.target.value)} onBlur={() => loginForm.handleBlur('password')} />
                  {loginForm.errors.password && loginForm.touched.password && <p className="text-red-400 text-xs mt-1">{loginForm.errors.password}</p>}
                </Field>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-border" /> Remember me
                  </label>
                  <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                </div>
              </>
            )}

            {mode === 'register' && step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Business name">
                    <input placeholder="Acme Coffee" autoComplete="organization" className={regForm.errors.shopName && regForm.touched.shopName ? inputErrCls : inputCls}
                      value={regForm.values.shopName} onChange={e => regForm.handleChange('shopName', e.target.value)} onBlur={() => regForm.handleBlur('shopName')} />
                    {regForm.errors.shopName && regForm.touched.shopName && <p className="text-red-400 text-xs mt-1">{regForm.errors.shopName}</p>}
                  </Field>
                  <Field label="Contact person">
                    <input placeholder="Jane Doe" autoComplete="name" className={regForm.errors.ownerName && regForm.touched.ownerName ? inputErrCls : inputCls}
                      value={regForm.values.ownerName} onChange={e => regForm.handleChange('ownerName', e.target.value)} onBlur={() => regForm.handleBlur('ownerName')} />
                    {regForm.errors.ownerName && regForm.touched.ownerName && <p className="text-red-400 text-xs mt-1">{regForm.errors.ownerName}</p>}
                  </Field>
                </div>
                <Field label="Email">
                  <input type="email" placeholder="you@shop.com" autoComplete="email" className={regForm.errors.email && regForm.touched.email ? inputErrCls : inputCls}
                    value={regForm.values.email} onChange={e => regForm.handleChange('email', e.target.value)} onBlur={() => regForm.handleBlur('email')} />
                  {regForm.errors.email && regForm.touched.email && <p className="text-red-400 text-xs mt-1">{regForm.errors.email}</p>}
                </Field>
                <Field label="Password">
                  <PwdInput show={showPwd} onToggle={() => setShowPwd(!showPwd)} placeholder="••••••••" autoComplete="new-password"
                    value={regForm.values.password} onChange={e => regForm.handleChange('password', e.target.value)} onBlur={() => regForm.handleBlur('password')} />
                  {regForm.errors.password && regForm.touched.password && <p className="text-red-400 text-xs mt-1">{regForm.errors.password}</p>}
                </Field>
                <Field label="Confirm password">
                  <PwdInput show={showPwd2} onToggle={() => setShowPwd2(!showPwd2)} placeholder="••••••••" autoComplete="new-password"
                    value={regForm.values.confirmPassword} onChange={e => regForm.handleChange('confirmPassword', e.target.value)} onBlur={() => regForm.handleBlur('confirmPassword')} />
                  {confirmErr && <p className="text-red-400 text-xs mt-1">{confirmErr}</p>}
                </Field>
              </>
            )}

            {mode === 'register' && step === 2 && (
              <>
                <Field label='Company number (ח"פ)'>
                  <input pattern="[0-9]{9}" maxLength={9} placeholder="123456789" inputMode="numeric" className={regForm.errors.companyNumber && regForm.touched.companyNumber ? inputErrCls : inputCls}
                    value={regForm.values.companyNumber} onChange={e => regForm.handleChange('companyNumber', e.target.value.replace(/\D/g, '').slice(0, 9))} onBlur={() => regForm.handleBlur('companyNumber')} />
                  {regForm.errors.companyNumber && regForm.touched.companyNumber && <p className="text-red-400 text-xs mt-1">{regForm.errors.companyNumber}</p>}
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Currency">
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Language">
                    <select value={language} onChange={e => setLanguage(e.target.value)} className={selectCls}>
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4 text-sm">
                  <p className="font-medium mb-1 text-foreground">What happens next?</p>
                  <p className="text-muted-foreground">We'll auto-provision your merchant account, link AllPay, and drop you into the dashboard. No paperwork, no calls.</p>
                </div>
              </>
            )}

            <div className="pt-2 flex items-center gap-3">
              {mode === 'register' && step === 2 && (
                <button type="button" onClick={() => setStep(1)} disabled={isSubmitting} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full border border-border text-foreground hover:bg-secondary transition-colors font-medium disabled:opacity-50">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button type="submit" disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center gap-1 rounded-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {mode === 'login' ? 'Sign in' : step === 1 ? 'Continue' : 'Create shop'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-8">
            {mode === 'login' ? "Don't have an account?" : 'Already have one?'}{' '}
            <button onClick={switchMode} className="text-primary hover:underline font-medium">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <div className="mt-8 glass rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install SB0 Pay</p>
              <p className="text-xs text-muted-foreground">Add to home screen for one-tap access.</p>
            </div>
            <button className="px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors">Install</button>
          </div>
        </div>
      </section>
    </main>
  );
};
