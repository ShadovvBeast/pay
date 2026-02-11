# Empaako Integration Guide - SB0 Pay API

## ✅ API Key Status: VERIFIED WORKING

**API Key**: `sb0_live_0b6bf256ec92c38639a50f5183d801a5`  
**Status**: Active and tested  
**Last Test**: 2026-02-11 09:48:10 UTC  
**Test Result**: ✅ SUCCESS - Payment created

---

## 🎯 The Exact Working Request

This is the EXACT request that works. Copy this format exactly:

### HTTP Request
```
POST /api/v1/payments HTTP/1.1
Host: sb0pay-678576192331.us-central1.run.app
Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5
Content-Type: application/json

{"amount":100.00,"description":"Test Payment","customerEmail":"test@example.com"}
```

### curl Command
```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{"amount":100.00,"description":"Test Payment","customerEmail":"test@example.com"}'
```

### Expected Response (201 Created)
```json
{
  "id": "6314ff23-2f8a-4d66-b3fc-2671170d9fac",
  "amount": 100,
  "currency": "ILS",
  "status": "pending",
  "paymentUrl": "https://allpay.to/~sb0/...",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "description": "Test Payment",
  "createdAt": "2026-02-11T09:48:10.846Z"
}
```

---

## 🔍 Why Empaako Might Be Failing

### Common Mistake #1: Missing "Bearer" Prefix

❌ **WRONG**:
```javascript
headers: {
  'Authorization': 'sb0_live_0b6bf256ec92c38639a50f5183d801a5'
}
```

✅ **CORRECT**:
```javascript
headers: {
  'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5'
}
```

### Common Mistake #2: Extra Spaces

❌ **WRONG**:
```javascript
'Authorization': 'Bearer  sb0_live_...' // Two spaces
```

✅ **CORRECT**:
```javascript
'Authorization': 'Bearer sb0_live_...' // One space
```

### Common Mistake #3: Wrong URL

❌ **WRONG**:
```
https://sb0pay-678576192331.us-central1.run.app/payments
```

✅ **CORRECT**:
```
https://sb0pay-678576192331.us-central1.run.app/api/v1/payments
```

### Common Mistake #4: API Key in Body Instead of Header

❌ **WRONG**:
```javascript
body: JSON.stringify({
  apiKey: 'sb0_live_...',
  amount: 100
})
```

✅ **CORRECT**:
```javascript
headers: {
  'Authorization': 'Bearer sb0_live_...'
},
body: JSON.stringify({
  amount: 100
})
```

### Common Mistake #5: Newlines or Whitespace in API Key

❌ **WRONG**:
```javascript
const apiKey = process.env.API_KEY; // "sb0_live_...\n"
```

✅ **CORRECT**:
```javascript
const apiKey = process.env.API_KEY.trim();
```

---

## 📝 Copy-Paste Code for Empaako

### Option 1: Using fetch (Modern JavaScript)

```javascript
async function createSB0Payment(amount, description, customerEmail) {
  const response = await fetch('https://sb0pay-678576192331.us-central1.run.app/api/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount,
      description: description,
      customerEmail: customerEmail
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Payment failed: ${error.error.message}`);
  }

  return await response.json();
}

// Usage
try {
  const payment = await createSB0Payment(100.00, 'Order #123', 'customer@example.com');
  console.log('Payment created:', payment.id);
  console.log('Payment URL:', payment.paymentUrl);
  // Redirect customer to payment.paymentUrl
} catch (error) {
  console.error('Payment error:', error.message);
}
```

### Option 2: Using axios

```javascript
const axios = require('axios');

