import React, { useState, useEffect } from 'react';
import { apiKeyService } from '../services/apiKeyService';
import { ApiDocumentation } from './ApiDocumentation';
import { Key, Plus, Copy, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import type { ApiKey, ApiKeyWithSecret, CreateApiKeyRequest } from '../types/apiKey';

const resources = [
  { value: 'payments', label: 'Payments', desc: 'Create and manage payments' },
  { value: 'transactions', label: 'Transactions', desc: 'View transaction history' },
  { value: 'webhooks', label: 'Webhooks', desc: 'Manage webhook endpoints' },
  { value: 'profile', label: 'Profile', desc: 'Access user profile' },
] as const;
const actions = ['create', 'read', 'update', 'delete'] as const;

export const ApiKeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null);
  const [form, setForm] = useState<CreateApiKeyRequest>({ name: '', permissions: [], expiresAt: undefined });

  useEffect(() => { loadKeys(); }, []);
  const loadKeys = async () => { setLoading(true); try { setKeys(await apiKeyService.getApiKeys()); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); } };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const copy = (t: string) => navigator.clipboard.writeText(t);
  const getActions = (r: string) => form.permissions.find(p => p.resource === r)?.actions || [];
  const setPerms = (r: string, a: string[]) => setForm(p => ({ ...p, permissions: [...p.permissions.filter(x => x.resource !== r), ...(a.length ? [{ resource: r as any, actions: a as any }] : [])] }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required'); return; }
    if (!form.permissions.length) { setError('At least one permission required'); return; }
    try {
      setError('');
      let expiresAtISO: string | undefined;
      if (form.expiresAt) { const d = new Date(form.expiresAt); if (!isNaN(d.getTime())) expiresAtISO = d.toISOString(); }
      const k = await apiKeyService.createApiKey({ ...form, expiresAt: expiresAtISO });
      setNewKey(k); setForm({ name: '', permissions: [], expiresAt: undefined }); setShowForm(false); await loadKeys();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleDelete = async (id: string, name: string) => { if (!confirm(`Delete "${name}"?`)) return; try { await apiKeyService.deleteApiKey(id); await loadKeys(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } };
  const handleToggle = async (id: string, active: boolean) => { try { await apiKeyService.updateApiKey(id, { isActive: !active }); await loadKeys(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } };

  if (loading) return <div className="glass rounded-2xl p-8"><div className="animate-pulse space-y-3"><div className="h-4 bg-secondary rounded w-1/4" /><div className="h-4 bg-secondary rounded" /><div className="h-4 bg-secondary rounded w-5/6" /></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h3 className="text-lg font-semibold text-foreground">API Keys</h3><p className="text-sm text-muted-foreground">Manage programmatic access</p></div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 btn-primary text-sm"><Plus className="h-4 w-4" /> Create Key</button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-center justify-between"><p className="text-destructive text-sm">{error}</p><button onClick={() => setError('')} className="text-destructive hover:text-destructive/80"><X className="h-4 w-4" /></button></div>}

      {newKey && (
        <div className="glass rounded-2xl p-6 border border-primary/30">
          <div className="flex items-center gap-2 mb-3"><Key className="h-5 w-5 text-primary" /><h4 className="font-medium text-foreground">Key Created!</h4></div>
          <p className="text-xs text-muted-foreground mb-3">Save this key — it won't be shown again.</p>
          <div className="rounded-xl bg-card p-3 flex items-center justify-between gap-2 border border-border">
            <code className="text-xs font-mono text-foreground break-all">{newKey.key}</code>
            <button onClick={() => copy(newKey.key)} className="shrink-0 text-primary hover:text-primary/80"><Copy className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-primary hover:underline">I've saved it</button>
        </div>
      )}

      {showForm && (
        <div className="glass rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4">New API Key</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="text-sm text-foreground block mb-1.5">Name</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g. Production API" required /></div>
            <div><label className="text-sm text-foreground block mb-1.5">Expiration (optional)</label><input type="datetime-local" value={form.expiresAt || ''} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value || undefined }))} className="input-field" /></div>
            <div>
              <label className="text-sm text-foreground block mb-3">Permissions</label>
              <div className="space-y-3">
                {resources.map(r => (
                  <div key={r.value} className="rounded-xl bg-card border border-border p-4">
                    <div className="mb-2"><h5 className="font-medium text-foreground text-sm">{r.label}</h5><p className="text-xs text-muted-foreground">{r.desc}</p></div>
                    <div className="flex flex-wrap gap-2">
                      {actions.map(a => { const cur = getActions(r.value); const on = cur.includes(a); return (
                        <label key={a} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={on} onChange={e => setPerms(r.value, e.target.checked ? [...cur, a] : cur.filter(x => x !== a))} className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" /><span className="text-muted-foreground capitalize">{a}</span></label>
                      ); })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 btn-primary">Create</button>
              <button type="button" onClick={() => { setShowForm(false); setForm({ name: '', permissions: [], expiresAt: undefined }); }} className="flex-1 btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <h4 className="text-lg font-semibold text-foreground p-6 border-b border-border">Your Keys</h4>
        {keys.length === 0 ? (
          <div className="p-8 text-center"><Key className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><h5 className="font-medium text-foreground mb-1">No API Keys</h5><p className="text-muted-foreground text-sm mb-4">Create your first key to start integrating.</p><button onClick={() => setShowForm(true)} className="btn-primary">Create First Key</button></div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map(k => (
              <div key={k.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><h5 className="font-medium text-foreground text-sm">{k.name}</h5><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${k.isActive ? 'text-primary bg-primary/10 border-primary/20' : 'text-muted-foreground bg-secondary border-border'}`}>{k.isActive ? 'Active' : 'Inactive'}</span></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(k.id, k.isActive)} className="text-muted-foreground hover:text-foreground">{k.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}</button>
                    <button onClick={() => handleDelete(k.id, k.name)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><code className="bg-card px-1.5 py-0.5 rounded font-mono">{k.prefix}••••••••</code></p>
                  <p>Created {fmtDate(k.createdAt)}{k.lastUsedAt ? ` · Last used ${fmtDate(k.lastUsedAt)}` : ''}{k.expiresAt ? ` · Expires ${fmtDate(k.expiresAt)}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">{k.permissions.map((p, i) => <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">{p.resource}: {p.actions.join(', ')}</span>)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ApiDocumentation />
    </div>
  );
};
