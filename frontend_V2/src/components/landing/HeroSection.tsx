import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, Globe, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroPhone from "@/assets/hero-phone.png";
import { useEffect, useState } from "react";

const stats = [
  { icon: TrendingUp, value: "99.9%", label: "Uptime" },
  { icon: Users, value: "10K+", label: "Merchants" },
  { icon: Zap, value: "<2s", label: "Payment Speed" },
];

const FloatingParticle = ({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-accent/20"
    style={{ left: x, top: y, width: size, height: size }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.2, 0.6, 0.2],
      scale: [1, 1.3, 1],
    }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const HeroSection = () => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMouseX((e.clientX / window.innerWidth - 0.5) * 20);
      setMouseY((e.clientY / window.innerHeight - 0.5) * 20);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <section className="relative min-h-screen bg-hero overflow-hidden flex items-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/2 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <FloatingParticle delay={0} x="10%" y="20%" size={8} />
        <FloatingParticle delay={0.5} x="80%" y="30%" size={6} />
        <FloatingParticle delay={1} x="30%" y="70%" size={10} />
        <FloatingParticle delay={1.5} x="70%" y="60%" size={5} />
        <FloatingParticle delay={2} x="50%" y="15%" size={7} />
        <FloatingParticle delay={2.5} x="20%" y="80%" size={9} />
        <FloatingParticle delay={0.8} x="90%" y="75%" size={6} />
        <FloatingParticle delay={1.2} x="60%" y="85%" size={8} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(160 84% 39%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 84% 39%) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Accept payments in seconds</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6"
            >
              The Simplest Way to{" "}
              <span className="text-gradient relative">
                Get Paid
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-accent rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-lg sm:text-xl text-primary-foreground/60 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Enter an amount. Show a QR code. Get paid instantly. SB0 Pay turns your phone into a powerful point of sale system.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow text-base px-8 h-12 group"
                asChild
              >
                <Link to="/signup">
                  Start Accepting Payments
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8 h-12"
                asChild
              >
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="flex items-center gap-8 justify-center lg:justify-start"
            >
              {stats.map(({ icon: Icon, value, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary-foreground">{value}</p>
                    <p className="text-xs text-primary-foreground/40">{label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - Hero phone with parallax */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
            style={{ perspective: "1000px" }}
          >
            <motion.div
              className="relative"
              style={{ x: springX, y: springY }}
            >
              <motion.div
                className="absolute inset-0 bg-accent/20 rounded-full blur-[100px] scale-75"
                animate={{ scale: [0.75, 0.85, 0.75], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <img
                src={heroPhone}
                alt="SB0 Pay mobile payment interface"
                className="relative z-10 w-[320px] sm:w-[380px] lg:w-[420px] animate-float drop-shadow-2xl"
                width={640}
                height={960}
              />
              {/* Floating badges around phone */}
              <motion.div
                className="absolute -left-8 top-1/4 bg-card/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-border/50 z-20"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-success" />
                  </div>
                  <span className="text-xs font-medium text-card-foreground">PCI Secure</span>
                </div>
              </motion.div>
              <motion.div
                className="absolute -right-4 top-2/3 bg-card/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-border/50 z-20"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <Globe className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-card-foreground">4 Currencies</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
