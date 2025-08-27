import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface SettingsFormData {
  shopName: string;
  ownerName: string;
  email: string;
  companyNumber: string;
  currency: string;
  language: string;
}

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<SettingsFormData>({
    shopName: user?.shopName || '',
    ownerName: user?.ownerName || '',
    email: user?.email || '',
    companyNumber: user?.merchantConfig.companyNumber || '',
    currency: user?.merchantConfig.currency || 'ILS',
    language: user?.merchantConfig.language || 'he'
  });

  const currencies = [
    { value: 'ILS', label: 'Israeli Shekel (₪)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' }
  ];

  const languages = [
    { value: 'he', label: 'עברית (Hebrew)' },
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский (Russian)' },
    { value: 'ar', label: 'العربية (Arabic)' }
  ];

  const handleInputChange = (field: keyof SettingsFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      await updateUser({
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        email: formData.email,
        merchantConfig: {
          companyNumber: formData.companyNumber,
          currency: formData.currency,
          language: formData.language
        }
      });
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setIsEditing(false);
    } catch (error) { 
     setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      shopName: user?.shopName || '',
      ownerName: user?.ownerName || '',
      email: user?.email || '',
      companyNumber: user?.merchantConfig.companyNumber || '',
      currency: user?.merchantConfig.currency || 'ILS',
      language: user?.merchantConfig.language || 'he'
    });
    setIsEditing(false);
    setMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your shop and payment configuration</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <span className="text-xl mr-2">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Shop Information</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary"
            >
              Edit Settings
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => handleInputChange('shopName', e.target.value)}
                className="input-field"
                placeholder="Enter shop name"
              />
            ) : (
              <p className="text-gray-900">{user?.shopName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                className="input-field"
                placeholder="Enter owner name"
              />
            ) : (
              <p className="text-gray-900">{user?.ownerName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input-field"
                placeholder="Enter email address"
              />
            ) : (
              <p className="text-gray-900">{user?.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Number (ח"פ)
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.companyNumber}
                onChange={(e) => handleInputChange('companyNumber', e.target.value)}
                className="input-field"
                placeholder="Enter company number"
              />
            ) : (
              <p className="text-gray-900">{user?.merchantConfig.companyNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            {isEditing ? (
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="input-field"
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900">
                {currencies.find(c => c.value === user?.merchantConfig.currency)?.label}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            {isEditing ? (
              <select
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="input-field"
              >
                {languages.map(language => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900">
                {languages.find(l => l.value === user?.merchantConfig.language)?.label}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};