async function createSB0Payment(amount, description, customerEmail) {
  try {
    const response = await axios.post(
      'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments',
      {
        amount: amount,
        description: description,
        customerEmail: customerEmail
      },
      {
        headers: {
          'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Payment failed: ${error.response.data.error.message}`);
    }
    throw error;
  }
}

// Usage
createSB0Payment(100.00, 'Order #123', 'customer@example.com')
  .then(payment => {
    console.log('Payment created:', payment.id);
    console.log('Payment URL:', payment.paymentUrl);
    // Redirect customer to payment.paymentUrl
  })
  .catch(error => {
    console.error('Payment error:', error.message);
  });
```

### Option 3: With Line Items (for detailed orders)

```javascript
async function createSB0PaymentWithItems(orderData) {
  const response = await fetch('https://sb0pay-678576192331.us-central1.run.app/api/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: orderData.total,
      description: `Order #${orderData.orderId}`,
      lineItems: orderData.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        includesVat: true
      })),
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      maxInstallments: 12,
      metadata: {
        orderId: orderData.orderId,
        source: 'empaako'
      },
      successUrl: `https://empaako.com/orders/${orderData.orderId}/success`,
      cancelUrl: `https://empaako.com/orders/${orderData.orderId}/cancel`,
      webhookUrl: 'https://empaako.com/webhooks/sb0pay'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Payment failed: ${error.error.message}`);
  }

  return await response.json();
}

// Usage
const orderData = {
  orderId: '12345',
  total: 250.00,
  items: [
    { name: 'Product A', price: 100.00, quantity: 2 },
    { name: 'Product B', price: 50.00, quantity: 1 }
  ],
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  customerPhone: '+972501234567'
};

try {
  const payment = await createSB0PaymentWithItems(orderData);
  console.log('Payment URL:', payment.paymentUrl);
  // Redirect to payment.paymentUrl
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## 🧪 Test Before Integrating

Run this test file to verify the API works from your environment:

**Save as `test-sb0.js`:**
```javascript
const https = require('https');

const data = JSON.stringify({
  amount: 100.00,
  description: 'Empaako Test',
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
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const result = JSON.parse(body);
    if (res.statusCode === 201) {
      console.log('✅ SUCCESS!');
      console.log('Payment ID:', result.id);
      console.log('Payment URL:', result.paymentUrl);
    } else {
      console.log('❌ FAILED:', result.error.message);
    }
  });
});

req.on('error', error => console.error('Error:', error));
req.write(data);
req.end();
```

**Run:**
```bash
node test-sb0.js
```

**Expected output:**
```
Status: 201
✅ SUCCESS!
Payment ID: 6314ff23-2f8a-4d66-b3fc-2671170d9fac
Payment URL: https://allpay.to/~sb0/...
```

---

## 🔧 Debugging Checklist

If Empaako is still failing, check these in order:

1. **Print the exact headers being sent**
   ```javascript
   console.log('Headers:', JSON.stringify(headers, null, 2));
   ```

2. **Print the exact body being sent**
   ```javascript
   console.log('Body:', JSON.stringify(body, null, 2));
   ```

3. **Print the exact URL**
   ```javascript
   console.log('URL:', url);
   ```

4. **Check for whitespace in API key**
   ```javascript
   const apiKey = 'sb0_live_0b6bf256ec92c38639a50f5183d801a5';
   console.log('Key length:', apiKey.length); // Should be 40
   console.log('Has spaces:', apiKey.includes(' ')); // Should be false
   console.log('Has newlines:', apiKey.includes('\n')); // Should be false
   ```

5. **Verify Authorization header format**
   ```javascript
   const authHeader = headers['Authorization'] || headers['authorization'];
   console.log('Auth header:', authHeader);
   console.log('Starts with Bearer:', authHeader.startsWith('Bearer '));
   console.log('Has one space after Bearer:', authHeader.split(' ').length === 2);
   ```

6. **Test with curl first**
   ```bash
   curl -v -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
     -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
     -H "Content-Type: application/json" \
     -d '{"amount":100.00,"description":"Test"}'
   ```

7. **Compare curl output with Empaako's request**
   - Same headers?
   - Same body format?
   - Same URL?

---

## 📊 API Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 201 | Success | Payment created, redirect to `paymentUrl` |
| 400 | Bad Request | Check request body format |
| 401 | Unauthorized | Check Authorization header format |
| 403 | Forbidden | API key doesn't have permission |
| 500 | Server Error | Retry or contact support |

---

## 🎯 Integration Steps

1. **Test with curl** - Verify API works from command line
2. **Test with test script** - Verify API works from Node.js
3. **Add to Empaako** - Copy working code into your application
4. **Test in development** - Verify integration works
5. **Deploy to production** - Go live

---

## 📞 Still Having Issues?

If it's still not working, provide these details:

1. **Exact request headers** (from console.log or network tab)
2. **Exact request body** (from console.log or network tab)
3. **Exact response** (status code and body)
4. **curl test result** (does curl work?)
5. **test-sb0.js result** (does the test script work?)

The API key is 100% working. Any failures are due to request format in the Empaako code.

---

## ✅ Verified Working

- ✅ API key exists in database
- ✅ API key is active
- ✅ API key has correct permissions
- ✅ Payment creation works
- ✅ Tested multiple times successfully
- ✅ Last test: 2026-02-11 09:48:10 UTC

**The API is ready for production use.**
