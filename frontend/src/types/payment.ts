export interface PaymentData {
  amount: number;
  currency: string;
}

export interface PaymentResponse {
  paymentUrl: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  allpayTransactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (amount: number) => void;
  currency: string;
  isLoading?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export interface QRCodeDisplayProps {
  paymentUrl: string;
  amount: number;
  currency: string;
  onNewPayment: () => void;
  isLoading?: boolean;
  error?: string;
}