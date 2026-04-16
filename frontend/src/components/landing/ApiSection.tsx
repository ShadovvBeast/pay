import { motion } from "framer-motion";
import { Code2, Key, Webhook, Book } from "lucide-react";
import apiIllustration from "../../assets/api-illustration.png";
import { useState } from "react";

const codeExamples = {
  javascript: `// Create a payment with SB0 Pay API
const response = await fetch('https://api.sb0pay.com/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sb0_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 150.00,
    currency: 'USD',
    items: [{ name: 'Product', price: 150, quantity: 1 }],
    success_url: 'https://yoursite.com/success',
    webhook_url: 'https://yoursite.com/webhook',
  }),
});

const { payment_url, qr_code } = await response.json();`,
  python: `# Create a payment with SB0 Pay API
import requests

response = requests.post(
    'https://api.sb0pay.com/v1/payments',
    headers={
        'Authorization': 'Bearer sb0_live_...',
        'Content-Type': 'application/json',
    },
    json={
        'amount': 150.00,
        'currency': 'USD',
        'items': [{'name': 'Product', 'price': 150, 'quantity': 1}],
        'success_url': 'https://yoursite.com/success',
        'webhook_url': 'https://yoursite.com/webhook',
    }
)

data = response.json()
payment_url = data['payment_url']`,
  curl: `# Create a payment with SB0 Pay API
curl -X POST https://api.sb0pay.com/v1/payments \\
  -H "Authorization: Bearer sb0_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 150.00,
    "currency": "USD",
    "items": [{"name": "Product", "price": 150, "quantity": 1}],
    "success_url": "https://yoursite.com/success",
    "webhook_url": "https://yoursite.com/webhook"
  }'`,
};

const ApiSection = () => {
  const [lang, setLang] = useState<"javascript" | "python" | "curl">("javascript");

  return (
    <section id="api" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30, filter: "blur(8px)" }} whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }} viewport={{ once: false, amount: 0.2 }} transition={{ type: "spring", stiffness: 80, damping: 15 }}>
            <span className="inline-block text-sm font-medium text-accent mb-3 tracking-wider uppercase bg-accent/10 px-4 py-1 rounded-full">Developer API</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Build on SB0 Pay</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">Integrate payments into your platform with our RESTful API. Create payments, manage refunds, and receive webhooks — all programmatically.</p>

            <motion.img src={apiIllustration} alt="API Development" loading="lazy" width={800} height={600} className="w-64 mx-auto lg:mx-0 mb-8 drop-shadow-xl hidden lg:block" initial={{ opacity: 0, y: 30, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 100, damping: 15 }} whileHover={{ scale: 1.08, rotate: 2 }} />

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Key, label: "Granular API Keys", desc: "Fine-grained permissions" },
                { icon: Webhook, label: "Webhooks", desc: "Real-time notifications" },
                { icon: Code2, label: "Code Samples", desc: "cURL, JS, Python" },
                { icon: Book, label: "OpenAPI Spec", desc: "Auto-generate clients" },
              ].map(({ icon: Icon, label, desc }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 20, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 120, damping: 12, delay: i * 0.08 }} whileHover={{ scale: 1.05, y: -3 }} className="flex items-start gap-3 p-4 rounded-xl bg-secondary border border-border/50 hover:border-accent/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40, rotateY: -5 }} whileInView={{ opacity: 1, x: 0, rotateY: 0 }} viewport={{ once: false, amount: 0.2 }} transition={{ type: "spring", stiffness: 80, damping: 15 }}>
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl">
              <div className="bg-primary px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-primary-foreground/50 ml-2 font-mono">create-payment</span>
                </div>
                <div className="flex gap-1">
                  {(["javascript", "python", "curl"] as const).map((l) => (
                    <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${lang === l ? "bg-accent text-white" : "text-primary-foreground/40 hover:text-primary-foreground/70"}`}>
                      {l === "javascript" ? "JS" : l === "python" ? "Python" : "cURL"}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="bg-primary/95 p-6 overflow-x-auto text-sm leading-relaxed max-h-[400px]">
                <code className="text-primary-foreground/80 font-mono whitespace-pre">{codeExamples[lang]}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ApiSection;
