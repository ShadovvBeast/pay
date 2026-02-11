# SB0 Pay API Key Verification Report

**Date**: February 11, 2026  
**API Key**: `sb0_live_0b6bf256ec92c38639a50f5183d801a5`  
**Production API**: `https://sb0pay-678576192331.us-central1.run.app`

---

## ✅ Verification Status

### Database Verification
- **Status**: ✅ ACTIVE
- **Registered**: YES
- **User**: asaf@sb0.tech
- **Shop**: SB0
- **Prefix**: `sb0_live_0b6bf256`
- **Permissions**: 
  - `payments:create` ✅
  - `payments:read` ✅
  - `payments:update` ✅

### API Test Results
- **Payment Creation**: ✅ SUCCESS
- **Test Date**: 2026-02-11 09:45:37 UTC
- **Payment ID**: `099c2f36-c66c-4cba-8aaa-e12f1f542a78`
- **Amount**: 100 ILS
- **Status**: pending
- **Payment URL**: Generated successfully
- **QR Code**: Generated successfully

---

## 🔑 How the API Key Works

### Authentication Flow

1. **Client sends request** with API key in Authorization header
2. **Middleware extracts** the key from `Bearer` token
3. **System extracts prefix** (first 16 characters): `sb0_live_0b6bf256`
4. **Database lookup** finds API key by prefix
5. **Hash verification** compares provided key with stored hash
6. **Status check** verifies key is active and not expired
7. **Permission check** validates resource/action permissions
8. **Request proceeds** if all checks pass

### Key Format
```
sb0_live_0b6bf256ec92c38639a50f5183d801a5
│       │                                  │
│       │                                  └─ Random part (24 chars)
│       └─ Prefix for lookup (16 chars total)
└─ Environment indicator
```

---

## 📋 Exact Working Request

### Minimum Required Request

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Test Payment"
  }'
```

### Complete Request with All Features

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "currency": "ILS",
    "description": "Order #12345",
    "lineItems": [
      {
        "name": "Product A",
        "price": 100.00,
        "quantity": 2,
        "includesVat": true
      },
      {
        "name": "Product B",
        "price": 50.00,
        "quantity": 1,
        "includesVat": true
      }
    ],
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "customerPhone": "+972501234567",
    "customerIdNumber": "123456789",
    "maxInstallments": 12,
    "fixedInstallments": false,
    "metadata": {
      "orderId": "12345",
      "source": "empaako-store",
      "customField": "value"
    },
    "successUrl": "https://empaako.com/payment/success",
    "cancelUrl": "https://empaako.com/payment/cancel",
    "webhookUrl": "https://empaako.com/webhooks/payment"
  }'
```

### Expected Success Response (201 Created)

```json
{
  "id": "099c2f36-c66c-4cba-8aaa-e12f1f542a78",
  "amount": 250.00,
  "currency": "ILS",
  "status": "pending",
  "paymentUrl": "https://allpay.to/~sb0/...",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "description": "Order #12345",
  "lineItems": [
    {
      "name": "Product A",
      "price": 100.00,
      "quantity": 2,
      "includesVat": true
    },
    {
      "name": "Product B",
      "price": 50.00,
      "quantity": 1,
      "includesVat": true
    }
  ],
  "metadata": {
    "orderId": "12345",
    "source": "empaako-store",
    "customField": "value"
  },
  "createdAt": "2026-02-11T09:45:37.451Z"
}
```

---

## 🚨 Common Errors and Solutions

### Error 1: Missing Authorization Header

**Request:**
```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00}'
```

**Response (401):**
```json
{
  "error": {
    "code": "MISSING_API_KEY",
    "message": "API key is required. Include it in the Authorization header as \"Bearer your_api_key\"",
    "type": "authentication_error"
  },
  "timestamp": "2026-02-11T09:45:37.451Z",
  "requestId": "uuid-here"
}
```

**Solution:** Add `Authorization: Bearer YOUR_API_KEY` header

---

### Error 2: Wrong Authorization Format

**Request:**
```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00}'
```

**Response (401):**
```json
{
  "error": {
    "code": "INVALID_AUTH_FORMAT",
    "message": "Authorization header must be in format: \"Bearer your_api_key\"",
    "type": "authentication_error"
  },
  "timestamp": "2026-02-11T09:45:37.451Z",
  "requestId": "uuid-here"
}
```

**Solution:** Use `Bearer ` prefix (note the space after Bearer)

---

### Error 3: Invalid API Key

**Request:**
```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_wrong_key_here" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00}'
```

**Response (401):**
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key",
    "type": "authentication_error"
  },
  "timestamp": "2026-02-11T09:45:37.451Z",
  "requestId": "uuid-here"
}
```

**Solution:** Use the correct API key

---

### Error 4: Invalid Line Items Total

**Request:**
```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "lineItems": [
      {"name": "Product", "price": 50.00, "quantity": 1}
    ]
  }'
