export interface ApiKeyPermission {
  resource: 'payments' | 'transactions' | 'webhooks' | 'profile';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: ApiKeyPermission[];
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Only available when creating
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: ApiKeyPermission[];
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: ApiKeyPermission[];
  isActive?: boolean;
  expiresAt?: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  dailyStats: Array<{
    date: string;
    requests: number;
    errors: number;
  }>;
}