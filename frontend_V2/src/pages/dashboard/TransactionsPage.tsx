import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  mockTransactions, currencySymbols, statusConfig,
  containerVariants, itemVariants,
  type Transaction,
} from "@/lib/dashboard-data";

const TransactionsPage = () => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const currency = "USD";
  const symbol = currencySymbols[currency];

  return (
    <>
      <motion.div
        key="transactions"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0 }}
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Transaction History</h2>
            <p className="text-sm text-muted-foreground">{mockTransactions.length} transactions</p>
          </div>
          <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
            <RefreshCw className="w-4 h-4 mr-1" /> 
          </motion.div>
        </motion.div>

        <div className="space-y-3">
          {mockTransactions.map((tx) => {
            const config = statusConfig[tx.status];
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={tx.id}
                variants={itemVariants}
                whileHover={{ x: 4, scale: 1.01 }}
                className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-accent/20 hover:shadow-md transition-all duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}
                >
                  <StatusIcon className={`w-5 h-5 ${config.color}`} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-card-foreground">{tx.id.slice(-8)}</span>
                    <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("en-US")} {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-card-foreground">{symbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <div className="flex gap-2 mt-1">
                    <button className="text-xs text-accent hover:underline" onClick={() => setSelectedTx(tx)}>Details</button>
                    {tx.status === "pending" && <button className="text-xs text-destructive hover:underline">Cancel</button>}
                    {tx.status === "completed" && <button className="text-xs text-info hover:underline" onClick={() => setShowRefundModal(true)}>Refund</button>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-foreground text-xs">{selectedTx.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-foreground">{symbol}{selectedTx.amount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{selectedTx.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-foreground">{new Date(selectedTx.createdAt).toLocaleString("en-US")}</span></div>
              {selectedTx.customer && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="text-foreground">{selectedTx.customer}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Refund Amount</label>
              <Input type="number" defaultValue="250.00" className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Refunds depend on your AllPay account balance.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRefundModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShowRefundModal(false)}>Process Refund</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionsPage;
