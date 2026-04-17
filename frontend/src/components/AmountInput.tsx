import React, { useState, useEffect, useRef } from 'react';
import { AmountInputProps } from '../types/payment';

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };
const NAME: Record<string, string> = { ILS: 'Israeli Shekel', USD: 'US Dollar', EUR: 'Euro', UGX: 'Ugandan Shilling' };

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, onSubmit, currency, isLoading = false, error, autoFocus = true }) => {
  const [display, setDisplay] = useState(value);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const sym = SYM[currency] || currency;

  useEffect(() => { setDisplay(value); }, [value]);
  useEffect(() => { if (autoFocus && ref.current && !isLoading) ref.current.focus(); }, [autoFocus, isLoading]);

  const validate = (v: string) => {
    if (!v?.trim()) return 'Amount is required';
    const n = parseFloat(v.replace(/[^\d.]/g, ''));
    if (isNaN(n)) return 'Enter a valid amount';
    if (n <= 0) return 'Must be greater than 0';
    if (n > 999999.99) return 'Cannot exceed 999,999.99';
    const dec = v.split('.')[1];
    if (dec && dec.length > 2) return 'Max 2 decimal places';
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d.]/g, '');
    if ((v.match(/\./g) || []).length > 1) return;
    const parts = v.split('.');
    if (parts[1]?.length > 2) v = `${parts[0]}.${parts[1].slice(0, 2)}`;
    setDisplay(v); onChange(v); setTouched(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(display)) return;
    onSubmit(parseFloat(display.replace(/[^\d.]/g, '')));
  };

  const vErr = touched ? validate(display) : null;
  const isValid = !vErr && display.trim() !== '';
  const showErr = error || (touched && vErr);

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-2">
          <div className="text-5xl font-display text-primary mb-1">{sym}</div>
          <p className="text-xs text-muted-foreground">{NAME[currency] || currency}</p>
        </div>

        <div className="relative">
          <input ref={ref} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0.00" disabled={isLoading} autoComplete="off"
            className={`w-full text-center text-4xl font-bold py-6 px-4 rounded-2xl border-2 bg-card text-foreground transition-all min-h-[80px] focus:outline-none
              ${focused ? 'border-primary ring-4 ring-primary/20' : 'border-border'}
              ${showErr ? 'border-destructive ring-4 ring-destructive/20' : ''}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            value={display} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={e => { if (!/^[0-9.]$/.test(e.key) && !['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','Home','End','Enter'].includes(e.key) && !(e.ctrlKey && 'acvx'.includes(e.key))) e.preventDefault(); }} />
          {showErr && <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"><p className="text-destructive text-sm text-center">{error || vErr}</p></div>}
          {display && !vErr && !error && <p className="mt-3 text-center text-lg font-semibold text-muted-foreground">{sym}{parseFloat(display || '0').toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>}
        </div>

        <button type="submit" disabled={!isValid || isLoading}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all min-h-[60px] ${isValid && !isLoading ? 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}>
          {isLoading ? <span className="flex items-center justify-center gap-2"><span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />Creating…</span> : 'Create Payment'}
        </button>

        <div className="grid grid-cols-3 gap-3">
          {[10, 50, 100].map(q => (
            <button key={q} type="button" disabled={isLoading} onClick={() => { setDisplay(String(q)); onChange(String(q)); setTouched(true); }}
              className="py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors">{sym}{q}</button>
          ))}
        </div>
      </form>
    </div>
  );
};
