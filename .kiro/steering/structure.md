# Project Structure

## Monorepo Organization

```
sb0-pay/
├── backend/              # Elysia backend API
├── frontend/             # React frontend PWA
├── .kiro/               # Kiro AI assistant configuration
│   ├── specs/           # Feature specifications
│   └── steering/        # Project guidance documents
├── .github/             # GitHub Actions workflows
└── package.json         # Root workspace configuration
```

## Backend Structure

```
backend/
├── config/              # Configuration management
│   └── index.ts         # Centralized config (env vars, validation)
├── controllers/         # Route handlers (thin layer)
│   ├── auth.ts          # Authentication endpoints
│   ├── payment.ts       # Payment endpoints (merchant UI)
│   ├── apiKeys.ts       # API key management
│   ├── publicApi.ts     # Public API endpoints (/api/v1/*)
│   ├── docs.ts          # API documentation
│   └── __tests__/       # Controller tests
├── middleware/          # Request middleware
│   ├── auth.ts          # JWT authentication middleware
│   └── apiAuth.ts       # API key authentication middleware
├── services/            # Business logic (core functionality)
│   ├── database.ts      # Database connection & migrations
│   ├── auth.ts          # Authentication logic
│   ├── payment.ts       # Payment processing logic
│   ├── allpay.ts        # AllPay API integration
│   ├── apiKey.ts        # API key management logic
│   ├── repository.ts    # Generic repository pattern
│   ├── transactionRepository.ts  # Transaction data access
│   └── __tests__/       # Service tests
├── models/              # Data models & validation
│   ├── user.ts          # User model
│   ├── transaction.ts   # Transaction model
│   └── __tests__/       # Model tests
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared types
├── utils/               # Helper functions
│   ├── password.ts      # Password hashing utilities
│   └── __tests__/       # Utility tests
├── database/            # Database schema & migrations
│   ├── schema.sql       # Complete database schema
│   └── migrations/      # SQL migration files (numbered)
├── scripts/             # Utility scripts
│   ├── register-merchant.ts    # Register new merchant
│   ├── check-api-key.ts        # Verify API key
│   ├── test-api-payment.ts     # Test API endpoint
│   └── diagnose-production.ts  # Production diagnostics
└── index.ts             # Server entry point
```

## Frontend Structure

```
frontend/
├── src/
│   ├── components/      # Reusable React components
│   │   ├── LoginForm.tsx
│   │   ├── RegistrationForm.tsx
│   │   ├── PaymentFlow.tsx
│   │   ├── QRCodeDisplay.tsx
│   │   ├── TransactionHistory.tsx
│   │   ├── ApiKeyManagement.tsx
│   │   ├── ApiDocumentation.tsx
│   │   ├── MobileLayout.tsx
│   │   ├── MobileInput.tsx
│   │   ├── MobileButton.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Settings.tsx
│   │   ├── PWAInstallPrompt.tsx
│   │   └── __tests__/   # Component tests
│   ├── pages/           # Page-level components
│   │   ├── AuthPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PaymentSuccess.tsx
│   │   └── PaymentFailure.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.tsx  # Authentication context & hook
│   │   └── usePWA.ts    # PWA installation hook
│   ├── services/        # API client services
│   │   ├── api.ts       # Base API client
│   │   ├── authService.ts
│   │   ├── paymentService.ts
│   │   └── apiKeyService.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── i18n/            # Internationalization setup
│   │   └── config.ts
│   ├── App.tsx          # Root component with routing
│   ├── App.css          # Global styles
│   └── main.tsx         # Application entry point
├── public/
│   ├── locales/         # Translation files
│   │   ├── en.json      # English
│   │   ├── he.json      # Hebrew
│   │   ├── ar.json      # Arabic
│   │   └── ru.json      # Russian
│   ├── sw.js            # Service worker for PWA
│   └── *.png            # PWA icons
└── index.html           # HTML entry point
```

## Architecture Patterns

### Backend Layering

1. **Controllers**: Handle HTTP requests/responses, minimal logic
2. **Middleware**: Authentication, validation, request processing
3. **Services**: Business logic, orchestration, external API calls
4. **Models**: Data validation, type definitions
5. **Repositories**: Database access layer (optional pattern)
6. **Utils**: Pure functions, helpers

### Frontend Patterns

1. **Pages**: Route-level components, compose smaller components
2. **Components**: Reusable UI elements, presentational logic
3. **Hooks**: Shared stateful logic, context providers
4. **Services**: API communication, external integrations
5. **Types**: Shared TypeScript interfaces

## Key Conventions

### File Naming

- Components: PascalCase (e.g., `PaymentFlow.tsx`)
- Services/Utils: camelCase (e.g., `authService.ts`)
- Tests: `*.test.ts` or `*.test.tsx` in `__tests__/` folders
- Types: `index.ts` in `types/` folder

### Import Organization

```typescript
// 1. External dependencies
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

// 2. Internal modules (absolute paths preferred)
import { config } from './config';
import { db } from './services/database';

// 3. Types
import type { User, Transaction } from './types';
```

### Database Migrations

- Numbered sequentially: `001_initial_schema.sql`, `002_add_feature.sql`
- Always include rollback strategy in comments
- Run via `bun run db:migrate`

### Testing

- Co-locate tests with source files in `__tests__/` folders
- Use descriptive test names: `describe('PaymentService')` / `it('should create payment')`
- Mock external APIs (AllPay) in tests
- Use `vitest` for frontend, `bun test` for backend

### API Routes

- Merchant UI endpoints: `/auth/*`, `/payment/*`, `/api-keys/*`
- Public API endpoints: `/api/v1/*` (requires API key)
- Documentation: `/docs`, `/docs/openapi.json`
- Health check: `/health`

### Error Handling

All API errors follow consistent format:

```typescript
{
  error: {
    message: "Human-readable error message",
    code: "ERROR_CODE",
    details?: any  // Optional additional context
  }
}
```

### Environment-Specific Code

- Use `config.server.nodeEnv` to check environment
- Never commit `.env` files (use `.env.example` as template)
- Production secrets stored in Google Cloud Secret Manager
