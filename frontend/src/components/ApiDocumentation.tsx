import React, { useState } from 'react';

export const ApiDocumentation: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState<'curl' | 'javascript' | 'python'>('curl');

  const examples = {
    curl: `curl -X POST https://api.sb0pay.com/api/v1/payments \\
  -H "Authorization: Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100.50,
    "currency": "ILS",
    "description": "Order #12345",
    "customerEmail": "customer@example.com",
    "webhookUrl": "https://yoursite.com/webhook"
  }'`,
    javascript: `const response = await fetch('https://api.sb0pay.com/api/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 100.50,
    currency: 'ILS',
    description: 'Order #12345',
    customerEmail: 'customer@example.com',
    webhookUrl: 'https://yoursite.com/webhook'
  })
});

const payment = await response.json();
console.log('Payment created:', payment);`,
    python: `import requests

response = requests.post('https://api.sb0pay.com/api/v1/payments', 
  headers={
    'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  json={
    'amount': 100.50,
    'currency': 'ILS',
    'description': 'Order #12345',
    'customerEmail': 'customer@example.com',
    'webhookUrl': 'https://yoursite.com/webhook'
  }
)

payment = response.json()
print('Payment created:', payment)`
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
      <h4 className="text-lg font-medium text-blue-900 mb-4">🚀 Quick Start Guide</h4>
      
      <div className="space-y-4">
        <div>
          <h5 className="font-medium text-blue-800 mb-2">1. Create an API Key</h5>
          <p className="text-blue-700 text-sm">
            Click "Create API Key" above and select the permissions you need. Save the generated key securely.
          </p>
        </div>

        <div>
          <h5 className="font-medium text-blue-800 mb-2">2. Make Your First API Call</h5>
          <p className="text-blue-700 text-sm mb-3">
            Use your API key to create a payment. Here's an example:
          </p>
          
          {/* Language Selector */}
          <div className="flex space-x-2 mb-3">
            {Object.keys(examples).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedExample(lang as keyof typeof examples)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedExample === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                }`}
              >
                {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : 'Python'}
              </button>
            ))}
          </div>

          {/* Code Example */}
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm">
              <code>{examples[selectedExample]}</code>
            </pre>
          </div>
        </div>

        <div>
          <h5 className="font-medium text-blue-800 mb-2">3. Handle the Response</h5>
          <p className="text-blue-700 text-sm">
            The API will return a payment object with a <code className="bg-blue-100 px-1 rounded">paymentUrl</code> 
            that you can redirect your customer to, or display the QR code for mobile payments.
          </p>
        </div>

        <div className="pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-blue-800">Need More Help?</h5>
              <p className="text-blue-700 text-sm">Check out our comprehensive API documentation</p>
            </div>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              View Full Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};