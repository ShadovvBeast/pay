# Changelog

All notable changes to SB0 Pay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-11

### 🚀 Added

#### Language & Currency Overrides
- **Per-Request Language**: Override merchant default language per payment request
- **Supported Languages**: Hebrew (he), English (en), Arabic (ar), Russian (ru), Auto-detect (auto)
- **Per-Request Currency**: Override merchant default currency per payment request
- **Supported Currencies**: ILS, USD, EUR (via AllPay)
- **Flexible Configuration**: Defaults to merchant settings when not specified

### 🐛 Fixed

#### Line Items Support
- **Critical Bug Fix**: Line item prices now correctly converted to minor units (agorot) for AllPay API
- **Amount Format Clarification**: API accepts decimal amounts (e.g., 342.60), not minor units
- **Validation Improvements**: Removed overly strict format validators for URLs and emails
- **Database Mapping**: Fixed missing line items and enhanced payment fields in repository mapping
- **JSONB Handling**: Proper handling of PostgreSQL JSONB columns that return objects directly
- **Transaction Creation**: All enhanced payment fields now properly stored in database

### 🔧 Enhanced

#### API Documentation
- **Version 1.2.0**: Updated API version to reflect new features
- **Amount Format**: Clarified that amounts are in decimal format, not minor units
- **Line Items Validation**: Added note about sum validation (±0.01 tolerance)
- **Language Parameter**: Documented new language parameter with supported values
- **Currency Parameter**: Enhanced currency documentation with supported currencies
- **Important Notes Section**: Added section highlighting key API behaviors

#### Error Handling
- **Detailed Validation Errors**: Improved error messages to show specific validation failures
- **Better Debugging**: Enhanced error responses with structured validation details
- **User-Friendly Messages**: Clearer error messages for common validation issues

### 📚 Documentation Updates
- **LINE_ITEMS_FIX_SUMMARY.md**: Comprehensive documentation of line items bug fix
- **API Examples**: Updated examples to show correct decimal amount format
- **Language Examples**: Added examples showing language parameter usage
- **Currency Examples**: Added examples showing currency override usage

### 🛠️ Technical Details

#### Modified Files
- `backend/services/allpay.ts` - Fixed line item price conversion to minor units
- `backend/controllers/publicApi.ts` - Added language parameter, relaxed validation
- `backend/services/payment.ts` - Pass currency and language overrides to AllPay
- `backend/services/repository.ts` - Fixed JSONB parsing and added missing fields
- `backend/types/index.ts` - Added language field to request types
- `backend/controllers/docs.ts` - Updated version and documentation
- `backend/index.ts` - Improved validation error handling

### 🎯 Breaking Changes
None - All changes are backward compatible. Existing integrations continue working without modification.

### 💡 Example Usage

```json
{
  "amount": 342.6,
  "currency": "ILS",
  "language": "en",
  "description": "International Order",
  "lineItems": [
    {
      "name": "Product A",
      "price": 82.6,
      "quantity": 1,
      "includesVat": true
    },
    {
      "name": "Shipping to US",
      "price": 260,
      "quantity": 1,
      "includesVat": false
    }
  ]
}
```

---

## [0.4.0] - 2025-02-05

### 🚀 Added - Enhanced Payment Features & AllPay Capabilities

#### Line Items Support
- **Itemized Payments**: Support for detailed line items with individual products, prices, and quantities
- **VAT Handling**: Per-item VAT configuration (18% included or 0% VAT)
- **Automatic Validation**: Line items total automatically validated against payment amount
- **Invoice Details**: Better accounting and reporting with itemized breakdowns

#### Installment Payments
- **Israeli Credit Card Installments**: Support for 1-12 installment payments
- **Flexible or Fixed**: Choose between flexible installment options or fixed installment count
- **Customer Choice**: Allow customers to select installment count at payment time

#### Payment Expiration
- **Custom Expiration**: Set custom expiration times for payment links
- **ISO 8601 Format**: Standard timestamp format for expiration dates
- **Default Handling**: Automatic 1-hour default if not specified

#### Enhanced Customer Information
- **Customer ID Number**: Israeli ID number (tehudat zehut) capture for compliance
- **Extended Customer Data**: Enhanced email, name, and phone number handling
- **Compliance Support**: Better support for regulatory requirements

