import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const txId = params.get("tx_id");
  const amount = params.get("amount");
  const currency = params.get("currency") || "ILS";

  const symbols: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€", UGX: "USh" };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">Your payment has been processed successfully. Thank you for your purchase!</p>

        {(orderId || txId || amount) && (
          <div className="bg-card rounded-xl border border-border p-5 mb-6 text-left space-y-3 text-sm">
            {orderId && <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono text-foreground">{orderId}</span></div>}
            {txId && <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span className="font-mono text-foreground">{txId}</span></div>}
            {amount && <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-foreground">{symbols[currency]}{amount}</span></div>}
          </div>
        )}

        <div className="flex gap-3">
          <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print Receipt
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">Need help? Contact support@sb0pay.com</p>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
