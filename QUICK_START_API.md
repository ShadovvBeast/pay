# Quick Start: Fix Your API Key Issue

## Problem
Your API key `sb0_live_0b6bf256ec92c38639a50f5183d801a5` is returning 401 authentication errors.

## Quick Fix (3 Steps)

### Step 1: Set Production Database URL

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

For Google Cloud SQL:
```bash
export DATABASE_URL="postgresql://user:password@/sb0_pay?host=/cloudsql/PROJECT:REGION:INSTANCE"
```

### Step 2: Diagnose the Issue

```bash
cd backend
bun run diagnose
```

This will tell you exactly what's wrong:
- ✅ Database connection status
- ✅ Whether your API key exists
- ✅ User accounts status
- ✅ What needs to be fixed

### Step 3: Fix Based on Diagnosis

**If API key doesn't exist:**
```bash
cd backend
bun run register-merchant
```

This will:
1. Create a merchant account
2. Generate a new API key
3. Display the key (save it!)

**If you already have an account:**
- Log in to: https://sb0pay-678576192331.us-central1.run.app
- Go to Settings → API Keys
- Generate a new key

### Step 4: Test Your API Key

```bash
cd backend
bun run test-api YOUR_NEW_API_KEY
```

## Available Commands

```bash
# Diagnose production setup
bun run diagnose

# Check if a specific API key exists
bun run check-key YOUR_API_KEY

# Register new merchant and generate API key
bun run register-merchant

# Test API key with payment creation
bun run test-api YOUR_API_KEY
```

## Example: Create a Payment

Once you have a valid API key:

```bash
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Test Payment",
    "lineItems": [
      {
        "name": "Product 1",
        "price": 100.00,
        "quantity": 1
      }
    ],
    "customerEmail": "customer@example.com",
    "maxInstallments": 12
  }'
```

## What Your API Key Can Do

✅ Create payments with line items
✅ Support 1-12 installments
✅ Capture customer information
✅ Generate QR codes
✅ Set up webhooks
✅ Get payment status
✅ List all payments
✅ Cancel payments
✅ Refund payments

## Need More Help?

See the full guide: [API_KEY_SETUP_GUIDE.md](./API_KEY_SETUP_GUIDE.md)

## Common Issues

### "Failed to connect to database"
- Check your DATABASE_URL is set correctly
- Verify database credentials
- Ensure database is accessible from your location

### "API key not found"
- The key isn't registered in the database
- Run `bun run register-merchant` to create a new one

### "INSUFFICIENT_PERMISSIONS"
- Your API key doesn't have the right permissions
- Generate a new key with full permissions

### "INVALID_LINE_ITEMS"
- Line items total must equal payment amount
- Check: sum of (price × quantity) = amount

## Production Checklist

- [ ] Set DATABASE_URL environment variable
- [ ] Run diagnostics to check setup
- [ ] Register merchant account (if needed)
- [ ] Generate API key
- [ ] Test API key with test payment
- [ ] Update your Empaako integration with new key
- [ ] Set up webhook URL for payment notifications
- [ ] Monitor API usage in dashboard

## Support

- API Docs: https://sb0pay-678576192331.us-central1.run.app/docs
- Dashboard: https://sb0pay-678576192331.us-central1.run.app
- Full Guide: [API_KEY_SETUP_GUIDE.md](./API_KEY_SETUP_GUIDE.md)
