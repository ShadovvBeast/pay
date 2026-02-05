# Enhanced API Features - Line Items & AllPay Capabilities

## Overview
The API has been significantly enhanced to support line items and expose more of the underlying AllPay payment processor's capabilities, providing a more elegant and feature-rich payment experience.

## New Features

### 1. Line Items Support
Payments now support itemized line items for detailed invoicing:

```json
{
  "amount": 250.00,
  "lineItems": [
    {
      "name": "Product A",
      "price": 150.00,
      "quantity": 1,
      "includesVat": true
    },
    {
      "name": "Product B", 
      "price": 100.00,
      "quantity": 1,
      "includesVat": true
    }
  ]
}
```

**Benefits:**
- Detailed invoice breakdown for customers
- Better accounting and reporting
- VAT handling per line item (18% included or 0%)
- Automatic validation that line items sum to total amount

### 2. Installment Payments
Support for Israeli credit card installments:

```json
{
  "amount": 1000.00,
  "maxInstallments": 6,
  "fixedInstallments": false
}
```

- `maxInstallments`: 1-12 installments allowed
- `fixedInstallments`: If true, customer must use exact installment count

### 3. Payment Expiration
Set custom expiration times for payment links:

```json
{
  "expiresAt": "2025-02-10T23:59:59Z"
}
```

Default is 1 hour if not specified.

### 4. Customer Information
Enhanced customer data capture:

```json
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+972501234567",
  "customerIdNumber": "123456789"
}
```

- `customerIdNumber`: Israeli ID number (tehudat zehut) for compliance

### 5. Payment Method Options
Control which payment methods are displayed:

```json
{
  "showApplePay": true,
  "showBit": true
}
```

### 6. Pre-authorization
Authorize payments without immediate capture:

```json
{
  "preauthorize": true
}
```

Useful for reservations, deposits, or delayed fulfillment.

### 7. Custom Fields
Two custom fields for merchant-specific data:

```json
{
  "customField1": "Internal Order ID: 12345",
  "customField2": "Warehouse: North"
}
```

These are passed through to AllPay and returned in webhooks.

## Database Changes

### Migration: 004_add_payment_features.sql
Adds the following columns to the `transactions` table:

- `description` - Payment description text
- `line_items` - JSONB array of line items
- `customer_email` - Customer email address
- `customer_name` - Customer full name
- `customer_phone` - Customer phone number
- `customer_id_number` - Israeli ID number
- `max_installments` - Maximum installments (1-12)
- `fixed_installments` - Boolean for fixed installment requirement
- `expires_at` - Payment expiration timestamp
- `preauthorize` - Boolean for pre-authorization
- `custom_field_1` - Custom merchant field
- `custom_field_2` - Custom merchant field
- `success_url` - Custom success redirect URL
- `cancel_url` - Custom cancel redirect URL
- `webhook_url` - Custom webhook URL
- `metadata` - JSONB for additional data
- `api_key_id` - Reference to API key used

**To apply the migration:**
```bash
bun run db:migrate
```

## API Changes

### Updated Types

**PublicLineItem:**
```typescript
{
  name: string;
  price: number;
  quantity: number;
  includesVat?: boolean; // true = 18% VAT, false = 0% VAT
}
```

**PublicCreatePaymentRequest:**
All new fields are optional and backward compatible:
- `lineItems?: PublicLineItem[]`
- `customerIdNumber?: string`
- `maxInstallments?: number`
- `fixedInstallments?: boolean`
- `expiresAt?: string`
- `preauthorize?: boolean`
- `showApplePay?: boolean`
- `showBit?: boolean`
- `customField1?: string`
- `customField2?: string`

### Example API Call

```bash
curl -X POST https://api.sb0pay.com/api/v1/payments \
  -H "Authorization: Bearer sb0_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "currency": "ILS",
    "description": "Order #12345",
    "lineItems": [
      {
        "name": "Premium Widget",
        "price": 150.00,
        "quantity": 1,
        "includesVat": true
      },
      {
        "name": "Shipping",
        "price": 100.00,
        "quantity": 1,
        "includesVat": false
      }
    ],
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "customerIdNumber": "123456789",
    "maxInstallments": 3,
    "expiresAt": "2025-02-10T23:59:59Z",
    "showBit": true,
    "metadata": {
      "orderId": "12345",
      "source": "web"
    }
  }'
```

## Validation

### Line Items Validation
- Line items total must match payment amount (within 1 cent tolerance)
- Each item must have name, price, and quantity
- Price must be >= 0
- Quantity must be >= 1

### Installments Validation
- Must be between 1 and 12
- Only applicable for Israeli credit cards

### Expiration Validation
- Must be ISO 8601 format
- Must be in the future
- Defaults to 1 hour if not specified

## Backward Compatibility

All new fields are optional. Existing API integrations will continue to work without modification. The API remains fully backward compatible.

## Updated Documentation

The API documentation has been updated to reflect all new features:
- `/api/docs` - Interactive documentation
- `/api/docs/openapi.json` - OpenAPI 3.0 specification

## Implementation Details

### Files Modified

**Backend:**
- `backend/types/index.ts` - Added new type definitions
- `backend/services/allpay.ts` - Enhanced AllPay client with new options
- `backend/services/payment.ts` - Updated payment service
- `backend/services/transactionRepository.ts` - Added new field handling
- `backend/controllers/publicApi.ts` - Enhanced API endpoints with validation
- `backend/controllers/docs.ts` - Updated documentation
- `backend/database/migrations/004_add_payment_features.sql` - New migration

### Key Improvements

1. **Elegant API Design**: All features are optional and intuitive
2. **Type Safety**: Full TypeScript support with proper validation
3. **AllPay Feature Parity**: Exposes most AllPay capabilities in a cleaner interface
4. **Validation**: Comprehensive input validation with helpful error messages
5. **Documentation**: Complete examples and OpenAPI specification

## Next Steps

1. Run the database migration: `bun run db:migrate`
2. Test the new features with your API key
3. Update your integration to use line items and other features as needed
4. Review the updated API documentation at `/api/docs`

## Support

For questions or issues with the new features, refer to:
- API Documentation: `/api/docs`
- OpenAPI Spec: `/api/docs/openapi.json`
- Migration file: `backend/database/migrations/004_add_payment_features.sql`