#### Payment Method Controls
- **Apple Pay Toggle**: Control Apple Pay payment method visibility
- **Bit Payment Toggle**: Control Bit payment method visibility
- **Payment Method Flexibility**: Show/hide payment options based on merchant preferences

#### Pre-authorization
- **Authorization Without Capture**: Support for pre-authorization payments
- **Reservation Support**: Ideal for hotel bookings, car rentals, and deposits
- **Delayed Fulfillment**: Authorize now, capture later workflow

#### Custom Merchant Fields
- **Two Custom Fields**: Merchant-specific data fields for internal tracking
- **Webhook Pass-through**: Custom fields returned in webhook notifications
- **Flexible Usage**: Use for order IDs, warehouse codes, or any custom data

### 🔧 Enhanced

#### API Version
- **API Version 1.1.0**: Updated API documentation version
- **Backward Compatible**: All new features are optional, existing integrations unaffected
- **Enhanced Documentation**: Complete examples showing new capabilities

#### Database Schema
- **Migration 004**: New migration for enhanced payment features
- **New Transaction Fields**: 
  - `description` - Payment description text
  - `line_items` - JSONB array of line items
  - `customer_id_number` - Israeli ID number
  - `max_installments` - Maximum installments (1-12)
  - `fixed_installments` - Fixed installment requirement
  - `expires_at` - Payment expiration timestamp
  - `preauthorize` - Pre-authorization flag
  - `custom_field_1` & `custom_field_2` - Custom merchant fields
  - `success_url`, `cancel_url`, `webhook_url` - Custom URLs
  - `metadata` - Additional JSONB data
  - `api_key_id` - API key reference
- **Indexed Fields**: Performance indexes on customer_email, expires_at, and api_key_id

#### Type System
- **PublicLineItem Interface**: New type for line item structure
- **Enhanced Request Types**: Updated PublicCreatePaymentRequest with all new fields
- **Enhanced Response Types**: Updated PublicPaymentResponse with line items and expiration
- **Transaction Type Updates**: Extended Transaction interface with new fields

#### AllPay Integration
- **Enhanced AllPay Client**: Updated to support all new AllPay API features
- **Options Parameter**: New options object for passing enhanced features to AllPay
- **Feature Mapping**: Proper mapping of features to AllPay API parameters
- **Signature Generation**: Updated signature generation for new fields

#### Services & Repositories
- **Payment Service**: Enhanced to handle all new payment features
- **Transaction Repository**: Updated CREATE and SELECT queries for new fields
- **JSON Field Handling**: Proper serialization/deserialization of JSONB fields
- **Validation**: Comprehensive validation for line items, installments, and expiration

### 📚 Documentation

#### API Documentation Updates
- **Enhanced Examples**: Updated examples showing line items and new features
- **OpenAPI Specification**: Updated OpenAPI 3.0 spec with new field schemas
- **Code Samples**: Updated cURL, JavaScript, and Python examples
- **Feature Documentation**: Detailed documentation for each new feature

#### New Documentation Files
- **ENHANCED_API_FEATURES.md**: Comprehensive guide to new features with examples
- **Migration Guide**: Instructions for applying database changes
- **Feature Benefits**: Detailed explanation of each feature and use cases

### 🛠️ Technical Details

#### Modified Files
- `backend/types/index.ts` - Added PublicLineItem, enhanced request/response types
- `backend/services/allpay.ts` - Enhanced createPayment with options parameter
- `backend/services/payment.ts` - Updated to pass new features to AllPay
- `backend/services/transactionRepository.ts` - Enhanced CREATE/SELECT with new fields
- `backend/controllers/publicApi.ts` - Added validation for line items and new fields
- `backend/controllers/docs.ts` - Updated documentation and examples
- `backend/database/migrations/004_add_payment_features.sql` - New migration
- `package.json` - Version bump to 0.4.0
- `backend/package.json` - Version bump to 0.4.0
- `frontend/package.json` - Version bump to 0.4.0

### 🎯 Migration Notes
- Run `bun run db:migrate` to apply database changes
- All new features are optional and backward compatible
- Existing API integrations continue working without modification
- Review ENHANCED_API_FEATURES.md for detailed feature documentation

### 💡 Example Usage

```json
{
  "amount": 250.00,
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
  "maxInstallments": 3,
  "customerIdNumber": "123456789",
  "expiresAt": "2025-02-10T23:59:59Z",
  "showBit": true
}
```

---

## [0.3.0] - 2025-11-06

### 🚀 Added - Public API System

