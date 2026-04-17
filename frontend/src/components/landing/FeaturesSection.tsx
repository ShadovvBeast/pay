import { motion } from "framer-motion";
import { QrCode, CreditCard, BarChart3, Globe, Smartphone, Shield, Zap, Code2 } from "lucide-react";
import securityImg from "../../assets/security-illustration.png";
import globalImg from "../../assets/global-payments.png";

const features = [
  { icon: QrCode, title: "QR Code Payments", description: "Generate payment QR codes instantly. Customers scan, pay, and you're done.", color: "from-accent/20 to-accent/5" },
  { icon: CreditCard, title: "Multiple Payment Methods", description: "Accept credit cards, Apple Pay, and Bit — whatever your customers prefer.", color: "from-blue-500/20 to-blue-500/5" },
  { icon: BarChart3, title: "Transaction Tracking", description: "Full history with details, refund capabilities, and real-time status updates.", color: "from-amber-500/20 to-amber-500/5" },
  { icon: Globe, title: "Multi-Currency Support", description: "Support for ILS, USD, EUR, and UGX currencies out of the box.", color: "from-accent/20 to-accent/5" },
  { icon: Smartphone, title: "Mobile-First PWA", description: "Install on your phone's home screen. Works offline. Loads instantly.", color: "from-blue-500/20 to-blue-500/5" },
  { icon: Shield, title: "Secure by Design", description: "PCI-compliant payment processing. You never touch sensitive card data.", color: "from-green-500/20 to-green-500/5" },
  { icon: Zap, title: "Real-Time Updates", description: "Automatic payment status polling. Know the moment a payment completes.", color: "from-amber-500/20 to-amber-500/5" },
  { icon: Code2, title: "Developer API", description: "Full REST API with granular permissions. Integrate payments anywhere.", color: "from-accent/20 to-accent/5" },
];

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <motion.span initial={{ opacity: 0, scale: 0.6, y: 10 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="inline-block text-sm font-medium text-accent mb-3 tracking-wider uppercase bg-accent/10 px-4 py-1 rounded-full">
            Features
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">A complete payment solution that fits in your pocket. No hardware, no complexity.</p>
        </motion.div>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.15 }}>
          {features.map((feature) => (
            <motion.div key={feature.title} variants={cardVariants} whileHover={{ y: -8, scale: 1.02 }} className="group relative p-6 rounded-2xl border border-border bg-card hover:border-accent/30 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }} className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-accent" />
                </motion.div>
                <h3 className="font-display font-semibold text-card-foreground mb-2 text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -50, rotateY: 5 }} whileInView={{ opacity: 1, x: 0, rotateY: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 80, damping: 15 }} className="relative rounded-3xl bg-primary p-8 lg:p-12 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold text-primary-foreground mb-3">Bank-Grade Security</h3>
                <p className="text-primary-foreground/60 leading-relaxed">Your payment data flows through PCI-compliant infrastructure. SB0 Pay never sees or stores credit card numbers.</p>
              </div>
              <motion.img src={securityImg} alt="Security" loading="lazy" width={800} height={600} className="w-48 lg:w-56 drop-shadow-2xl" whileHover={{ scale: 1.08, rotate: 3 }} transition={{ type: "spring" }} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50, rotateY: -5 }} whileInView={{ opacity: 1, x: 0, rotateY: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 80, damping: 15 }} className="relative rounded-3xl bg-card border border-border p-8 lg:p-12 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold text-card-foreground mb-3">Multi-Currency Payments</h3>
                <p className="text-muted-foreground leading-relaxed">Accept payments in Israeli Shekel, US Dollar, Euro, or Ugandan Shilling. One platform, global reach.</p>
              </div>
              <motion.img src={globalImg} alt="Global Payments" loading="lazy" width={800} height={600} className="w-48 lg:w-56 drop-shadow-2xl" whileHover={{ scale: 1.08, rotate: -3 }} transition={{ type: "spring" }} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
