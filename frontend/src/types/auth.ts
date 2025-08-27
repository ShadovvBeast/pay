export interface User {
  id: string;
  email: string;
  shopName: string;
  ownerName: string;
  merchantConfig: MerchantConfig;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantConfig {
  companyNumber: string;
  currency: string;
  language: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  ownerName: string;
  merchantConfig: MerchantConfig;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}