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
  description?: string;
  lineItems?: PublicLineItem[];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerIdNumber?: string;
  maxInstallments?: number;
  fixedInstallments?: boolean;
  expiresAt?: Date;
  preauthorize?: boolean;
  customField1?: string;
  customField2?: string;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  apiKeyId?: string;
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
  description?: string;
  lineItems?: PublicLineItem[];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerIdNumber?: string;
  maxInstallments?: number;
  fixedInstallments?: boolean;
  expiresAt?: Date;
  preauthorize?: boolean;
  customField1?: string;
  customField2?: string;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  apiKeyId?: string;
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

// API Key Management Types
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  prefix: string; // First 8 chars for identification (e.g., "sb0_live_")
  permissions: ApiKeyPermission[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyData {
  userId: string;
  name: string;
  permissions: ApiKeyPermission[];
  expiresAt?: Date;
}

export interface ApiKeyPermission {
  resource: 'payments' | 'transactions' | 'webhooks' | 'profile';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned on creation
  prefix: string;
  permissions: ApiKeyPermission[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ApiKeyListResponse {
  id: string;
  name: string;
  prefix: string;
  permissions: ApiKeyPermission[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Public API Request/Response Types
export interface PublicLineItem {
  name: string;
  price: number;
  quantity: number;
  includesVat?: boolean; // true = 18% VAT included, false = 0% VAT
}

export interface PublicCreatePaymentRequest {
  amount: number;
  currency?: string;
  language?: string; // Payment page language: 'he', 'en', 'ar', 'ru', or 'auto'
  description?: string;
  lineItems?: PublicLineItem[]; // Optional line items for itemized payments
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerIdNumber?: string; // Israeli ID number (tehudat zehut)
  maxInstallments?: number; // Maximum number of installments (1-12)
  fixedInstallments?: boolean; // If true, only allow exact installment count
  expiresAt?: string; // ISO 8601 timestamp for payment expiration
  preauthorize?: boolean; // If true, only authorize without capturing
  showApplePay?: boolean; // Show Apple Pay option
  showBit?: boolean; // Show Bit payment option
  customField1?: string; // Custom field for merchant use
  customField2?: string; // Custom field for merchant use
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface PublicPaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentUrl: string;
  qrCodeDataUrl?: string;
  description?: string;
  lineItems?: PublicLineItem[];
  expiresAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PublicTransactionResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicErrorResponse {
  error: {
    code: string;
    message: string;
    type: 'authentication_error' | 'invalid_request' | 'api_error' | 'rate_limit_error';
  };
  timestamp: string;
  requestId: string;
}