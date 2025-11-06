import type { 
  ApiKey, 
  ApiKeyWithSecret, 
  CreateApiKeyRequest, 
  UpdateApiKeyRequest,
  ApiKeyUsageStats 
} from '../types/apiKey';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiKeyService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyWithSecret> {
    return this.request<ApiKeyWithSecret>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>('/api-keys');
  }

  async updateApiKey(id: string, data: UpdateApiKeyRequest): Promise<ApiKey> {
    return this.request<ApiKey>(`/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  async getApiKeyUsage(id: string, days: number = 30): Promise<ApiKeyUsageStats> {
    return this.request<ApiKeyUsageStats>(`/api-keys/${id}/usage?days=${days}`);
  }
}

export const apiKeyService = new ApiKeyService();