# SB0 Pay API Key Setup Guide

## Current Situation

You have an API key: `sb0_live_0b6bf256ec92c38639a50f5183d801a5`

This key is returning a 401 authentication error, which means it's either:
- Not registered in the production database
- Expired or deactivated
- Associated with a non-existent user account

## Solution Steps

### Step 1: Set Up Production Database Connection

First, you need to configure the production database connection. Set the `DATABASE_URL` environment variable to point to your production PostgreSQL database:

```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```

For Google Cloud SQL, the format is typically:
```bash
export DATABASE_URL="postgresql://user:password@/database?host=/cloudsql/project:region:instance"
```

### Step 2: Check if API Key Exists

Run the check script to see if your API key is registered:

```bash
cd backend
bun run scripts/check-api-key.ts sb0_live_0b6bf256ec92c38639a50f5183d801a5
```

This will tell you:
- ✅ If the key is valid and active
- ❌ If the key is not found or invalid
- 📊 Usage statistics if the key exists

### Step 3: Register a New Merchant Account (If Needed)

If the API key doesn't exist, you need to register a merchant account and generate a new API key.

**Option A: Use the Registration Script**

Edit `backend/scripts/register-merchant.ts` to set your merchant details:

```typescript
const merchantData = {
  email: 'your-email@empaako.com',
  password: 'YourSecurePassword123!',
  shopName: 'Empaako E-commerce',
  ownerName: 'Your Name',
  merchantConfig: {
    currency: 'ILS',
    maxPaymentAmount: 50000,
    minPaymentAmount: 1,
    allowInstallments: true,
    maxInstallments: 12,
    allowRefunds: true,
    webhookUrl: null,
    successUrl: null,
    cancelUrl: null
  }
};
```

Then run:

```bash
cd backend
bun run scripts/register-merchant.ts
```

This will:
1. Create a merchant account in the database
2. Generate a new API key with full permissions
3. Display the API key (save it securely!)

**Option B: Use the Web Interface**

1. Go to: https://sb0pay-678576192331.us-central1.run.app
2. Register a new account
3. Log in to the dashboard
4. Navigate to Settings → API Keys
5. Click "Generate New API Key"
6. Copy and save the generated key

### Step 4: Test the API Key

Once you have a valid API key, test it:

```bash
cd backend
bun run scripts/test-api-payment.ts YOUR_API_KEY_HERE
```

This will run comprehensive tests:
- ✅ Create a simple payment
- ✅ Create a payment with line items
- ✅ Retrieve payment details
- ✅ List payments

## API Usage Examples

### Create Payment with Line Items

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
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
    "maxInstallments": 12,
    "metadata": {
      "orderId": "12345",
      "source": "empaako-store"
    }
  }'
```

### Create Payment with Installments

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1200.00,
    "description": "Premium Package",
    "customerEmail": "customer@example.com",
    "maxInstallments": 12,
    "fixedInstallments": false
  }'
```

### Get Payment Status

```bash
curl -X GET https://sb0pay-678576192331.us-central1.run.app/api/v1/payments/PAYMENT_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### List All Payments

```bash
curl -X GET "https://sb0pay-678576192331.us-central1.run.app/api/v1/payments?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Cancel Payment

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments/PAYMENT_ID/cancel \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Refund Payment

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments/PAYMENT_ID/refund \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00
  }'
```

## API Features

Your API key supports:

### ✅ Payment Creation
- Line items support
- Customer information capture
- Installment payments (1-12 installments)
- QR code generation
- Custom metadata
- Expiration dates
- Success/cancel URLs
- Webhook notifications

### ✅ Payment Management
- Get payment details
- List payments with pagination
- Cancel pending payments
- Refund completed payments

### ✅ Security
- API key authentication
- Permission-based access control
- Request logging and analytics
- Rate limiting (if configured)

## Permissions

The default API key has these permissions:

```json
{
  "resource": "payments",
  "actions": ["create", "read", "update"]
}
```

This allows you to:
- ✅ Create new payments
- ✅ Read payment details
- ✅ Update payments (cancel, refund)

## Troubleshooting

### Error: "MISSING_API_KEY"
- Make sure you include the Authorization header
- Format: `Authorization: Bearer YOUR_API_KEY`

### Error: "INVALID_API_KEY"
- The API key is not registered or is invalid
- Run the check script to verify
- Generate a new API key if needed

### Error: "INSUFFICIENT_PERMISSIONS"
- Your API key doesn't have permission for this action
- Check your key's permissions in the dashboard
- Generate a new key with the required permissions

### Error: "INVALID_LINE_ITEMS"
- Line items total must match the payment amount
- Check that sum of (price × quantity) equals amount

### Error: "PAYMENT_PROVIDER_ERROR"
- The AllPay payment provider is unavailable
- Check your AllPay credentials in the backend .env
- Try again later

## API Documentation

Full interactive API documentation is available at:
https://sb0pay-678576192331.us-central1.run.app/docs

## Support

For additional help:
1. Check the API documentation
2. Review the error response details
3. Check the backend logs in Google Cloud Console
4. Contact support with your request ID from error responses

## Next Steps

1. ✅ Set up production database connection
2. ✅ Check if your API key exists
3. ✅ Register merchant account if needed
4. ✅ Generate new API key
5. ✅ Test the API key
6. ✅ Integrate with your Empaako e-commerce site
7. ✅ Set up webhooks for payment notifications
8. ✅ Monitor API usage in the dashboard

## Security Best Practices

- 🔒 Never commit API keys to version control
- 🔒 Store API keys in environment variables
- 🔒 Use different keys for development and production
- 🔒 Rotate API keys periodically
- 🔒 Monitor API usage for suspicious activity
- 🔒 Set expiration dates on API keys when possible
- 🔒 Use HTTPS for all API requests
