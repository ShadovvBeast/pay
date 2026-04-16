import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter", price: "Free", period: "", description: "Perfect for small shops just getting started",
    features: ["Up to 50 transactions/month", "QR code payments", "Basic transaction history", "1 API key", "Email support"],
    cta: "Get Started Free", highlighted: false,
  },
  {
    name: "Business", price: "$29", period: "/month", description: "For growing businesses that need more power",
    features: ["Unlimited transactions", "QR code payments", "Full transaction history", "10 API keys", "Refund management", "Webhook notifications", "Priority support", "Multi-language support"],
    cta: "Start Free Trial", highlighted: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "", description: "For large operations with custom needs",
    features: ["Everything in Business", "Unlimited API keys", "Custom integrations", "Dedicated account manager", "SLA guarantee", "White-label options"],
    cta: "Contact Sales", highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-secondary/50 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl -translate-y-1/2" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <span className="inline-block text-sm font-medium text-accent mb-3 tracking-wider uppercase bg-accent/10 px-4 py-1 rounded-full">Pricing</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start free. Scale as you grow. No hidden fees.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 40, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: plan.highlighted ? 1.05 : 1 }} viewport={{ once: false, amount: 0.2 }} transition={{ type: "spring", stiffness: 100, damping: 15, delay: index * 0.1 }} whileHover={{ y: -10, scale: plan.highlighted ? 1.08 : 1.03 }}
              className={`relative rounded-2xl p-8 transition-shadow duration-300 ${plan.highlighted ? "bg-primary text-primary-foreground border-2 border-accent shadow-glow scale-105" : "bg-card text-card-foreground border border-border hover:shadow-xl"}`}
            >
              {plan.highlighted && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </motion.div>
              )}
              <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className={`block w-full text-center py-2.5 rounded-lg font-medium transition-colors ${plan.highlighted ? "bg-accent text-white hover:bg-accent/90 shadow-glow" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
