# Changelog

All notable changes to SB0 Pay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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