import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { authService } from '../services/auth';
import logo from '../assets/logo.png';

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition';

type Step = 'email' | 'code' | 'done';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }

    setLoading(true);
    try {
      const result = await authService.forgotPassword(email.trim().toLowerCase());

      // If the backend returned a token, send it via EmailJS
      if (result.resetToken) {
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            to_email: result.email || email,
            to_name: result.ownerName || 'Merchant',
            reset_code: result.resetToken,
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        );
      }

      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (token.length !== 6) { setError('Reset code must be 6 digits'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await authService.resetPassword(email.trim().toLowerCase(), token, newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel — same as AuthPage */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-secondary/30 flex-col justify-between p-10">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="relative flex items-center gap-2.5">
          <img src={logo} alt="SB0 Pay" className="h-9 w-auto rounded-md" />
        </div>
        <div className="relative space-y-6 max-w-md">
          <h2 className="font-display text-5xl leading-tight">
            Reset your <span className="text-brand-gradient">password.</span>
          </h2>
          <p className="text-muted-foreground text-lg">We'll send a 6-digit code to your email. Enter it here to set a new password.</p>
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
            <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4">
              <p className="text-sm text-red-400">⚠️ {error}</p>
            </div>
          )}

          {/* Step 1: Enter email */}
          {step === 'email' && (
            <>
              <h1 className="font-display text-4xl mb-2">Forgot password?</h1>
              <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset code.</p>

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="you@shop.com"
                      autoComplete="email"
                      className={`${inputCls} pl-10`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send reset code'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {/* Step 2: Enter code + new password */}
          {step === 'code' && (
            <>
              <h1 className="font-display text-4xl mb-2">Enter reset code</h1>
              <p className="text-muted-foreground mb-8">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>. Check your inbox.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">Reset code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`${inputCls} pl-10 pr-10`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`${inputCls} pl-10`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Resetting…' : 'Reset password'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Didn't receive a code? Try again
                </button>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="font-display text-4xl">Password reset!</h1>
              <p className="text-muted-foreground">Your password has been updated. You can now sign in with your new password.</p>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-1 rounded-full h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors"
              >
                Sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
