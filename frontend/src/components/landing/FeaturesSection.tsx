import { QrCode, Smartphone, Globe, ShieldCheck, Code2, Wifi } from "lucide-react";

const features = [
  { icon: QrCode, title: "QR-first checkout", desc: "Enter an amount, show the code. Customers scan and pay with cards, Apple Pay or Bit." },
  { icon: Smartphone, title: "Installable PWA", desc: "Add SB0 Pay to your home screen. Native feel, no app store, instant updates." },
  { icon: Wifi, title: "Works offline", desc: "Lost signal? Payments queue locally and sync the moment you're back online." },
  { icon: Globe, title: "4 languages, 4 currencies", desc: "Hebrew, English, Russian, Arabic. ILS, USD, EUR, UGX — RTL handled gracefully." },
  { icon: Code2, title: "Public REST API", desc: "Issue scoped API keys, integrate any storefront, manage refunds programmatically." },
  { icon: ShieldCheck, title: "PCI handled for you", desc: "Card data flows through AllPay. SB0 Pay never sees a number you wouldn't want stored." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Built for the counter</div>
          <h2 className="font-display text-4xl md:text-6xl leading-tight text-gradient">A register that fits in a pocket.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={f.title} className="group relative rounded-3xl bg-gradient-card border border-border p-7 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
