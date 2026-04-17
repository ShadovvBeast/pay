import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  declined: "Payment was declined by your bank",
  insufficient: "Insufficient funds",
  invalid_card: "Invalid card details",
  expired: "Card expired",
  timeout: "Transaction timeout",
  cancelled: "Payment cancelled by user",
};

const PaymentFailure = () => {
  const [params] = useSearchParams();
  const errorCode = params.get("error") || "generic";
  const orderId = params.get("order_id");

  const message = errorMessages[errorCode] || "Payment could not be processed";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-2">{message}</p>
        {orderId && <p className="text-sm text-muted-foreground mb-8">Order ID: <span className="font-mono">{orderId}</span></p>}

        <div className="flex gap-3 mb-6">
          <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => window.history.back()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Try Again
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>

        <div className="bg-secondary rounded-xl p-4 text-left">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">If you continue to experience issues, please check your payment details or contact your bank.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentFailure;
