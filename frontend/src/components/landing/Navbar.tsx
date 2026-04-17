import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, QrCode } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-primary-foreground">
              SB0 Pay
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 shadow-glow transition-colors"
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden text-primary-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[hsl(220_70%_18%)]/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-white/10 transition-colors text-left"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white text-center transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
