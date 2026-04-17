import { Pencil, ScanLine, CheckCircle2 } from "lucide-react";
import merchantImg from "../../assets/merchant.jpg";

const steps = [
  { icon: Pencil, title: "Type the amount", desc: "Big touch keypad. Quick buttons for 10, 50, 100." },
  { icon: ScanLine, title: "Show the QR", desc: "Customer scans, picks card / Apple Pay / Bit." },
  { icon: CheckCircle2, title: "Get the green check", desc: "Status updates live. Receipt ready instantly." },
];

export default function HowItWorksSection() {
  return (
    <section id="product" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" aria-hidden />
          <div className="relative rounded-[2rem] overflow-hidden shadow-elegant border border-border">
            <img src={merchantImg} alt="Shop owner accepting a mobile payment" loading="lazy" width={1280} height={960} className="w-full h-[500px] object-cover" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-4">How it works</div>
          <h2 className="font-display text-4xl md:text-5xl leading-tight text-gradient mb-6">Three taps from amount to paid.</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-lg">No card reader. No training. The whole loop fits inside one screen so you can keep your eyes on the customer, not the software.</p>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.title} className="group flex gap-5 p-5 rounded-2xl border border-transparent hover:border-border hover:bg-card/50 transition-all">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-secondary border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
