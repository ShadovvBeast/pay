import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode, Eye, EyeOff, ArrowLeft, ArrowRight,
  Building2, User, Mail, Lock, Hash, Globe, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SignUpPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    businessName: "", ownerName: "", email: "", password: "", confirmPassword: "",
    companyNumber: "", currency: "ILS", language: "he",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <QrCode className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-primary-foreground">SB0 Pay</span>
          </Link>
          <p className="text-primary-foreground/50 text-sm">Create your account</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {s}
                  </div>
                  {s < 2 && <div className={`w-12 h-0.5 ${step > 1 ? "bg-accent" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <p className="text-sm font-medium text-card-foreground text-center">Business Information</p>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Your Shop Name" className="pl-10" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Owner Name" className="pl-10" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="you@business.com" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showConfirm ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                  <p className="text-sm font-medium text-card-foreground text-center">Business Details</p>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Company Number (ח״פ)</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="123456789" maxLength={9} className="pl-10" value={form.companyNumber} onChange={(e) => setForm({ ...form, companyNumber: e.target.value.replace(/\D/g, "").slice(0, 9) })} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Exactly 9 digits</p>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Preferred Currency</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                        <SelectTrigger className="pl-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ILS">₪ Israeli Shekel (ILS)</SelectItem>
                          <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                          <SelectItem value="UGX">USh Ugandan Shilling (UGX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-card-foreground text-sm mb-1.5 block">Preferred Language</Label>
                    <div className="relative">
                      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                        <SelectTrigger className="pl-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="he">עברית (Hebrew)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ru">Русский (Russian)</SelectItem>
                          <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-1">What happens next?</p>
                    <p className="text-xs text-muted-foreground">Your account will be set up automatically. You can start accepting payments right away.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              {step === 2 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 h-11">
                {step === 1 ? (
                  <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </motion.form>

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-sm text-muted-foreground hover:text-foreground">
              Already have an account? <span className="text-accent font-medium">Sign in</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUpPage;
