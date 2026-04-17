import React, { useState } from 'react';

const examples: Record<string, string> = {
  curl: `curl -X POST https://api.sb0pay.com/api/v1/payments \\
  -H "Authorization: Bearer sb0_live_•••" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":100.50,"currency":"ILS","description":"Order #12345"}'`,
  javascript: `const res = await fetch('https://api.sb0pay.com/api/v1/payments', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sb0_live_•••', 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100.50, currency: 'ILS', description: 'Order #12345' })
});
const payment = await res.json();`,
  python: `import requests
r = requests.post('https://api.sb0pay.com/api/v1/payments',
  headers={'Authorization': 'Bearer sb0_live_•••', 'Content-Type': 'application/json'},
  json={'amount': 100.50, 'currency': 'ILS', 'description': 'Order #12345'})
payment = r.json()`,
};

export const ApiDocumentation: React.FC = () => {
  const [lang, setLang] = useState<string>('curl');
  return (
    <div className="glass rounded-2xl p-6 border border-primary/20">
      <h4 className="text-lg font-semibold text-foreground mb-4">🚀 Quick Start</h4>
      <div className="space-y-4 text-sm">
        <div><h5 className="font-medium text-foreground mb-1">1. Create an API Key</h5><p className="text-muted-foreground">Click "Create API Key" above and select permissions.</p></div>
        <div>
          <h5 className="font-medium text-foreground mb-2">2. Make Your First Call</h5>
          <div className="flex gap-1 mb-3">{Object.keys(examples).map(l => <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${lang === l ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{l === 'curl' ? 'cURL' : l === 'javascript' ? 'JS' : 'Python'}</button>)}</div>
          <div className="rounded-xl overflow-hidden glass">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/40"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-destructive/60" /><div className="h-2.5 w-2.5 rounded-full bg-primary/60" /><div className="h-2.5 w-2.5 rounded-full bg-primary" /></div></div>
            <pre className="p-4 text-xs font-mono text-foreground/90 overflow-x-auto"><code>{examples[lang]}</code></pre>
          </div>
        </div>
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div><h5 className="font-medium text-foreground">Need more?</h5><p className="text-muted-foreground text-xs">Full API documentation available.</p></div>
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">View Docs</a>
        </div>
      </div>
    </div>
  );
};
