import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, LogOut, LayoutDashboard, CreditCard, List, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { path: "/dashboard/payment", icon: CreditCard, label: "Payment" },
  { path: "/dashboard/transactions", icon: List, label: "History" },
  { path: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const isOverview = location.pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-xl border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"
              >
                <QrCode className="w-5 h-5 text-accent-foreground" />
              </motion.div>
              <span className="font-display font-bold text-primary-foreground">SB0 Pay</span>
            </Link>
            {!isOverview && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <Link
                  to="/dashboard"
                  className="text-sm text-primary-foreground/50 hover:text-primary-foreground ml-2 transition-colors"
                >
                  ← Dashboard
                </Link>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-primary-foreground/60">My Shop</span>
            <Button variant="ghost" size="sm" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border md:hidden">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive(item.path) ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {isActive(item.path) && (
                <motion.div layoutId="activeTab" className="w-1 h-1 rounded-full bg-accent" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Desktop nav */}
        <div className="hidden md:flex gap-2 mb-6">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              size="sm"
              className={isActive(item.path) ? "bg-accent text-accent-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}
              asChild
            >
              <Link to={item.path}>
                <item.icon className="w-4 h-4 mr-1" /> {item.label}
              </Link>
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardLayout;
