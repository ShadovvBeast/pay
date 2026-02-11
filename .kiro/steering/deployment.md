# Deployment Guide - SB0 Pay

## Production Infrastructure

### Google Cloud Project
- **Project ID**: sbzero
- **Project Number**: 678576192331
- **Region**: us-central1
- **Service Account**: 678576192331-compute@developer.gserviceaccount.com

### Backend (Google Cloud Run)

**Service Details:**
- **Service Name**: sb0pay
- **URL**: https://sb0pay-678576192331.us-central1.run.app
- **API Base URL**: https://sb0pay-678576192331.us-central1.run.app/api/v1
- **API Documentation**: https://sb0pay-678576192331.us-central1.run.app/docs
- **Region**: us-central1
- **Platform**: Managed
- **Container**: gcr.io/sbzero/sb0pay
- **Port**: 8080
- **Authentication**: Allow unauthenticated (public API)
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 100
- **CPU**: 1 vCPU
- **Memory**: 512 MiB
- **Timeout**: 300 seconds
- **Concurrency**: 80 requests per instance

**Environment Variables:**
- Injected from Google Cloud Secret Manager
- Secrets: `SB0PAY_DATABASE_URL`, `ALLPAY_API_KEY`, `ALLPAY_LOGIN`, `JWT_SECRET`

### Frontend (Firebase Hosting)

**Hosting Details:**
- **Site ID**: sb0pay
- **URL**: https://sb0pay.web.app
- **Alternative URL**: https://sb0pay.firebaseapp.com
- **Project**: sbzero
- **Build Directory**: frontend/dist
- **Framework**: React + Vite
- **CDN**: Firebase Hosting CDN (global)
- **SSL**: Automatic (Firebase managed)

**Hosting Configuration** (firebase.json):
```json
{
  "hosting": {
    "site": "sb0pay",
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Database (Neon PostgreSQL)

**Connection Details:**
- **Provider**: Neon (serverless PostgreSQL)
- **Host**: ep-rough-river-a9issyquo-pooler.us-east-1.aws.neon.tech
- **Database**: neondb
- **User**: neondb_owner
- **Port**: 5432
- **SSL Mode**: require
- **Connection String**: Stored in Secret Manager as `SB0PAY_DATABASE_URL`
- **Region**: us-east-1 (AWS)
- **Pooling**: Connection pooler enabled

**Connection String Format:**
```
postgresql://neondb_owner:PASSWORD@ep-rough-river-a9issyquo-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Database Schema:**
- `users` - Merchant accounts
- `transactions` - Payment transactions
- `api_keys` - API key authentication
- `api_key_usage_logs` - API usage tracking
- `migrations` - Migration history

## Deployment Workflows

### Backend Deployment (Cloud Build)

**Automatic Deployment:**
Cloud Build configuration in `backend/cloudbuild.yaml`:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/sb0pay', '.']
    dir: 'backend'
  
  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/sb0pay']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'sb0pay'
      - '--image'
      - 'gcr.io/$PROJECT_ID/sb0pay'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'

images:
  - 'gcr.io/$PROJECT_ID/sb0pay'
```

**Deploy Command:**
```bash
gcloud builds submit --config=backend/cloudbuild.yaml backend --project=sbzero
```

**Manual Deployment:**
```bash
# Build Docker image
cd backend
docker build -t gcr.io/sbzero/sb0pay .

# Push to Container Registry
docker push gcr.io/sbzero/sb0pay

# Deploy to Cloud Run
gcloud run deploy sb0pay \
  --image gcr.io/sbzero/sb0pay \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets=DATABASE_URL=SB0PAY_DATABASE_URL:latest,ALLPAY_API_KEY=ALLPAY_API_KEY:latest \
  --project sbzero
```

### Frontend Deployment (Firebase Hosting)

**GitHub Actions Workflow:**
Located in `.github/workflows/firebase-hosting-pull-request.yml`

**Manual Deployment:**
```bash
# Install dependencies
cd frontend
bun install

