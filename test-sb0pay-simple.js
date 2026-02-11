#!/usr/bin/env node
/**
 * Simple test script to verify SB0 Pay API key works
 * Run: node test-sb0pay-simple.js
 */

const https = require('https');

console.log('🧪 Testing SB0 Pay API');
console.log('======================\n');

const API_KEY = 'sb0_live_0b6bf256ec92c38639a50f5183d801a5';
const API_URL = 'https://sb0pay-678576192331.us-central1.run.app/api/v1/payments';

console.log('API Key:', API_KEY.substring(0, 20) + '...');
console.log('API URL:', API_URL);
console.log('\n📤 Sending request...\n');

const data = JSON.stringify({
  amount: 100.00,
  description: 'Empaako Test Payment',
  customerEmail: 'test@empaako.com',
  customerName: 'Test Customer'
});

const options = {
  hostname: 'sb0pay-678576192331.us-central1.run.app',
  port: 443,
  path: '/api/v1/payments',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Request Headers:');
console.log('  Authorization:', options.headers.Authorization.substring(0, 30) + '...');
console.log('  Content-Type:', options.headers['Content-Type']);
console.log('\nRequest Body:');
console.log(JSON.stringify(JSON.parse(data), null, 2));
console.log('\n' + '='.repeat(50) + '\n');

const req = https.request(options, (res) => {
  console.log('📥 Response received\n');
  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('\nResponse Headers:');
  Object.keys(res.headers).forEach(key => {
    console.log(`  ${key}:`, res.headers[key]);
  });

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\n' + '='.repeat(50) + '\n');
      
      if (res.statusCode === 201) {
        console.log('✅ SUCCESS! Payment created');
        console.log('\nPayment Details:');
        console.log('  ID:', parsed.id);
        console.log('  Amount:', parsed.amount, parsed.currency);
        console.log('  Status:', parsed.status);
        console.log('  Payment URL:', parsed.paymentUrl);
        console.log('\n🎉 Your API key is working correctly!');
      } else {
        console.log('❌ FAILED! Status:', res.statusCode);
        if (parsed.error) {
          console.log('\nError Details:');
          console.log('  Code:', parsed.error.code);
          console.log('  Message:', parsed.error.message);
          console.log('  Type:', parsed.error.type);
        }
      }
    } catch (e) {
      console.log(body);
      console.log('\n❌ Failed to parse response as JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Error:', error.message);
  console.error('\nPossible causes:');
  console.error('  - Network connectivity issues');
  console.error('  - DNS resolution problems');
  console.error('  - Firewall blocking HTTPS');
});

req.write(data);
req.end();
