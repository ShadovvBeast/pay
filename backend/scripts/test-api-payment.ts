#!/usr/bin/env bun
/**
 * Script to test payment creation with an API key
 * Usage: bun run backend/scripts/test-api-payment.ts <api-key>
 */

const API_KEY = process.argv[2];
const API_BASE_URL = process.env.API_BASE_URL || 'https://sb0pay-678576192331.us-central1.run.app/api/v1';

if (!API_KEY) {
  console.error('Usage: bun run backend/scripts/test-api-payment.ts <api-key>');
  process.exit(1);
}

async function testPaymentCreation() {
  try {
    console.log('🧪 Testing Payment Creation');
    console.log('==========================');
    console.log('');
    console.log('API Base URL:', API_BASE_URL);
    console.log('API Key:', API_KEY.substring(0, 20) + '...');
    console.log('');

    // Test 1: Create a simple payment
    console.log('Test 1: Creating a simple payment...');
    const simplePayment = {
      amount: 100.00,
      description: 'Test Payment - Simple',
      customerEmail: 'test@example.com',
      customerName: 'Test Customer'
    };

    const response1 = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simplePayment)
    });

    console.log('Status:', response1.status, response1.statusText);
    const result1 = await response1.json();
    console.log('Response:', JSON.stringify(result1, null, 2));
    console.log('');

    if (response1.ok) {
      console.log('✅ Simple payment created successfully!');
      console.log('  Payment ID:', result1.id);
      console.log('  Amount:', result1.amount, result1.currency);
      console.log('  Status:', result1.status);
      console.log('  Payment URL:', result1.paymentUrl);
      console.log('');
    } else {
      console.log('❌ Failed to create simple payment');
      console.log('');
    }

    // Test 2: Create payment with line items
    console.log('Test 2: Creating payment with line items...');
    const lineItemsPayment = {
      amount: 250.00,
      description: 'Test Payment - With Line Items',
      lineItems: [
        {
          name: 'Product A',
          price: 100.00,
          quantity: 2,
          includesVat: true
        },
        {
          name: 'Product B',
          price: 50.00,
          quantity: 1,
          includesVat: true
        }
      ],
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
      customerPhone: '+972501234567',
      maxInstallments: 12,
      metadata: {
        orderId: 'TEST-' + Date.now(),
        source: 'api-test'
      }
    };

    const response2 = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lineItemsPayment)
    });

    console.log('Status:', response2.status, response2.statusText);
    const result2 = await response2.json();
    console.log('Response:', JSON.stringify(result2, null, 2));
    console.log('');

    if (response2.ok) {
      console.log('✅ Payment with line items created successfully!');
      console.log('  Payment ID:', result2.id);
      console.log('  Amount:', result2.amount, result2.currency);
      console.log('  Status:', result2.status);
      console.log('  Line Items:', result2.lineItems?.length || 0);
      console.log('  Payment URL:', result2.paymentUrl);
      console.log('');

      // Test 3: Get payment details
      console.log('Test 3: Retrieving payment details...');
      const response3 = await fetch(`${API_BASE_URL}/payments/${result2.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      console.log('Status:', response3.status, response3.statusText);
      const result3 = await response3.json();
      console.log('Response:', JSON.stringify(result3, null, 2));
      console.log('');

      if (response3.ok) {
        console.log('✅ Payment details retrieved successfully!');
        console.log('');
      } else {
        console.log('❌ Failed to retrieve payment details');
        console.log('');
      }

      // Test 4: List payments
      console.log('Test 4: Listing payments...');
      const response4 = await fetch(`${API_BASE_URL}/payments?limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      console.log('Status:', response4.status, response4.statusText);
      const result4 = await response4.json();
      console.log('Response:', JSON.stringify(result4, null, 2));
      console.log('');

      if (response4.ok) {
        console.log('✅ Payments listed successfully!');
        console.log('  Total payments:', result4.pagination?.total || 0);
        console.log('  Returned:', result4.data?.length || 0);
        console.log('');
      } else {
        console.log('❌ Failed to list payments');
        console.log('');
      }

    } else {
      console.log('❌ Failed to create payment with line items');
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('🎉 API Testing Complete!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error testing API:', error);
    process.exit(1);
  }
}

testPaymentCreation();