#### API Key Management
- **Complete API Key System**: Secure generation, validation, and management of API keys
- **Granular Permissions**: Resource-based permission system (payments, transactions, webhooks, profile)
- **API Key CRUD Operations**: Create, read, update, delete API keys via `/api-keys` endpoints
- **Usage Analytics**: Comprehensive tracking of API key usage with statistics and monitoring
- **Expiration Support**: Optional expiry dates for temporary API access
- **Secure Storage**: Cryptographically hashed API keys with `sb0_live_` prefix format

#### Public REST API
- **Payment Creation**: `POST /api/v1/payments` - Create payments with enhanced metadata
- **Payment Retrieval**: `GET /api/v1/payments/:id` - Get detailed payment information
- **Payment Listing**: `GET /api/v1/payments` - Paginated payment history
- **Payment Actions**: Refund (`POST /payments/:id/refund`) and cancel (`POST /payments/:id/cancel`) operations
- **Bearer Token Authentication**: Secure API key authentication via Authorization header

#### Enhanced Payment Features
- **Customer Information**: Support for customer name, email, and phone number
- **URL Redirects**: Success and cancel URL configuration for payment flows
- **Webhook Notifications**: Custom webhook URL support for payment status updates
- **Custom Metadata**: Flexible metadata object for storing custom payment data
- **Multi-Currency Support**: Enhanced currency handling with user defaults

#### Developer Experience
- **Comprehensive Documentation**: Interactive API docs at `/docs` with examples
- **OpenAPI Specification**: Machine-readable API spec at `/docs/openapi.json`
- **Code Examples**: Ready-to-use examples in cURL, JavaScript, and Python
- **Error Handling**: Structured error responses with detailed error codes and types

#### Infrastructure & Security
- **Database Migration**: New migration (003) for API keys and enhanced transactions
- **Usage Logging**: Complete audit trail with IP addresses, user agents, and endpoints
- **Rate Limiting Infrastructure**: Foundation for API rate limiting and monitoring
- **Permission Middleware**: Reusable authentication and authorization middleware
- **Request Tracking**: Unique request IDs for debugging and monitoring

### 🔧 Enhanced

#### Database Schema
- **Extended Transactions Table**: Added fields for customer info, URLs, metadata, and API key tracking
- **API Keys Table**: New table for secure API key storage and management
- **Usage Logs Table**: Comprehensive logging for API usage analytics and rate limiting

#### Type System
- **Enhanced Types**: Updated TypeScript interfaces for new API features
- **Public API Types**: Dedicated types for public API requests and responses
- **Error Response Types**: Structured error handling with consistent response format

#### Project Structure
- **Workspace Configuration**: Added root `package.json` with workspace management
- **Backend Dependencies**: Complete dependency setup for Elysia and related packages
- **Modular Controllers**: Separated API key management and public API controllers

### 📚 Documentation
- **API Documentation**: Complete interactive documentation with examples
- **Changelog**: This changelog for tracking project evolution
- **Code Examples**: Multiple language examples for common API operations

### 🛠️ Technical Details

#### New Files Added
- `backend/services/apiKey.ts` - API key service with generation and validation
- `backend/controllers/apiKeys.ts` - API key management endpoints
- `backend/controllers/publicApi.ts` - Public API endpoints with authentication
- `backend/controllers/docs.ts` - API documentation and OpenAPI spec
- `backend/middleware/apiAuth.ts` - API key authentication middleware
- `backend/database/migrations/003_add_api_keys.sql` - Database schema migration
- `package.json` - Root workspace configuration
- `backend/package.json` - Backend-specific dependencies

#### Modified Files
- `backend/types/index.ts` - Enhanced with API key and public API types
- `backend/services/payment.ts` - Updated to support enhanced transaction data
- `backend/services/repository.ts` - Extended transaction repository for new fields
- `backend/index.ts` - Integrated new controllers and API routes

### 🎯 Migration Notes
- Run `bun scripts/db-cli.ts migrate` to apply database changes
- Ensure PostgreSQL is running before migration
- API keys can be created via the `/api-keys` endpoints after migration

---

## [0.2.0] - Previous Version
### Added
- Basic payment processing with AllPay integration
- User authentication and JWT tokens
- Transaction management and status tracking
- Database schema and migrations
- Basic web interface

## [0.1.0] - Initial Version
### Added
- Project structure and initial setup
- Database configuration
- Basic user management