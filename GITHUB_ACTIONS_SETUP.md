# GitHub Actions Setup for SB0 Pay

This project uses GitHub Actions for automatic deployment of both frontend and backend.

## Workflows

### Frontend Deployment
- **File**: `.github/workflows/deploy-frontend.yml`
- **Triggers**: Pushes to `master`/`main` branch that modify files in `frontend/` directory
- **Deploys to**: Firebase Hosting (https://sb0pay.web.app)

### Backend Deployment
- **File**: `.github/workflows/deploy-backend.yml`
- **Triggers**: Pushes to `master`/`main` branch that modify files in `backend/` directory
- **Deploys to**: Cloud Run (https://sb0pay-678576192331.us-central1.run.app)

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. FIREBASE_SERVICE_ACCOUNT_SBZERO
For frontend deployment to Firebase Hosting.

**To get this value:**
```bash
# This file has been created: github-actions-key.json
# Copy its contents
cat github-actions-key.json
```

**Add to GitHub:**
1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `FIREBASE_SERVICE_ACCOUNT_SBZERO`
5. Value: Paste the entire contents of `github-actions-key.json`

### 2. GCP_SERVICE_ACCOUNT_KEY
For backend deployment to Cloud Run.

**Use the same key as above:**
1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `GCP_SERVICE_ACCOUNT_KEY`
5. Value: Paste the entire contents of `github-actions-key.json`

## Service Account Permissions

The `github-actions-sb0pay@sbzero.iam.gserviceaccount.com` service account has been granted:
- `roles/cloudbuild.builds.editor` - To trigger Cloud Build
- `roles/iam.serviceAccountUser` - To act as service accounts
- `roles/run.admin` - To deploy to Cloud Run

## Testing the Workflows

### Test Frontend Deployment
```bash
# Make a change to any file in frontend/
echo "// test" >> frontend/src/App.tsx
git add frontend/src/App.tsx
git commit -m "Test frontend deployment"
git push
```

### Test Backend Deployment
```bash
# Make a change to any file in backend/
echo "// test" >> backend/index.ts
git add backend/index.ts
git commit -m "Test backend deployment"
git push
```

## Security Notes

- **IMPORTANT**: The `github-actions-key.json` file contains sensitive credentials
- This file should be added to `.gitignore` (already done)
- Never commit this file to the repository
- Store it securely and delete it after adding to GitHub Secrets
- You can regenerate keys if needed using:
  ```bash
  gcloud iam service-accounts keys create new-key.json \
    --iam-account=github-actions-sb0pay@sbzero.iam.gserviceaccount.com \
    --project=sbzero
  ```

## Monitoring Deployments

- View workflow runs: https://github.com/YOUR_USERNAME/pay/actions
- Frontend deployments: Firebase Console → Hosting
- Backend deployments: Google Cloud Console → Cloud Run

## Troubleshooting

If deployments fail:

1. Check the GitHub Actions logs for error messages
2. Verify secrets are correctly set in GitHub
3. Ensure service account has required permissions
4. Check that the service account key hasn't expired
