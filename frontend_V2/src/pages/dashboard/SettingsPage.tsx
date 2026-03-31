import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Landmark, Key, Store, Mail, Hash, Globe,
  Building2, Shield, Smartphone, Bell, Plus, Copy,
  CreditCard as CardIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SettingsPage = () => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto"
    >
      <h2 className="font-display text-xl font-bold text-foreground mb-6">Settings</h2>
      <SettingsTabs />
    </motion.div>
  );
};

const SettingsTabs = () => {
  const [tab, setTab] = useState<"profile" | "bank" | "api">("profile");
  const [editing, setEditing] = useState(false);

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "bank" as const, label: "Bank Account", icon: Landmark },
    { id: "api" as const, label: "API Keys", icon: Key },
  ];

  return (
    <div>
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === id ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(id)}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" && <ProfileTab editing={editing} setEditing={setEditing} />}
        {tab === "bank" && <BankTab />}
        {tab === "api" && <ApiKeysTab />}
      </AnimatePresence>
    </div>
  );
};

const ProfileTab = ({ editing, setEditing }: { editing: boolean; setEditing: (v: boolean) => void }) => (
  <motion.div
    key="profile"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-card rounded-2xl border border-border p-6 space-y-4"
  >
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-display font-semibold text-card-foreground">Merchant Profile</h3>
      <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="rounded-lg">
        {editing ? "Cancel" : "Edit Settings"}
      </Button>
    </div>
    {[
      { label: "Shop Name", value: "My Shop", icon: Store },
      { label: "Owner Name", value: "John Doe", icon: User },
      { label: "Email", value: "john@shop.com", icon: Mail },
      { label: "Company Number", value: "123456789", icon: Hash },
    ].map(({ label, value, icon: Icon }) => (
      <motion.div key={label} whileHover={{ x: 2 }} className="group">
        <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />{label}
        </label>
        {editing ? (
          <Input defaultValue={value} className="rounded-lg" />
        ) : (
          <p className="text-sm font-medium text-card-foreground py-2 px-3 bg-secondary/50 rounded-lg">{value}</p>
        )}
      </motion.div>
    ))}

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />Currency
        </label>
        {editing ? (
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="USD">$ US Dollar</option>
            <option value="ILS">₪ Israeli Shekel</option>
            <option value="EUR">€ Euro</option>
            <option value="UGX">USh Ugandan Shilling</option>
          </select>
        ) : (
          <p className="text-sm font-medium text-card-foreground py-2 px-3 bg-secondary/50 rounded-lg">$ US Dollar</p>
        )}
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />Language
        </label>
        {editing ? (
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="en">English</option>
            <option value="he">Hebrew</option>
            <option value="ru">Russian</option>
            <option value="ar">Arabic</option>
          </select>
        ) : (
          <p className="text-sm font-medium text-card-foreground py-2 px-3 bg-secondary/50 rounded-lg">English</p>
        )}
      </div>
    </div>

    {editing && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setEditing(false)}>Cancel</Button>
        <Button className="flex-1 bg-accent text-accent-foreground rounded-lg shadow-glow" onClick={() => setEditing(false)}>Save Changes</Button>
      </motion.div>
    )}
  </motion.div>
);

const BankTab = () => (
  <motion.div
    key="bank"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Landmark className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-card-foreground">Bank Account Details</h3>
          <p className="text-sm text-muted-foreground">Where your payment funds will be deposited</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />Account Holder Name
          </label>
          <Input placeholder="John Doe" className="rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />Bank Name
          </label>
          <Input placeholder="e.g., Bank of America, Barclays" className="rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />Account Number
            </label>
            <Input placeholder="••••••1234" type="password" className="rounded-lg font-mono" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />Routing / Sort Code
            </label>
            <Input placeholder="e.g., 021000021" className="rounded-lg font-mono" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />SWIFT / BIC Code
            </label>
            <Input placeholder="e.g., BOFAUS3N" className="rounded-lg font-mono" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />IBAN (if applicable)
            </label>
            <Input placeholder="e.g., DE89370400..." className="rounded-lg font-mono" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
            <CardIcon className="w-3.5 h-3.5" />Account Type
          </label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select account type</option>
            <option value="checking">Checking Account</option>
            <option value="savings">Savings Account</option>
            <option value="business">Business Account</option>
          </select>
        </div>
        <div className="bg-info/5 border border-info/20 rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Your bank details are encrypted</p>
            <p className="text-xs text-muted-foreground mt-0.5">We use bank-grade encryption to protect your financial information. Payouts are processed securely through AllPay.</p>
          </div>
        </div>
        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-glow">
          <Landmark className="w-4 h-4 mr-2" />
          Save Bank Details
        </Button>
      </div>
    </div>

    {/* Mobile Money Coming Soon */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative rounded-2xl bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border border-accent/20 p-6 overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-accent/5"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="relative z-10 flex items-start gap-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0"
        >
          <Smartphone className="w-7 h-7 text-accent" />
        </motion.div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-display font-semibold text-foreground">Mobile Money</h3>
            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">Coming Soon</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            We're building support for M-Pesa, MTN Mobile Money, Airtel Money, and more mobile payment options. Stay tuned!
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {["M-Pesa", "MTN MoMo", "Airtel Money", "Tigo Pesa"].map((name) => (
              <span key={name} className="text-xs bg-card px-2.5 py-1 rounded-full border border-border text-muted-foreground">{name}</span>
            ))}
          </div>
          <Button variant="outline" size="sm" className="border-accent/30 text-accent hover:bg-accent/10 rounded-lg">
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            Notify Me When Available
          </Button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

const ApiKeysTab = () => (
  <motion.div
    key="api"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-card rounded-2xl border border-border p-6"
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display font-semibold text-card-foreground">API Keys</h3>
      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-glow">
        <Plus className="w-4 h-4 mr-1" /> Create API Key
      </Button>
    </div>

    <div className="border border-border rounded-xl p-4 mb-4 hover:border-accent/20 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-card-foreground">Production API</span>
          <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">Disable</Button>
          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">Delete</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <p className="font-mono text-xs text-muted-foreground">sb0_live_12345678••••••••••••••••••••</p>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
        </motion.button>
      </div>
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>Created: Mar 15, 2026</span>
        <span>•</span>
        <span>Last used: Mar 30, 2026</span>
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        <Badge variant="outline" className="text-xs">payments: create, read</Badge>
        <Badge variant="outline" className="text-xs">transactions: read</Badge>
      </div>
    </div>

    <div className="border-t border-border pt-4 mt-4">
      <h4 className="font-display font-semibold text-card-foreground text-sm mb-3">API Documentation</h4>
      <div className="bg-primary rounded-xl p-4">
        <p className="text-xs text-primary-foreground/60 mb-2">Create a payment</p>
        <code className="text-xs text-primary-foreground/80 font-mono">POST /v1/payments</code>
      </div>
    </div>
  </motion.div>
);

export default SettingsPage;
