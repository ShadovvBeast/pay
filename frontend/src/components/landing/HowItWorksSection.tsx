import { motion } from "framer-motion";
import { DollarSign, QrCode, ScanLine, CheckCircle2 } from "lucide-react";
import qrIllustration from "../../assets/qr-payment-illustration.png";

const steps = [
  { icon: DollarSign, number: "01", title: "Enter Amount", description: "Type the payment amount on your phone. Quick-select buttons make it even faster." },
  { icon: QrCode, number: "02", title: "Show QR Code", description: "A unique QR code is generated instantly. Show it to your customer." },
  { icon: ScanLine, number: "03", title: "Customer Scans", description: "Customer scans with their phone camera and pays via card, Apple Pay, or Bit." },
  { icon: CheckCircle2, number: "04", title: "Payment Complete", description: "You get instant confirmation. The transaction is recorded automatically." },
];

const stepsContainerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const stepVariants = {
  hidden: { opacity: 0, x: 40, filter: "blur(6px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/[0.03] rounded-full blur-3xl" animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(hsl(160 84% 39%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 84% 39%) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -50, scale: 0.9, rotate: -3 }} whileInView={{ opacity: 1, x: 0, scale: 1, rotate: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 70, damping: 15 }} className="flex justify-center order-2 lg:order-1">
            <motion.div className="relative" whileHover={{ scale: 1.03 }} transition={{ type: "spring" }}>
              <motion.div className="absolute inset-0 bg-accent/10 rounded-full blur-[80px] scale-90" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ delay: 0.3 }} />
              <img src={qrIllustration} alt="QR Payment Process" loading="lazy" width={800} height={800} className="relative z-10 w-[350px] lg:w-[420px] drop-shadow-2xl animate-float" />
            </motion.div>
          </motion.div>

          <div className="order-1 lg:order-2">
            <motion.div initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7 }} className="mb-12">
              <span className="inline-block text-sm font-medium text-accent mb-3 tracking-wider uppercase bg-accent/10 px-4 py-1 rounded-full">How It Works</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4">Four Simple Steps</h2>
              <p className="text-lg text-primary-foreground/50">From amount to confirmation in under 30 seconds.</p>
            </motion.div>

            <motion.div className="space-y-6" variants={stepsContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.2 }}>
              {steps.map((step, index) => (
                <motion.div key={step.title} variants={stepVariants} whileHover={{ x: 8 }} className="flex gap-5 group">
                  <div className="relative shrink-0">
                    <motion.div whileHover={{ scale: 1.15, rotate: 5 }} className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 group-hover:shadow-glow transition-all duration-300">
                      <step.icon className="w-7 h-7 text-accent" />
                    </motion.div>
                    <motion.span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shadow-lg" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: false }} transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.2 + index * 0.15 }}>
                      {step.number}
                    </motion.span>
                    {index < steps.length - 1 && (
                      <motion.div className="absolute top-16 left-1/2 -translate-x-1/2 w-px h-6 bg-gradient-to-b from-accent/30 to-transparent" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: false }} transition={{ delay: 0.3 + index * 0.15 }} style={{ transformOrigin: "top" }} />
                    )}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-display font-semibold text-primary-foreground text-lg mb-1">{step.title}</h3>
                    <p className="text-sm text-primary-foreground/50 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
