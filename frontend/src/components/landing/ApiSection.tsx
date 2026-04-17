import { Terminal, Key, Webhook, BookOpen } from "lucide-react";

const code = `curl https://api.sb0pay.com/v1/payments \\
  -H "Authorization: Bearer sb0_live_•••" \\
  -d amount=250.00 \\
  -d currency=ILS \\
  -d customer_email="dana@shop.co"
# →  { "id": "pay_8k3…", "qr": "https://…", "status": "pending" }`;

export default function ApiSection() {
  return (
    <section id="developers" className="relative py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-5 gap-12 items-center">
        <div className="lg:col-span-2">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" /> For developers
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-tight text-gradient mb-6">An API your storefront will love.</h2>
          <p className="text-muted-foreground text-lg mb-8">Issue scoped keys, accept payments from any platform, and let webhooks keep your system in perfect sync.</p>
          <ul className="space-y-3 mb-8">
            {[
              { icon: Key, label: "Granular API keys with per-resource permissions" },
              { icon: Webhook, label: "Real-time webhooks for every status change" },
              { icon: BookOpen, label: "OpenAPI 3.0 spec, cURL / JS / Python samples" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm">
                <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{label}</span>
              </li>
            ))}
          </ul>
          <a href="#" className="inline-flex px-5 py-2.5 rounded-full border border-border bg-secondary/40 hover:bg-secondary text-sm font-medium transition-colors">Read the API docs</a>
        </div>
        <div className="lg:col-span-3">
          <div className="relative rounded-3xl overflow-hidden glass shadow-elegant">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card/40">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/80" />
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="flex-1 text-center text-xs font-mono text-muted-foreground">~ sb0-pay</div>
            </div>
            <pre className="p-6 md:p-8 text-xs md:text-sm font-mono leading-relaxed text-foreground/90 overflow-x-auto"><code>{code}</code></pre>
            <div className="absolute -inset-px rounded-3xl pointer-events-none bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-30" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
