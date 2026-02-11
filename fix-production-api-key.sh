#!/bin/bash
# Production API Key Fix Script
# This script connects to production database and fixes the API key issue

set -e

API_KEY="sb0_live_0b6bf256ec92c38639a50f5183d801a5"
PROD_API_URL="https://sb0pay-678576192331.us-central1.run.app/api/v1"

echo "🔧 SB0 Pay Production API Key Fix"
echo "=================================="
echo ""
echo "Target API: $PROD_API_URL"
echo "API Key: ${API_KEY:0:20}..."
echo ""

# Step 1: Test current API key
echo "Step 1: Testing current API key..."
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$PROD_API_URL/payments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1.00,
    "description": "Test Payment"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $BODY" | head -c 200
echo ""
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ API key is working! No fix needed."
    exit 0
fi

if [ "$HTTP_STATUS" = "401" ]; then
    echo "❌ API key authentication failed (401)"
    echo ""
    echo "The API key is not registered in the production database."
    echo ""
fi

# Step 2: Check if we have database access
echo "Step 2: Checking database access..."
echo "------------------------------------"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo ""
    echo "To fix this issue, you need to:"
    echo ""
    echo "1. Get the production database URL from Google Cloud Secret Manager:"
    echo "   gcloud secrets versions access latest --secret=SB0PAY_DATABASE_URL --project=sbzero"
    echo ""
    echo "2. Set it as an environment variable:"
    echo "   export DATABASE_URL=\"postgresql://...\""
    echo ""
    echo "3. Run this script again:"
    echo "   ./fix-production-api-key.sh"
    echo ""
    echo "OR use the web interface:"
    echo "   1. Go to: https://sb0pay-678576192331.us-central1.run.app"
    echo "   2. Register/login"
    echo "   3. Go to Settings → API Keys"
    echo "   4. Generate a new API key"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Step 3: Run the registration script
echo "Step 3: Registering merchant and generating API key..."
echo "-------------------------------------------------------"
cd backend
bun run scripts/register-merchant.ts

echo ""
echo "✅ New API key generated!"
echo ""
echo "Next steps:"
echo "1. Copy the API key shown above"
echo "2. Update your Empaako integration with the new key"
echo "3. Test with: ./test-api-curl.sh YOUR_NEW_KEY"
