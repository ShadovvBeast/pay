#!/bin/bash
# Quick API test script using curl
# Usage: ./test-api-curl.sh YOUR_API_KEY

API_KEY=$1
API_BASE_URL=${API_BASE_URL:-"https://sb0pay-678576192331.us-central1.run.app/api/v1"}

if [ -z "$API_KEY" ]; then
    echo "Usage: ./test-api-curl.sh YOUR_API_KEY"
    exit 1
fi

echo "🧪 Testing SB0 Pay API"
echo "====================="
echo ""
echo "API Base URL: $API_BASE_URL"
echo "API Key: ${API_KEY:0:20}..."
echo ""

# Test 1: Create a simple payment
echo "Test 1: Creating a simple payment..."
echo "------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE_URL/payments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Test Payment - Simple",
    "customerEmail": "test@example.com",
    "customerName": "Test Customer"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ Simple payment created successfully!"
    PAYMENT_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    echo "Payment ID: $PAYMENT_ID"
    echo ""
    
    # Test 2: Get payment details
    echo "Test 2: Getting payment details..."
    echo "-----------------------------------"
    RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_BASE_URL/payments/$PAYMENT_ID" \
      -H "Authorization: Bearer $API_KEY")
    
    HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS/d')
    
    echo "Status: $HTTP_STATUS2"
    echo "Response:"
    echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
    echo ""
    
    if [ "$HTTP_STATUS2" = "200" ]; then
        echo "✅ Payment details retrieved successfully!"
    else
        echo "❌ Failed to retrieve payment details"
    fi
    echo ""
else
    echo "❌ Failed to create simple payment"
    echo ""
fi

# Test 3: Create payment with line items
echo "Test 3: Creating payment with line items..."
echo "--------------------------------------------"
RESPONSE3=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE_URL/payments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "description": "Test Payment - With Line Items",
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
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "customerPhone": "+972501234567",
    "maxInstallments": 12,
    "metadata": {
      "orderId": "TEST-'$(date +%s)'",
      "source": "curl-test"
    }
  }')

HTTP_STATUS3=$(echo "$RESPONSE3" | grep "HTTP_STATUS" | cut -d: -f2)
BODY3=$(echo "$RESPONSE3" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS3"
echo "Response:"
echo "$BODY3" | jq '.' 2>/dev/null || echo "$BODY3"
echo ""

if [ "$HTTP_STATUS3" = "201" ]; then
    echo "✅ Payment with line items created successfully!"
    PAYMENT_ID3=$(echo "$BODY3" | jq -r '.id' 2>/dev/null)
    PAYMENT_URL=$(echo "$BODY3" | jq -r '.paymentUrl' 2>/dev/null)
    echo "Payment ID: $PAYMENT_ID3"
    echo "Payment URL: $PAYMENT_URL"
else
    echo "❌ Failed to create payment with line items"
fi
echo ""

# Test 4: List payments
echo "Test 4: Listing payments..."
echo "---------------------------"
RESPONSE4=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_BASE_URL/payments?limit=5" \
  -H "Authorization: Bearer $API_KEY")

HTTP_STATUS4=$(echo "$RESPONSE4" | grep "HTTP_STATUS" | cut -d: -f2)
BODY4=$(echo "$RESPONSE4" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS4"
echo "Response:"
echo "$BODY4" | jq '.' 2>/dev/null || echo "$BODY4"
echo ""

if [ "$HTTP_STATUS4" = "200" ]; then
    echo "✅ Payments listed successfully!"
    TOTAL=$(echo "$BODY4" | jq -r '.pagination.total' 2>/dev/null)
    echo "Total payments: $TOTAL"
else
    echo "❌ Failed to list payments"
fi
echo ""

echo "═══════════════════════════════════════"
echo "🎉 API Testing Complete!"
echo "═══════════════════════════════════════"