# Build production bundle
bun run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting:sb0pay --project=sbzero
```

**Preview Deployment:**
```bash
# Deploy to preview channel
firebase hosting:channel:deploy preview --project=sbzero
```

## Secret Management

### Google Cloud Secret Manager

**List Secrets:**
```bash
gcloud secrets list --project=sbzero
```

**View Secret Value:**
```bash
gcloud secrets versions access latest --secret="SB0PAY_DATABASE_URL" --project=sbzero
```

**Create Secret:**
```bash
echo "secret-value" | gcloud secrets create SECRET_NAME \
  --data-file=- \
  --project=sbzero
```

**Update Secret:**
```bash
echo "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=sbzero
```

**Grant Cloud Run Access to Secret:**
```bash
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member=serviceAccount:678576192331-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=sbzero
```

### Required Secrets

1. **SB0PAY_DATABASE_URL**
   - PostgreSQL connection string
   - Format: `postgresql://user:pass@host/db?sslmode=require`

2. **ALLPAY_API_KEY**
   - AllPay payment gateway API key
   - Format: 32-character hex string

3. **ALLPAY_LOGIN**
   - AllPay merchant login ID
   - Format: `pp1012035`

4. **JWT_SECRET**
   - JWT signing secret
   - Format: Random 64+ character string

## Monitoring & Observability

### Cloud Run Monitoring

**View Logs:**
```bash
# Recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay" \
  --limit 50 \
  --format json \
  --project=sbzero

# Error logs only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay AND severity>=ERROR" \
  --limit 20 \
  --project=sbzero

# Real-time logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=sb0pay" \
  --project=sbzero

# Filter by request ID
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.requestId=\"REQUEST_ID\"" \
  --project=sbzero
```

**Cloud Console:**
- Logs: https://console.cloud.google.com/logs/query?project=sbzero
- Metrics: https://console.cloud.google.com/run/detail/us-central1/sb0pay/metrics?project=sbzero
- Traces: https://console.cloud.google.com/traces/list?project=sbzero

### Firebase Hosting Monitoring

**Console:**
- Hosting: https://console.firebase.google.com/project/sbzero/hosting
- Analytics: https://console.firebase.google.com/project/sbzero/analytics

**Metrics:**
- Bandwidth usage
- Request count
- Cache hit rate
- Geographic distribution

### Database Monitoring

**Neon Console:**
- Dashboard: https://console.neon.tech
- Metrics: Connection count, query performance, storage usage

**Connection Pool Monitoring:**
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool status
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname='neondb';"
```

## Health Checks & Testing

### Backend Health Check

```bash
# Check API docs endpoint
curl -I https://sb0pay-678576192331.us-central1.run.app/docs

# Test payment creation
curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \
  -H "Authorization: Bearer sb0_live_0b6bf256ec92c38639a50f5183d801a5" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Health Check"}'

# Check response time
time curl -s https://sb0pay-678576192331.us-central1.run.app/docs > /dev/null
```

### Frontend Health Check

```bash
# Check homepage
curl -I https://sb0pay.web.app

# Check asset loading
curl -I https://sb0pay.web.app/assets/index.js
```

### Database Health Check

```bash
# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check table existence
psql $DATABASE_URL -c "\dt"

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY id;"
```

## Rollback Procedures

### Backend Rollback

```bash
# List revisions
gcloud run revisions list --service=sb0pay --region=us-central1 --project=sbzero

# Rollback to previous revision
gcloud run services update-traffic sb0pay \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1 \
  --project=sbzero
```

### Frontend Rollback

```bash
# List previous releases
firebase hosting:releases:list --project=sbzero

