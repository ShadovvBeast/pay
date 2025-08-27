export interface User {
  id: string;
  email: string;
  passwordHash: string;
  shopName: string;
  ownerName: string;
  merchantConfig: MerchantConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantConfig {
  companyNumber: string;
  currency: string;
  language: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  allpayTransactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  shopName: string;
  ownerName: string;
  merchantConfig: MerchantConfig;
}

export interface CreateTransactionData {
  userId: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  allpayTransactionId?: string;
}

export interface PaymentResponse {
  paymentUrl: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// AllPay API Types - Based on official AllPay API documentation
export interface AllPayItem {
  name: string;
  price: number;
  qty: number;
  vat: number; // 0 = No VAT, 1 = 18% VAT, 3 = 0% VAT
}

export interface AllPayPaymentRequest {
  login: string;
  order_id: string;
  items: AllPayItem[];
  amount: number; // Total amount in agorot
  currency: string; // ILS, USD, EUR
  lang?: string; // AUTO, AR, EN, HE, RU
  notifications_url?: string;
  success_url?: string;
  backlink_url?: string;
  inst?: number; // Max installments (up to 12)
  inst_fixed?: number; // 0 = flexible, 1 = fixed
  allpay_token?: string;
  client_name?: string;
  client_tehudat?: string;
  client_email?: string;
  client_phone?: string;
  add_field_1?: string;
  add_field_2?: string;
  show_applepay?: boolean;
  show_bit?: boolean;
  expire?: number; // Unix timestamp
  preauthorize?: boolean;
  sign?: string; // SHA256 signature
}

export interface AllPayPaymentResponse {
  payment_url?: string;
  error?: string;
  [key: string]: any;
}

export interface AllPayWebhookPayload {
  order_id: string;
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  add_field_1?: string;
  add_field_2?: string;
  sign?: string; // SHA256 signature
  [key: string]: any;
}

export interface AllPayApiError extends Error {
  code: string;
  statusCode?: number;
  response?: any;
}