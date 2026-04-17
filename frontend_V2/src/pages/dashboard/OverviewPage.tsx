import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Store, Globe, CreditCard, List, Settings,
  CheckCircle2, TrendingUp, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockTransactions, currencySymbols, containerVariants, itemVariants } from "@/lib/dashboard-data";

const OverviewPage = () => {
  const navigate = useNavigate();
  const currency = "USD";
  const symbol = currencySymbols[currency];

  const todayTotal = mockTransactions
    .filter(t => t.status === "completed" && t.createdAt.startsWith("2026-03-30"))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <motion.div
      key="overview"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Hero CTA */}
      <motion.div variants={itemVariants}>
        <Button
          className="w-full h-16 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow rounded-2xl group relative overflow-hidden"
          onClick={() => navigate("/dashboard/payment")}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-foreground/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <Plus className="w-6 h-6 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Create Payment
        </Button>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <ArrowUpRight className="w-3 h-3 text-success" />
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{symbol}{todayTotal.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Today's Revenue</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-display font-bold text-card-foreground">{mockTransactions.length}</p>
          <p className="text-xs text-muted-foreground">Total Transactions</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">
            {mockTransactions.filter(t => t.status === "completed").length}
          </p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-5 hover:border-accent/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-card-foreground">Shop Info</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Shop</span><span className="text-card-foreground font-medium">My Shop</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-card-foreground font-medium">John Doe</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-card-foreground font-medium">john@shop.com</span></div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-5 hover:border-accent/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-card-foreground">Configuration</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Reg. Number</span><span className="text-card-foreground font-mono">123456789</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="text-card-foreground">$ USD</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Language</span><span className="text-card-foreground">English</span></div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-card rounded-2xl border border-border p-5 hover:border-accent/30 hover:shadow-lg transition-all duration-300">
          <h3 className="font-display font-semibold text-card-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "Create Payment", icon: CreditCard, path: "/dashboard/payment" },
              { label: "View Transactions", icon: List, path: "/dashboard/transactions" },
              { label: "Settings", icon: Settings, path: "/dashboard/settings" },
            ].map(({ label, icon: Icon, path }) => (
              <motion.div key={label} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" size="sm" className="w-full justify-start hover:border-accent/30" onClick={() => navigate(path)}>
                  <Icon className="w-4 h-4 mr-2" /> {label}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OverviewPage;