```

**Response (400):**
```json
{
  "error": {
    "code": "INVALID_LINE_ITEMS",
    "message": "Line items total (50.00) must match payment amount (100.00)",
    "type": "invalid_request"
  },
  "timestamp": "2026-02-11T09:45:37.451Z",
  "requestId": "uuid-here"
}
```

**Solution:** Ensure sum of (price × quantity) equals amount

---

## 🔍 Debugging Empaako Integration

### Step 1: Test with curl/Postman First

Before integrating into Empaako, verify the API works with a simple curl command:

```bash
curl -v -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Test"}'
```

The `-v` flag shows full request/response details.

### Step 2: Check Empaako's Request Format

Common issues in application code:

#### ❌ Wrong: Missing Bearer prefix
```javascript
headers: {
  'Authorization': 'sb0_live_0b6bf256ec92c38639a50f5183d801a5'
}
```

#### ✅ Correct: With Bearer prefix
```javascript
headers: {
  'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5'
}
```

#### ❌ Wrong: API key in body
```javascript
body: JSON.stringify({
  apiKey: 'sb0_live_0b6bf256ec92c38639a50f5183d801a5',
  amount: 100
})
```

#### ✅ Correct: API key in header
```javascript
headers: {
  'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
  'Content-Type': 'application/json'
},
body: JSON.stringify({
  amount: 100
})
```

### Step 3: Verify Request Headers

The API expects these exact headers:

```
POST /api/v1/payments HTTP/1.1
Host: sb0pay-678576192331.us-central1.run.app
Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5
Content-Type: application/json
Content-Length: [calculated]

{"amount":100.00,"description":"Test"}
```

### Step 4: Check for Common Code Issues

#### Issue: Extra spaces in Authorization header
```javascript
// ❌ Wrong
'Authorization': 'Bearer  sb0_live_...' // Two spaces

// ✅ Correct
'Authorization': 'Bearer sb0_live_...' // One space
```

#### Issue: Newlines or special characters in API key
```javascript
// ❌ Wrong - key from environment with newline
const apiKey = process.env.API_KEY; // "sb0_live_...\n"

// ✅ Correct - trim the key
const apiKey = process.env.API_KEY.trim();
```

#### Issue: Wrong URL
```javascript
// ❌ Wrong
'https://sb0pay-678576192331.us-central1.run.app/payments'

// ✅ Correct
'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments'
```

---

## 📝 Integration Code Examples

### JavaScript/Node.js (fetch)

```javascript
const createPayment = async () => {
  const response = await fetch('https://sb0pay-678576192331.us-central1.run.app/api/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 100.00,
      description: 'Test Payment',
      customerEmail: 'customer@example.com'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Payment failed:', error);
    throw new Error(error.error.message);
  }

  const payment = await response.json();
  console.log('Payment created:', payment);
  return payment;
};
```

### JavaScript/Node.js (axios)

```javascript
const axios = require('axios');

const createPayment = async () => {
  try {
    const response = await axios.post(
      'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments',
      {
        amount: 100.00,
        description: 'Test Payment',
        customerEmail: 'customer@example.com'
      },
      {
        headers: {
          'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Payment created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Payment failed:', error.response?.data || error.message);
    throw error;
  }
};
```

### Python (requests)

```python
import requests

def create_payment():
    url = 'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments'
    headers = {
        'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
        'Content-Type': 'application/json'
    }
    data = {
        'amount': 100.00,
        'description': 'Test Payment',
        'customerEmail': 'customer@example.com'
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 201:
        payment = response.json()
        print('Payment created:', payment)
        return payment
    else:
        error = response.json()
        print('Payment failed:', error)
        raise Exception(error['error']['message'])
```

### PHP

```php
<?php
$apiKey = 'sb0_live_0b6bf256ec92c38639a50f5183d801a5';
$url = 'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments';

$data = [
    'amount' => 100.00,
    'description' => 'Test Payment',
    'customerEmail' => 'customer@example.com'
];

$options = [
    'http' => [
        'header' => [
            "Authorization: Bearer $apiKey",
            "Content-Type: application/json"
        ],
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === false) {
    die('Payment failed');
}

$payment = json_decode($response, true);
echo 'Payment created: ' . print_r($payment, true);
?>
```

---

## ✅ Verification Checklist for Empaako

- [ ] API key is exactly: `sb0_live_0b6bf256ec92c38639a50f5183d801a5`
- [ ] Authorization header format: `Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5`
- [ ] Note the space after "Bearer"
- [ ] URL is: `https://sb0pay-678576192331.us-central1.run.app/api/v1/payments`
- [ ] Method is: `POST`
- [ ] Content-Type header: `application/json`
- [ ] Request body is valid JSON
- [ ] Amount is a number (not string)
- [ ] If using line items, total matches amount
- [ ] No extra whitespace in API key
- [ ] No newlines in API key
- [ ] HTTPS (not HTTP)

---

## 🧪 Quick Test Script

Save this as `test-sb0pay.js` and run with `node test-sb0pay.js`:

```javascript
const https = require('https');

const data = JSON.stringify({
  amount: 100.00,
  description: 'Empaako Test Payment',
  customerEmail: 'test@empaako.com'
});

const options = {
  hostname: 'sb0pay-678576192331.us-central1.run.app',
  port: 443,
  path: '/api/v1/payments',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Body:');
    console.log(JSON.parse(body));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
```

---

## 📞 Support

If Empaako is still failing after following this guide:

1. **Capture the exact request** being sent (headers and body)
2. **Capture the exact response** received (status code and body)
3. **Test with curl** using the exact same data
4. **Compare** the curl request with Empaako's request
5. **Check for differences** in headers, body format, or URL

The API key is confirmed working. Any failures are due to request format issues in the Empaako integration code.
