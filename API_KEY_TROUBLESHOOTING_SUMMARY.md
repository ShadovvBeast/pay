# API Key Troubleshooting - Summary

## What I Found

Your API key `sb0_live_0b6bf256ec92c38639a50f5183d801a5` is returning a 401 error because:

1. **The key is not registered in the production database**
   - The authentication middleware validates keys against the `api_keys` table
   - Your key needs to exist in the database with an associated user account

2. **The authentication flow requires:**
   - API key must exist in `api_keys` table
   - Key must be active (`is_active = true`)
   - Key must not be expired
   - Key must have a valid `user_id` reference
   - Key hash must match the provided key

## What I Created for You

### 1. Diagnostic Scripts

**`backend/scripts/diagnose-production.ts`**
- Checks database connection
- Lists all users and API keys
- Verifies your specific API key
- Shows transaction and usage statistics
- Provides actionable recommendations

**`backend/scripts/check-api-key.ts`**
- Validates a specific API key
- Shows key details and permissions
- Displays usage statistics
- Shows associated user information

### 2. Setup Scripts

**`backend/scripts/register-merchant.ts`**
- Creates a new merchant account
- Generates a new API key with full permissions
- Displays the key securely
- Provides usage examples

**`backend/scripts/test-api-payment.ts`**
- Tests payment creation with your API key
- Validates line items support
- Tests payment retrieval
- Tests payment listing
- Comprehensive API testing

### 3. Documentation

**`API_KEY_SETUP_GUIDE.md`**
- Complete setup guide
- Step-by-step instructions
- API usage examples
- Troubleshooting section
- Security best practices

**`QUICK_START_API.md`**
- Quick 3-step fix guide
- Common commands
- Example API calls
- Production checklist

### 4. Package.json Scripts

Added convenient npm/bun scripts:
```bash
bun run diagnose           # Diagnose production setup
bun run check-key <key>    # Check specific API key
bun run register-merchant  # Register new merchant
bun run test-api <key>     # Test API key
```

## How to Fix Your Issue

### Option 1: Quick Fix (Recommended)

```bash
# 1. Set your production database URL
export DATABASE_URL="postgresql://user:pass@host:port/db"

# 2. Run diagnostics
cd backend
bun run diagnose

# 3. Register merchant and get new API key
bun run register-merchant

# 4. Test the new key
bun run test-api YOUR_NEW_KEY
```

### Option 2: Use Web Interface

1. Go to https://sb0pay-678576192331.us-central1.run.app
2. Register/login
3. Navigate to Settings → API Keys
4. Generate new API key
5. Copy and save it

## Understanding the Error

The error you're seeing:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Authentication failed",
    "type": "api_error"
  }
}
```

This happens in `backend/middleware/apiAuth.ts` when:
- The API key validation fails
- The key is not found in the database
- An unexpected error occurs during validation

The middleware flow:
1. Extract API key from `Authorization: Bearer <key>` header
2. Get key prefix (first 16 chars)
3. Query database for matching prefix
4. Verify key hash matches
5. Check if key is active and not expired
6. Check permissions for the requested resource/action

## API Key Format

Your API keys follow this format:
- Prefix: `sb0_live_` (indicates production key)
- Random part: 32 hex characters
- Total length: 40 characters
- Example: `sb0_live_0b6bf256ec92c38639a50f5183d801a5`

## Database Schema

The `api_keys` table structure:
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  key_hash VARCHAR(255) UNIQUE,  -- Hashed version of the key
  prefix VARCHAR(20),             -- First 16 chars for lookup
  permissions JSONB,              -- Array of {resource, actions}
  is_active BOOLEAN,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Permissions Structure

Default permissions for payment API:
```json
[
  {
    "resource": "payments",
    "actions": ["create", "read", "update"]
  }
]
```

This allows:
- `create`: Create new payments
- `read`: Get payment details, list payments
- `update`: Cancel payments, process refunds

## API Endpoints Available

With a valid API key, you can access:

**POST /api/v1/payments**
- Create payment with line items
- Support installments (1-12)
- Capture customer info
- Generate QR codes

**GET /api/v1/payments/:id**
- Get payment details
- Check payment status

**GET /api/v1/payments**
- List all payments
- Pagination support

**POST /api/v1/payments/:id/cancel**
- Cancel pending payment

**POST /api/v1/payments/:id/refund**
- Refund completed payment
- Full or partial refunds

## Security Features

Your API implementation includes:
- ✅ API key hashing (bcrypt)
- ✅ Permission-based access control
- ✅ Request logging and analytics
- ✅ Rate limiting support
- ✅ Request ID tracking
- ✅ IP address logging
- ✅ User agent tracking

## Next Steps

1. **Immediate**: Run diagnostics to understand current state
2. **Setup**: Register merchant account and generate API key
3. **Test**: Verify API key works with test payments
4. **Integrate**: Update Empaako with new API key
5. **Monitor**: Check usage in dashboard
6. **Secure**: Store key in environment variables
7. **Webhooks**: Set up payment notifications

## Production Environment Variables

Make sure these are set in production:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# AllPay (Payment Provider)
ALLPAY_API_URL=https://allpay.to/app/?show=getpayment&mode=api8
ALLPAY_LOGIN=your_login
ALLPAY_API_KEY=your_allpay_key

# JWT
JWT_SECRET=your_secret_key

# Server
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

## Monitoring

After setup, monitor:
- API key usage in dashboard
- Transaction success rates
- Error rates and types
- Payment provider status
- Database connection health

## Support Resources

- **API Documentation**: https://sb0pay-678576192331.us-central1.run.app/docs
- **Dashboard**: https://sb0pay-678576192331.us-central1.run.app
- **Setup Guide**: [API_KEY_SETUP_GUIDE.md](./API_KEY_SETUP_GUIDE.md)
- **Quick Start**: [QUICK_START_API.md](./QUICK_START_API.md)

## Files Created

```
backend/scripts/
  ├── diagnose-production.ts      # Comprehensive diagnostics
  ├── check-api-key.ts            # Validate specific key
  ├── register-merchant.ts        # Create merchant & API key
  └── test-api-payment.ts         # Test API functionality

docs/
  ├── API_KEY_SETUP_GUIDE.md      # Complete setup guide
  ├── QUICK_START_API.md          # Quick fix guide
  └── API_KEY_TROUBLESHOOTING_SUMMARY.md  # This file
```

## Contact

If you need further assistance:
1. Run the diagnostic script and share the output
2. Check the backend logs in Google Cloud Console
3. Verify your database connection string
4. Ensure all environment variables are set correctly

---

**Ready to fix your API key issue? Start with:**
```bash
cd backend
bun run diagnose
```