# Rollback to previous release
firebase hosting:rollback --project=sbzero
```

### Database Rollback

```bash
# Restore from Neon backup (via Neon console)
# Or run reverse migration manually
psql $DATABASE_URL -f backend/database/migrations/rollback_XXX.sql
```

## Troubleshooting

### Backend Issues

**500 Errors:**
1. Check Cloud Run logs for exceptions
2. Verify database connection
3. Check secret values are correct
4. Verify AllPay API credentials

**Slow Response:**
1. Check database query performance
2. Review Cloud Run metrics (CPU/memory)
3. Check AllPay API response times
4. Consider increasing Cloud Run resources

**Database Connection Errors:**
1. Verify `SB0PAY_DATABASE_URL` secret
2. Check Neon database status
3. Review connection pool settings
4. Check SSL certificate validity

### Frontend Issues

**404 Errors:**
1. Verify build completed successfully
2. Check Firebase Hosting configuration
3. Ensure rewrites are configured for SPA

**Slow Loading:**
1. Check CDN cache hit rate
2. Review asset sizes
3. Enable compression
4. Optimize images

### API Key Issues

**Authentication Failures:**
1. Verify API key exists in database
2. Check key is active and not expired
3. Verify Authorization header format
4. Check database connection from Cloud Run

## Performance Optimization

### Backend

- **Cold Start**: ~2-3 seconds (Bun runtime)
- **Warm Response**: ~100-300ms
- **Database Queries**: Use connection pooling
- **Caching**: Consider Redis for session data
- **Scaling**: Automatic based on request volume

### Frontend

- **Build Size**: ~500KB (gzipped)
- **First Load**: ~1-2 seconds
- **CDN**: Global distribution via Firebase
- **Caching**: Static assets cached for 1 year
- **Code Splitting**: Automatic via Vite

### Database

- **Connection Pool**: 10 max connections
- **Query Timeout**: 2 seconds
- **Indexes**: On user_id, api_key prefix, transaction status
- **Backups**: Automatic daily backups via Neon

## Security

### API Security

- **Authentication**: Bearer token (API keys)
- **Authorization**: Permission-based (payments:create, read, update)
- **Rate Limiting**: Not implemented (consider adding)
- **CORS**: Configured for public API access
- **HTTPS**: Enforced on all endpoints

### Database Security

- **SSL**: Required for all connections
- **Credentials**: Stored in Secret Manager
- **Access**: Limited to Cloud Run service account
- **Backups**: Encrypted at rest
- **Audit Logs**: Enabled via Cloud Logging

### Frontend Security

- **HTTPS**: Enforced via Firebase Hosting
- **CSP**: Content Security Policy headers
- **XSS Protection**: React built-in protection
- **Secrets**: No secrets in frontend code
- **API Keys**: Never exposed to client

## Cost Optimization

### Cloud Run

- **Pricing**: Pay per request + CPU/memory usage
- **Optimization**: Scales to zero when idle
- **Estimated**: ~$5-20/month for low traffic

### Firebase Hosting

- **Pricing**: Free tier (10GB storage, 360MB/day transfer)
- **Estimated**: Free for current usage

### Neon Database

- **Pricing**: Free tier (0.5GB storage, 100 hours compute)
- **Estimated**: Free for current usage

### Total Estimated Cost

- **Current**: ~$5-20/month
- **With Growth**: ~$50-100/month at 10K requests/day

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automatic backups (Neon)
- **Code**: Version controlled in GitHub
- **Secrets**: Backed up in Secret Manager
- **Configuration**: Documented in this file

### Recovery Procedures

1. **Database Failure**: Restore from Neon backup
2. **Backend Failure**: Redeploy from GitHub
3. **Frontend Failure**: Redeploy from GitHub
4. **Secret Loss**: Recreate from secure backup

### RTO/RPO

- **Recovery Time Objective**: 1 hour
- **Recovery Point Objective**: 24 hours (database backups)

## Maintenance Windows

- **Preferred**: Sunday 2-4 AM UTC
- **Notification**: Email to stakeholders 48 hours prior
- **Rollback Plan**: Always prepared before maintenance

## Contact & Support

- **Cloud Run Issues**: Google Cloud Support
- **Firebase Issues**: Firebase Support
- **Database Issues**: Neon Support
- **Code Issues**: GitHub Issues
- **Production Incidents**: Escalate to team lead
