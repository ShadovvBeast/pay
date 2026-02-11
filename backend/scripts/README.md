# SB0 Pay Backend Scripts

Utility scripts for managing API keys, merchants, and production diagnostics.

## Prerequisites

1. Set your production database URL:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

2. Make sure you're in the backend directory:
```bash
cd backend
```

## Scripts

### 1. Diagnose Production Setup

**Purpose**: Comprehensive diagnostics of your production environment

```bash
bun run diagnose
# or
bun run scripts/diagnose-production.ts
```

**What it checks:**
- ✅ Environment variables
- ✅ Database connection
- ✅ Database schema and tables
- ✅ User accounts
- ✅ API keys (all and specific)
- ✅ Transaction statistics
- ✅ API usage logs
- ✅ Actionable recommendations

**When to use:**
- First time setup
- Troubleshooting authentication issues
- Checking system health
- Before deploying changes

---

### 2. Check API Key

**Purpose**: Validate and inspect a specific API key

```bash
bun run check-key YOUR_API_KEY
# or
bun run scripts/check-api-key.ts YOUR_API_KEY
```

**What it shows:**
- ✅ Key validity and status
- ✅ Key details (ID, name, prefix)
- ✅ Associated user information
- ✅ Permissions
- ✅ Usage statistics (last 30 days)
- ✅ Last used timestamp
- ✅ Expiration date

**When to use:**
- Verifying a key is registered
- Checking key permissions
- Investigating authentication errors
- Auditing key usage

**Example:**
```bash
bun run check-key sb0_live_0b6bf256ec92c38639a50f5183d801a5
```

---

### 3. Register Merchant

**Purpose**: Create a new merchant account and generate an API key

```bash
bun run register-merchant
# or
bun run scripts/register-merchant.ts
```

**What it does:**
1. Checks database connection
2. Creates merchant account (or uses existing)
3. Generates new API key with full permissions
4. Displays the API key (save it!)
5. Shows usage examples

**Configuration:**
Edit the script to customize merchant details:
```typescript
const merchantData = {
  email: 'your-email@example.com',
  password: 'YourSecurePassword123!',
  shopName: 'Your Shop Name',
  ownerName: 'Your Name',
  merchantConfig: {
    currency: 'ILS',
    maxPaymentAmount: 50000,
    minPaymentAmount: 1,
    allowInstallments: true,
    maxInstallments: 12,
    allowRefunds: true
  }
};
```

**When to use:**
- First time setup
- Creating additional merchant accounts
- Generating new API keys
- Replacing compromised keys

**Output:**
```
═══════════════════════════════════════════════════════════
🔐 YOUR API KEY (Save this securely!)
═══════════════════════════════════════════════════════════

sb0_live_abc123def456...

═══════════════════════════════════════════════════════════
```

---

### 4. Test API Payment

**Purpose**: Comprehensive API testing with a given API key

```bash
bun run test-api YOUR_API_KEY
# or
bun run scripts/test-api-payment.ts YOUR_API_KEY
```

**What it tests:**
1. ✅ Simple payment creation
2. ✅ Payment with line items
3. ✅ Payment with installments
4. ✅ Customer information capture
5. ✅ Metadata support
6. ✅ Payment retrieval
7. ✅ Payment listing

**When to use:**
- After generating a new API key
- Verifying API functionality
- Testing before production deployment
- Debugging integration issues

**Example:**
```bash
bun run test-api sb0_live_abc123def456...
```

**Output:**
```
🧪 Testing Payment Creation
==========================

Test 1: Creating a simple payment...
Status: 201 Created
✅ Simple payment created successfully!
  Payment ID: 550e8400-e29b-41d4-a716-446655440000
  Amount: 100.00 ILS
  Status: pending
  Payment URL: https://...

Test 2: Creating payment with line items...
✅ Payment with line items created successfully!
...
```

---

## Common Workflows

### First Time Setup

```bash
# 1. Check current state
bun run diagnose

# 2. Register merchant and get API key
bun run register-merchant

# 3. Test the API key
bun run test-api YOUR_NEW_KEY
```

### Troubleshooting 401 Errors

```bash
# 1. Check if key exists
bun run check-key YOUR_API_KEY

# 2. If not found, register new merchant
bun run register-merchant

# 3. Test new key
bun run test-api YOUR_NEW_KEY
```

### Auditing API Keys

