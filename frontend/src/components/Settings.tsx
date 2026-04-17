import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ApiKeyManagement } from './ApiKeyManagement';
import { User, Key, Palette, Sun, Moon } from 'lucide-react';

interface FormData { shopName: string; ownerName: string; email: string; companyNumber: string; currency: string; language: string; }

const currencies = [{ value: 'ILS', label: '₪ Israeli Shekel' }, { value: 'USD', label: '$ US Dollar' }, { value: 'EUR', label: '€ Euro' }, { value: 'UGX', label: 'USh Ugandan Shilling' }];
const languages = [{ value: 'he', label: 'עברית' }, { value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }, { value: 'ar', label: 'العربية' }];

type Tab = 'profile' | 'api' | 'appearance';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [form, setForm] = useState<FormData>({
    shopName: user?.shopName || '', ownerName: user?.ownerName || '', email: user?.email || '',
    companyNumber: user?.merchantConfig.companyNumber || '', currency: user?.merchantConfig.currency || 'ILS', language: user?.merchantConfig.language || 'he',
  });

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const cancel = () => { setForm({ shopName: user?.shopName || '', ownerName: user?.ownerName || '', email: user?.email || '', companyNumber: user?.merchantConfig.companyNumber || '', currency: user?.merchantConfig.currency || 'ILS', language: user?.merchantConfig.language || 'he' }); setEditing(false); setMsg(null); };
  const save = async () => {
    setSaving(true); setMsg(null);
    try { await updateUser({ shopName: form.shopName, ownerName: form.ownerName, email: form.email, merchantConfig: { companyNumber: form.companyNumber, currency: form.currency, language: form.language } }); setMsg({ type: 'success', text: 'Settings saved!' }); setEditing(false); }
    catch (e) { setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setSaving(false); }
  };

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof FormData; type?: string }) => (
    <div>
      <label className="text-sm text-foreground block mb-1.5">{label}</label>
      {editing ? <input type={type} value={form[field]} onChange={e => set(field, e.target.value)} className="input-field" /> : <p className="text-muted-foreground">{form[field] || '—'}</p>}
    </div>
  );

  const Select = ({ label, field, options }: { label: string; field: keyof FormData; options: { value: string; label: string }[] }) => (
    <div>
      <label className="text-sm text-foreground block mb-1.5">{label}</label>
      {editing ? <select value={form[field]} onChange={e => set(field, e.target.value)} className="input-field appearance-none">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <p className="text-muted-foreground">{options.find(o => o.value === form[field])?.label || form[field]}</p>}
    </div>
  );

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8"><h2 className="font-display text-3xl text-gradient mb-2">Settings</h2><p className="text-muted-foreground">Manage your shop, API access, and appearance</p></div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 p-1 rounded-full bg-secondary/50 max-w-sm mx-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4" /><span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────────── */}
      {tab === 'profile' && (
        <>
          {msg && <div className={`mb-6 p-4 rounded-xl border ${msg.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}><p className="text-sm font-medium">{msg.type === 'success' ? '✅' : '❌'} {msg.text}</p></div>}
          <div className="glass rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-foreground">Shop Information</h3>
              {!editing && <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit</button>}
            </div>
            <div className="space-y-4">
              <Field label="Shop Name" field="shopName" />
              <Field label="Owner Name" field="ownerName" />
              <Field label="Email" field="email" type="email" />
              <Field label='Company Number (ח"פ)' field="companyNumber" />
              <Select label="Currency" field="currency" options={currencies} />
              <Select label="Language" field="language" options={languages} />
            </div>
            {editing && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                <button onClick={save} disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={cancel} disabled={saving} className="flex-1 btn-secondary">Cancel</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── API Keys tab ─────────────────────────────────────────── */}
      {tab === 'api' && <ApiKeyManagement />}

      {/* ── Appearance tab ───────────────────────────────────────── */}
      {tab === 'appearance' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Theme</h3>
          <p className="text-sm text-muted-foreground mb-6">Choose how SB0 Pay looks for you.</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Light option */}
            <button
              onClick={() => { if (theme === 'dark') toggle(); }}
              className={`relative rounded-2xl border-2 p-5 text-left transition-all ${theme === 'light' ? 'border-primary shadow-glow' : 'border-border hover:border-primary/30'}`}
            >
              {theme === 'light' && <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"><svg className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <Sun className="h-5 w-5 text-amber-600" />
              </div>
              <p className="font-semibold text-foreground">Light</p>
              <p className="text-xs text-muted-foreground mt-1">Clean and bright interface</p>
              {/* Mini preview */}
              <div className="mt-4 rounded-lg overflow-hidden border border-border">
                <div className="h-2 bg-[hsl(210_20%_98%)]" />
                <div className="p-2 bg-[hsl(210_20%_98%)] space-y-1">
                  <div className="h-1.5 w-3/4 rounded bg-[hsl(215_20%_90%)]" />
                  <div className="h-1.5 w-1/2 rounded bg-[hsl(215_20%_90%)]" />
                  <div className="h-3 w-full rounded bg-[hsl(160_84%_39%)]" />
                </div>
              </div>
            </button>

            {/* Dark option */}
            <button
              onClick={() => { if (theme === 'light') toggle(); }}
              className={`relative rounded-2xl border-2 p-5 text-left transition-all ${theme === 'dark' ? 'border-primary shadow-glow' : 'border-border hover:border-primary/30'}`}
            >
              {theme === 'dark' && <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"><svg className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
              <div className="h-10 w-10 rounded-xl bg-indigo-900 flex items-center justify-center mb-3">
                <Moon className="h-5 w-5 text-indigo-300" />
              </div>
              <p className="font-semibold text-foreground">Dark</p>
              <p className="text-xs text-muted-foreground mt-1">Easy on the eyes, noir fintech</p>
              {/* Mini preview */}
              <div className="mt-4 rounded-lg overflow-hidden border border-border">
                <div className="h-2 bg-[hsl(160_20%_4%)]" />
                <div className="p-2 bg-[hsl(160_20%_4%)] space-y-1">
                  <div className="h-1.5 w-3/4 rounded bg-[hsl(160_15%_14%)]" />
                  <div className="h-1.5 w-1/2 rounded bg-[hsl(160_15%_14%)]" />
                  <div className="h-3 w-full rounded bg-[hsl(158_84%_45%)]" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
