# SB0 Pay Deployment Setup

This project uses Firebase's native GitHub integrations for automatic deployment.

## Current Deployment Status

### Backend (Firebase App Hosting)
- **URL**: https://sb0pay--sbzero.us-central1.hosted.app
- **Cloud Run**: https://sb0pay-678576192331.us-central1.run.app
- **Status**: Deployed manually via Cloud Build
- **Config**: `apphosting.yaml`

### Frontend (Firebase Hosting)
- **URL**: https://sb0pay.web.app
- **Status**: Deployed manually
- **Config**: `firebase.json`

## Setting Up Automatic Deployments

### Option 1: Firebase Hosting GitHub Integration (Recommended for Frontend)

Firebase Hosting has a built-in GitHub integration that automatically deploys on push.

**Setup:**
1. Go to Firebase Console: https://console.firebase.google.com/project/sbzero/hosting
2. Click on the `sb0pay` site
3. Click "Set up GitHub integration"
4. Connect your GitHub repository
5. Configure build settings:
   - Build command: `cd frontend && bun install && bun run build`
   - Output directory: `frontend/dist`
   - Branch: `master`

This will create a `.github/workflows/firebase-hosting-*.yml` file automatically.

### Option 2: Firebase App Hosting GitHub Integration (For Backend)

Firebase App Hosting can auto-deploy from GitHub.

**Setup:**
1. Go to Firebase Console: https://console.firebase.google.com/project/sbzero/apphosting
2. Click on the `sb0pay` backend
3. Connect your GitHub repository
4. The `apphosting.yaml` configuration will be used automatically

### Option 3: Manual Deployment (Current Method)

**Frontend:**
```bash
cd frontend
bun install
bun run build
cd ..
firebase deploy --only hosting:sb0pay --project=sbzero
```

**Backend:**
```bash
gcloud builds submit --config=backend/cloudbuild.yaml backend --project=sbzero
```

## Environment Configuration

### Backend Environment Variables
Configured in `apphosting.yaml` and Google Cloud Secret Manager:
- `SB0PAY_DATABASE_URL` - PostgreSQL connection string
- `ALLPAY_API_URL` - AllPay API endpoint
- `ALLPAY_LOGIN` - AllPay merchant login
- `ALLPAY_API_KEY` - AllPay API key
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - Frontend URL for CORS
- `CORS_ORIGIN` - Allowed CORS origins

### Frontend Environment Variables
Configured in `frontend/.env.production`:
- `VITE_API_URL` - Backend API URL
- `VITE_APP_NAME` - Application name

## Database

- **Provider**: Neon PostgreSQL
- **Connection**: Stored in `SB0PAY_DATABASE_URL` secret
- **Migrations**: Run automatically on server startup

## Monitoring

- **Backend Logs**: https://console.cloud.google.com/run?project=sbzero
- **Frontend Hosting**: https://console.firebase.google.com/project/sbzero/hosting
- **Build History**: https://console.cloud.google.com/cloud-build/builds?project=sbzero

## Troubleshooting

### Backend deployment fails
- Check Cloud Build logs
- Verify secrets are set in Secret Manager
- Ensure service account has proper permissions

### Frontend deployment fails
- Check that `frontend/dist` exists after build
- Verify Firebase Hosting site `sb0pay` exists
- Check `firebase.json` configuration

### Database connection issues
- Verify `SB0PAY_DATABASE_URL` secret is correct
- Check Neon database is accessible
- Review Cloud Run logs for connection errors