```bash
# 1. Run diagnostics to see all keys
bun run diagnose

# 2. Check specific key details
bun run check-key SPECIFIC_KEY

# 3. Check usage statistics
# (included in check-key output)
```

### Generating Additional Keys

```bash
# Option 1: Use the script (creates new merchant)
bun run register-merchant

# Option 2: Use the web interface
# 1. Login to dashboard
# 2. Go to Settings → API Keys
# 3. Click "Generate New API Key"
```

---

## Environment Variables

These scripts use the following environment variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional (for test-api script)
API_BASE_URL=https://sb0pay-678576192331.us-central1.run.app/api/v1
```

### Google Cloud SQL Connection

For Cloud SQL, use the Unix socket format:
```bash
export DATABASE_URL="postgresql://user:password@/database?host=/cloudsql/PROJECT:REGION:INSTANCE"
```

---

## Troubleshooting

### "Failed to connect to database"

**Problem**: Database connection failed

**Solutions:**
1. Check DATABASE_URL is set: `echo $DATABASE_URL`
2. Verify credentials are correct
3. Ensure database is accessible from your location
4. Check firewall rules (for Cloud SQL)
5. Verify database exists

### "No users found in database"

**Problem**: No merchant accounts exist

**Solution:**
```bash
bun run register-merchant
```

### "API key not found"

**Problem**: The API key doesn't exist in the database

**Solutions:**
1. Generate a new key: `bun run register-merchant`
2. Use the web interface to generate a key
3. Check if you're using the correct database

### "Migration failed"

**Problem**: Database schema is not up to date

**Solution:**
```bash
# Run the main server to apply migrations
bun run start
```

---

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit API keys to version control**
   - Use environment variables
   - Add keys to .gitignore

2. **Store keys securely**
   - Use secret management services
   - Encrypt keys at rest

3. **Rotate keys regularly**
   - Generate new keys periodically
   - Deactivate old keys

4. **Monitor usage**
   - Check usage logs regularly
   - Set up alerts for unusual activity

5. **Use different keys for different environments**
   - Development keys
   - Staging keys
   - Production keys

---

## Script Details

### diagnose-production.ts

**Dependencies:**
- `../services/database.js`

**Database queries:**
- Lists all tables
- Counts users
- Lists API keys with user info
- Checks specific API key prefix
- Transaction statistics
- API usage logs

**Exit codes:**
- 0: Success
- 1: Error (connection failed, etc.)

---

### check-api-key.ts

**Dependencies:**
- `../services/database.js`
- `../services/apiKey.js`
- `../services/repository.js`

**Validates:**
- Key format
- Key existence
- Key status (active/inactive)
- Key expiration
- Associated user
- Permissions

**Exit codes:**
- 0: Success (key valid or invalid)
- 1: Error (connection failed, etc.)

---

### register-merchant.ts

**Dependencies:**
- `../services/database.js`
- `../services/apiKey.js`
- `../services/repository.js`
- `../utils/password.js`

**Creates:**
- User account (if doesn't exist)
- API key with full permissions

**Permissions granted:**
```json
[
  {
    "resource": "payments",
    "actions": ["create", "read", "update"]
  }
]
```

**Exit codes:**
- 0: Success
- 1: Error

---

### test-api-payment.ts

**Dependencies:**
- Native fetch API

**Tests:**
1. POST /api/v1/payments (simple)
2. POST /api/v1/payments (with line items)
3. GET /api/v1/payments/:id
4. GET /api/v1/payments

**Exit codes:**
- 0: Success (tests completed)
- 1: Error

---

## Additional Resources

- **API Documentation**: https://sb0pay-678576192331.us-central1.run.app/docs
- **Dashboard**: https://sb0pay-678576192331.us-central1.run.app
- **Setup Guide**: [../API_KEY_SETUP_GUIDE.md](../API_KEY_SETUP_GUIDE.md)
- **Quick Start**: [../QUICK_START_API.md](../QUICK_START_API.md)

---

## Contributing

When adding new scripts:

1. Follow the existing naming convention
2. Add comprehensive error handling
3. Include helpful console output
4. Document in this README
5. Add to package.json scripts section
6. Test with production database

---

## Support

For issues or questions:
1. Run `bun run diagnose` and share output
2. Check backend logs in Google Cloud Console
3. Verify environment variables are set
4. Review the setup guides
