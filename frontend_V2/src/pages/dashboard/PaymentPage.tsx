import { useState } from "react";
import { motion } from "framer-motion";
import {
  QrCode, CreditCard, ExternalLink, Loader2,
  CheckCircle2, XCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencySymbols } from "@/lib/dashboard-data";

const PaymentPage = () => {
  const [paymentStep, setPaymentStep] = useState<"amount" | "qr" | "status">("amount");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "success" | "failed">("waiting");

  const currency = "USD";
  const symbol = currencySymbols[currency];

  const handleCreatePayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setPaymentStep("qr");
    setTimeout(() => {
      setPaymentStatus("success");
      setPaymentStep("status");
    }, 5000);
  };

  const resetPayment = () => {
    setAmount("");
    setPaymentStep("amount");
    setPaymentStatus("waiting");
  };

  return (
    <motion.div key="payment" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto">
      {paymentStep === "amount" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border p-8 text-center shadow-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"
          >
            <CreditCard className="w-8 h-8 text-accent" />
          </motion.div>
          <h2 className="font-display text-xl font-bold text-card-foreground mb-6">Enter Amount</h2>
          <motion.div
            className="text-5xl font-display font-bold text-accent mb-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {symbol}
          </motion.div>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-center text-3xl font-display font-bold h-16 border-none bg-transparent focus-visible:ring-0 text-card-foreground"
          />
          {amount && parseFloat(amount) > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg text-muted-foreground mb-4">
              {symbol}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.p>
          )}
          <div className="flex gap-2 justify-center my-6">
            {[10, 50, 100].map((v) => (
              <motion.div key={v} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" onClick={() => setAmount(String(v))} className="hover:border-accent/50 hover:bg-accent/5">
                  {symbol}{v}
                </Button>
              </motion.div>
            ))}
          </div>
          <Button
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow rounded-xl"
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={handleCreatePayment}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create Payment
          </Button>
        </motion.div>
      )}

      {paymentStep === "qr" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl border border-border p-8 text-center shadow-lg"
        >
          <p className="text-2xl font-display font-bold text-card-foreground mb-4">
            {symbol}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <motion.div
            className="w-56 h-56 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed border-border"
            animate={{ borderColor: ["hsl(var(--border))", "hsl(var(--accent))", "hsl(var(--border))"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <QrCode className="w-24 h-24 text-muted-foreground/40" />
          </motion.div>
          <div className="text-left space-y-2 mb-6 bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium text-foreground">Instructions:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Scan the QR code with your phone</li>
              <li>Choose payment method: Card, Bit, or Apple Pay</li>
              <li>Complete the payment securely</li>
            </ol>
          </div>
          <motion.div
            className="flex items-center justify-center gap-2 text-info mb-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Waiting for payment...</span>
          </motion.div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={resetPayment}>New Payment</Button>
            <Button variant="outline" className="flex-1 rounded-xl">
              <ExternalLink className="w-4 h-4 mr-1" /> Open Link
            </Button>
          </div>
        </motion.div>
      )}

      {paymentStep === "status" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl border border-border p-8 text-center shadow-lg"
        >
          {paymentStatus === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-10 h-10 text-success" />
              </motion.div>
              <h3 className="text-xl font-display font-bold text-card-foreground mb-2">Payment Complete!</h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-success mb-6"
              >
                {symbol}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </motion.p>
            </>
          )}
          {paymentStatus === "failed" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
              >
                <XCircle className="w-10 h-10 text-destructive" />
              </motion.div>
              <h3 className="text-xl font-display font-bold text-card-foreground mb-2">Payment Failed</h3>
            </>
          )}
          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-glow" onClick={resetPayment}>
            Create New Payment
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PaymentPage;
