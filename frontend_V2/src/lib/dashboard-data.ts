import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";

export const mockTransactions = [
  { id: "tx-a1b2c3d4-e5f6-7890", amount: 250, currency: "USD", status: "completed", createdAt: "2026-03-30T10:30:00", customer: "David Cohen" },
  { id: "tx-b2c3d4e5-f6a7-8901", amount: 85.50, currency: "USD", status: "pending", createdAt: "2026-03-30T09:15:00", customer: "" },
  { id: "tx-c3d4e5f6-a7b8-9012", amount: 1200, currency: "USD", status: "completed", createdAt: "2026-03-29T16:45:00", customer: "Sarah Levi" },
  { id: "tx-d4e5f6a7-b8c9-0123", amount: 45, currency: "USD", status: "failed", createdAt: "2026-03-29T14:20:00", customer: "" },
  { id: "tx-e5f6a7b8-c9d0-1234", amount: 320, currency: "USD", status: "cancelled", createdAt: "2026-03-28T11:00:00", customer: "Yael Mizrahi" },
];

export type Transaction = typeof mockTransactions[0];

export const currencySymbols: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€", UGX: "USh" };

export const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", label: "Completed" },
  pending: { icon: Clock, color: "text-warning", bgColor: "bg-warning/10", label: "Pending" },
  failed: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10", label: "Failed" },
  cancelled: { icon: Ban, color: "text-muted-foreground", bgColor: "bg-muted", label: "Cancelled" },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
