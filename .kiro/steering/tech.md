# Technology Stack

## Runtime & Package Manager

- **Runtime**: Bun >= 1.0.0 (JavaScript/TypeScript runtime)
- **Package Manager**: Bun (replaces npm/yarn)
- **Workspaces**: Monorepo with `frontend` and `backend` workspaces

## Backend Stack

- **Framework**: Elysia (Bun-native web framework)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL >= 14.0 (hosted on Neon)
- **Database Client**: `pg` (node-postgres)
- **Authentication**: JWT with HTTP-only cookies via `@elysiajs/jwt`
- **Password Hashing**: bcrypt
- **QR Code Generation**: `qrcode` library
- **API Documentation**: Swagger/OpenAPI via custom controller

### Backend Plugins

- `@elysiajs/cors` - CORS handling
- `@elysiajs/cookie` - Cookie management
- `@elysiajs/jwt` - JWT authentication

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS with PostCSS
- **Testing**: Vitest with React Testing Library
- **Internationalization**: i18next with react-i18next
- **QR Code Display**: `qrcode` library

## Deployment

### Production Environment

- **Project**: sbzero (Google Cloud Project ID)
- **Backend**: Google Cloud Run
  - **URL**: https://sb0pay-678576192331.us-central1.run.app
  - **API Base**: https://sb0pay-678576192331.us-central1.run.app/api/v1
  - **API Docs**: https://sb0pay-678576192331.us-central1.run.app/docs
  - **Region**: us-central1
  - **Service Name**: sb0pay
  - **Container Registry**: gcr.io/sbzero/sb0pay
  - **Port**: 8080
  - **Authentication**: Allow unauthenticated (public API)
- **Frontend**: Firebase Hosting
  - **URL**: https://sb0pay.web.app
  - **Site ID**: sb0pay
  - **Project**: sbzero
- **Database**: Neon PostgreSQL (serverless)
  - **Host**: ep-rough-river-a9issyquo-pooler.us-east-1.aws.neon.tech
  - **Database**: neondb
  - **User**: neondb_owner
  - **Connection**: Stored in Google Cloud Secret Manager as `SB0PAY_DATABASE_URL`
  - **SSL Mode**: require
- **CI/CD**: 
  - GitHub Actions for Firebase Hosting
  - Google Cloud Build for backend deployment
  - Build config: `backend/cloudbuild.yaml`

### Deployment Commands

#### Backend Deployment
```bash
# Deploy backend to Cloud Run via Cloud Build
gcloud builds submit --config=backend/cloudbuild.yaml backend --project=sbzero

# Or manually build and deploy
cd backend
docker build -t gcr.io/sbzero/sb0pay .
docker push gcr.io/sbzero/sb0pay
gcloud run deploy sb0pay \
  --image gcr.io/sbzero/sb0pay \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --project sbzero
```

#### Frontend Deployment
```bash
# Build and deploy frontend to Firebase Hosting
cd frontend
bun install
bun run build
cd ..
firebase deploy --only hosting:sb0pay --project=sbzero
```

### Environment Secrets (Google Cloud Secret Manager)

Backend secrets are stored in Google Cloud Secret Manager and injected into Cloud Run:

```bash
# View secrets
gcloud secrets list --project=sbzero

# Access secret value
gcloud secrets versions access latest --secret="SB0PAY_DATABASE_URL" --project=sbzero

# Create/update secret
echo "postgresql://user:pass@host/db" | gcloud secrets create SB0PAY_DATABASE_URL --data-file=- --project=sbzero
```

**Required Secrets:**
- `SB0PAY_DATABASE_URL` - PostgreSQL connection string
- `ALLPAY_API_KEY` - AllPay payment gateway API key
- `ALLPAY_LOGIN` - AllPay merchant login
- `JWT_SECRET` - JWT signing secret

### Monitoring & Logs

#### Cloud Run Logs
```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay" \
  --limit 50 \
  --project=sbzero

# View errors only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay AND severity>=ERROR" \
  --limit 20 \
  --project=sbzero

# Follow logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay" \
  --project=sbzero
```

#### Cloud Run Metrics
- **Console**: https://console.cloud.google.com/run?project=sbzero
- **Metrics**: Request count, latency, error rate, CPU/memory usage

#### Firebase Hosting
- **Console**: https://console.firebase.google.com/project/sbzero/hosting
- **Metrics**: Bandwidth, requests, cache hit rate

### Network & Security

- **CORS**: Configured to allow all origins (`*`) for public API
- **IP Restrictions**: None - API accepts requests from any IP
- **Rate Limiting**: Not currently implemented
- **SSL/TLS**: Automatic via Google Cloud Run and Firebase Hosting
- **API Authentication**: Bearer token with API keys (prefix: `sb0_live_` or `sb0_test_`)

### Database Migrations

Migrations run automatically on backend startup. Manual migration:

```bash
# Set database URL
export DATABASE_URL="postgresql://neondb_owner:password@ep-rough-river-a9issyquo-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Run migrations
cd backend
bun run index.ts
```

### Health Checks

```bash
# Check backend health
curl https://sb0pay-678576192331.us-central1.run.app/docs

# Check frontend
curl -I https://sb0pay.web.app

# Test API endpoint
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Health Check"}'
```

## Common Commands

### Development

```bash
# Start all services (backend + frontend)
bun run dev

# Start backend only
bun run dev:backend

# Start frontend only
bun run dev:frontend
```

### Building

```bash
# Build all
bun run build

# Build backend only
bun run build:backend

# Build frontend only
bun run build:frontend
```

### Testing

```bash
# Run all tests
bun test

# Backend tests
bun run test:backend

# Frontend tests
bun run test:frontend

# Watch mode (frontend)
cd frontend && bun run test:watch

# Coverage
bun run test:coverage
```

### Database

```bash
# Initialize database (create tables)
bun run db:init

# Run migrations
bun run db:migrate

# Check migration status
bun run db:status

# Reset database (WARNING: destructive)
bun run db:reset
```

### Code Quality

```bash
# Lint all code
bun run lint

# Lint with auto-fix
bun run lint:backend && cd frontend && bun run lint:fix

# Type check all code
bun run type-check
```

### Backend Utilities

```bash
# Diagnose production issues
cd backend && bun run diagnose

# Check API key status
cd backend && bun run check-key

# Register new merchant
cd backend && bun run register-merchant

# Test API payment
cd backend && bun run test-api
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://...
ALLPAY_API_URL=https://api.allpay.to
ALLPAY_LOGIN=merchant_login
ALLPAY_API_KEY=allpay_key
JWT_SECRET=random_secret_key
PORT=2894
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.production)

```
VITE_API_URL=https://sb0pay-678576192331.us-central1.run.app
VITE_APP_NAME=SB0 Pay
```

## Code Style Conventions

- Use TypeScript strict mode
- Prefer async/await over promises
- Use functional components in React (no class components)
- Follow ESLint rules (configured in each workspace)
- Use Tailwind utility classes for styling
- Database queries use parameterized statements (prevent SQL injection)
- API responses follow consistent error format: `{ error: { message, code } }`
