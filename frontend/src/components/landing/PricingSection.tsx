import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import glow from "../../assets/abstract-glow.jpg";

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative rounded-[2.5rem] overflow-hidden border border-border shadow-elegant">
          <img src={glow} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="relative px-8 py-20 md:py-28 text-center">
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1] text-gradient max-w-3xl mx-auto">
              Your next sale is one<br /><em className="text-brand-gradient not-italic">QR away.</em>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg max-w-xl mx-auto">Free during setup. Pay only when your customers do.</p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth" className="inline-flex items-center gap-1 rounded-full h-12 px-7 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-medium transition-colors">
                Create your account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
              <a href="#" className="inline-flex items-center rounded-full h-12 px-6 text-foreground hover:bg-secondary transition-colors font-medium">Talk to us</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
