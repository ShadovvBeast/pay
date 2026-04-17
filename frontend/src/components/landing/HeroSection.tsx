import { Link } from "react-router-dom";
import { ArrowRight, QrCode, Sparkles, Shield, Globe } from "lucide-react";
import heroPhone from "../../assets/hero-phone.png";

export default function HeroSection() {
  return (
    <section className="relative pt-36 pb-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[140px] pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Text + CTA */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Now with installable PWA &amp; open API</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
            <span className="text-gradient">Get paid in</span><br />
            <em className="text-brand-gradient not-italic">one scan.</em>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            SB0 Pay turns any phone into a point of sale. Type an amount, show a QR,
            and the payment lands — in shekels, dollars, euros or shillings.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-1 rounded-full h-12 px-7 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors group">
              Start accepting payments
              <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#product" className="inline-flex items-center gap-2 rounded-full h-12 px-6 text-foreground hover:bg-secondary transition-colors font-medium">
              <QrCode className="h-4 w-4" /> See it in action
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">Free to start · No card reader · Apple Pay, Bit &amp; cards supported</p>
        </div>

        {/* Hero phone visual */}
        <div className="relative mt-20 flex justify-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {/* Glow behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] rounded-full bg-primary/20 blur-[100px]" aria-hidden />

          {/* Phone image */}
          <div className="relative">
            <img
              src={heroPhone}
              alt="SB0 Pay mobile payment interface showing a QR code"
              width={640}
              height={960}
              className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] lg:w-[400px] drop-shadow-2xl animate-float"
            />

            {/* Floating badge — top left */}
            <div className="absolute -left-4 sm:-left-16 top-1/4 hidden sm:flex glass rounded-2xl px-4 py-3 shadow-elegant items-center gap-3 animate-float z-20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
                <div className="text-sm font-medium text-foreground">Awaiting scan…</div>
              </div>
            </div>

            {/* Floating badge — bottom right */}
            <div className="absolute -right-4 sm:-right-20 bottom-1/4 hidden sm:flex glass rounded-2xl px-4 py-3 shadow-elegant items-center gap-3 animate-float z-20" style={{ animationDelay: "1.5s" }}>
              <div className="text-2xl font-display text-foreground">₪250</div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary">Paid</div>
                <div className="text-xs text-muted-foreground">Visa •••• 4242</div>
              </div>
            </div>

            {/* Floating badge — PCI secure */}
            <div className="absolute -left-8 sm:-left-24 bottom-1/3 hidden md:flex glass rounded-2xl px-3 py-2 shadow-elegant items-center gap-2 animate-float z-20" style={{ animationDelay: "0.8s" }}>
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <Shield className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">PCI Secure</span>
            </div>

            {/* Floating badge — currencies */}
            <div className="absolute -right-6 sm:-right-20 top-1/3 hidden md:flex glass rounded-2xl px-3 py-2 shadow-elegant items-center gap-2 animate-float z-20" style={{ animationDelay: "2s" }}>
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <Globe className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">4 Currencies</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
