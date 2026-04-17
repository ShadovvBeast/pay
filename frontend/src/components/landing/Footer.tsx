import { motion } from "framer-motion";
import { QrCode, ArrowRight, Smartphone, Bell } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary relative overflow-hidden">
      {/* Mobile Money Coming Soon Banner */}
      <div className="border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 100, damping: 15 }} className="relative rounded-2xl bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 border border-accent/20 p-8 lg:p-10 text-center overflow-hidden">
            <motion.div className="absolute inset-0 bg-accent/5" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-accent" />
                </motion.div>
              </div>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-primary-foreground mb-3">Mobile Money is Coming Soon! 🚀</h3>
              <p className="text-primary-foreground/60 max-w-xl mx-auto mb-6 leading-relaxed">We're building support for M-Pesa, MTN Mobile Money, Airtel Money, and more. Accept mobile payments from customers across Africa and beyond.</p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 font-medium text-sm transition-colors">
                <Bell className="w-4 h-4" />
                Stay Tuned for Updates
              </button>
              <div className="flex items-center justify-center gap-6 mt-6">
                {["M-Pesa", "MTN MoMo", "Airtel Money", "Tigo Pesa"].map((name) => (
                  <span key={name} className="text-xs text-primary-foreground/30 font-medium">{name}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 30, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.7 }}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-4">Ready to Get Paid?</h2>
            <p className="text-lg text-primary-foreground/50 max-w-lg mx-auto mb-8">Join thousands of merchants who've simplified their payment process with SB0 Pay.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 bg-accent text-white hover:bg-accent/90 shadow-glow text-base px-8 h-12 rounded-lg font-medium transition-colors group">
              Start Free Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Footer links */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-primary-foreground">SB0 Pay</span>
            </div>
            <p className="text-sm text-primary-foreground/50 leading-relaxed">The simplest way to accept payments. Turn your phone into a point of sale.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "Pricing", "API", "Documentation"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
          ].map((group) => (
            <div key={group.title}>
              <h4 className="font-display font-semibold text-primary-foreground mb-4">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-primary-foreground/10 pt-8 text-center">
          <p className="text-sm text-primary-foreground/40">© {new Date().getFullYear()} SB0 Pay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
