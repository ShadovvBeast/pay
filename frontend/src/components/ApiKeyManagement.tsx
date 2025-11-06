import React, { useState, useEffect } from 'react';
import { apiKeyService } from '../services/apiKeyService';
import { ApiDocumentation } from './ApiDocumentation';
import type { ApiKey, ApiKeyWithSecret, CreateApiKeyRequest, ApiKeyPermission } from '../types/apiKey';

export const ApiKeyManagement: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<ApiKeyWithSecret | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateApiKeyRequest>({
    name: '',
    permissions: [],
    expiresAt: undefined
  });

  const resourceOptions = [
    { value: 'payments', label: 'Payments', description: 'Create and manage payments' },
    { value: 'transactions', label: 'Transactions', description: 'View transaction history' },
    { value: 'webhooks', label: 'Webhooks', description: 'Manage webhook endpoints' },
    { value: 'profile', label: 'Profile', description: 'Access user profile information' }
  ] as const;

  const actionOptions = [
    { value: 'create', label: 'Create', description: 'Create new resources' },
    { value: 'read', label: 'Read', description: 'View and retrieve resources' },
    { value: 'update', label: 'Update', description: 'Modify existing resources' },
    { value: 'delete', label: 'Delete', description: 'Remove resources' }
  ] as const;

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apiKeyService.getApiKeys();
      setApiKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('API key name is required');
      return;
    }

    if (formData.permissions.length === 0) {
      setError('At least one permission is required');
      return;
    }

    try {
      setError('');
      
      // Convert datetime-local format to ISO string if expiresAt is provided
      const createData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined
      };
      
      const newKey = await apiKeyService.createApiKey(createData);
      setNewApiKey(newKey);
      setFormData({ name: '', permissions: [], expiresAt: undefined });
      setShowCreateForm(false);
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiKeyService.deleteApiKey(id);
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    try {
      await apiKeyService.updateApiKey(id, { isActive: !isActive });
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };

  const handlePermissionChange = (resource: string, actions: string[]) => {
    setFormData(prev => ({
      ...prev,
      permissions: [
        ...prev.permissions.filter(p => p.resource !== resource),
        ...(actions.length > 0 ? [{ resource: resource as any, actions: actions as any }] : [])
      ]
    }));
  };

  const getPermissionActions = (resource: string): string[] => {
    const permission = formData.permissions.find(p => p.resource === resource);
    return permission ? permission.actions : [];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-600">Manage API keys for programmatic access to your account</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          Create API Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-xl mr-2">❌</span>
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">🔑</span>
            <div>
              <h4 className="font-medium text-green-800">API Key Created Successfully!</h4>
              <p className="text-sm text-green-600">Save this key securely - it won't be shown again.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-800 break-all">{newApiKey.key}</code>
              <button
                onClick={() => copyToClipboard(newApiKey.key)}
                className="ml-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                Copy
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setNewApiKey(null)}
            className="mt-4 text-green-600 hover:text-green-700 text-sm underline"
          >
            I've saved the key securely
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="card">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Create New API Key</h4>
          
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="e.g., Production API, Mobile App, Website Integration"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value || undefined }))}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="space-y-4">
                {resourceOptions.map(resource => (
                  <div key={resource.value} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-900">{resource.label}</h5>
                        <p className="text-sm text-gray-600">{resource.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {actionOptions.map(action => {
                        const currentActions = getPermissionActions(resource.value);
                        const isChecked = currentActions.includes(action.value);
                        
                        return (
                          <label key={action.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newActions = e.target.checked
                                  ? [...currentActions, action.value]
                                  : currentActions.filter(a => a !== action.value);
                                handlePermissionChange(resource.value, newActions);
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{action.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn-primary flex-1">
                Create API Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', permissions: [], expiresAt: undefined });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys List */}
      <div className="card">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Your API Keys</h4>
        
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔑</div>
            <h5 className="text-lg font-medium text-gray-900 mb-2">No API Keys Yet</h5>
            <p className="text-gray-600 mb-4">Create your first API key to start integrating with our API</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create Your First API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map(key => (
              <div key={key.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-gray-900">{key.name}</h5>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      key.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleApiKey(key.id, key.isActive)}
                      className={`text-sm ${
                        key.isActive 
                          ? 'text-orange-600 hover:text-orange-700' 
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {key.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteApiKey(key.id, key.name)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Key:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{key.prefix}••••••••••••••••••••••••</code></p>
                  <p><strong>Created:</strong> {formatDate(key.createdAt)}</p>
                  {key.lastUsedAt && (
                    <p><strong>Last Used:</strong> {formatDate(key.lastUsedAt)}</p>
                  )}
                  {key.expiresAt && (
                    <p><strong>Expires:</strong> {formatDate(key.expiresAt)}</p>
                  )}
                </div>
                
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.map((permission, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {permission.resource}: {permission.actions.join(', ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Documentation */}
      <ApiDocumentation />
    </div>
  );
};