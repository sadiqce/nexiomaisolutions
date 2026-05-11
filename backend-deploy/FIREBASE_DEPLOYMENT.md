# Heroku Deployment Guide - Firebase Migration

## Step 1: Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click "Generate New Private Key"
6. A JSON file will download - keep it safe!

The JSON looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
}
```

## Step 2: Update .env File

Edit `backend-deploy/.env` and replace placeholders:

```env
# Firebase Configuration (from JSON above)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important:** The `FIREBASE_PRIVATE_KEY` must:
- Include the `\n` escapes exactly as shown
- Be wrapped in double quotes
- Replace newlines in the actual key with `\n`

## Step 3: Populate Firestore Collections

Once Firebase credentials are set:

```bash
cd backend-deploy
npm run migrate
```

This will:
- ✅ Create `users` collection with 2 users
- ✅ Create `files` collection with 11 files
- ✅ Create `compliance-ledger` collection with 3 records

## Step 4: Set Environment Variables on Heroku

```bash
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set VITE_AWS_ACCESS_KEY_ID=AKIA...
heroku config:set VITE_AWS_SECRET_ACCESS_KEY=hXyA...
heroku config:set FRONTEND_URL=https://nexiomaisolutions.com
```

Or use:
```bash
heroku config:push  # Uses .env file
```

## Step 5: Deploy to Heroku

```bash
# Commit all changes
git add .
git commit -m "Migrate from Airtable to Firebase - Firestore backend"

# Deploy
git push heroku main
```

## Step 6: Monitor Deployment

```bash
# Watch logs in real-time
heroku logs --tail

# Look for:
✅ Server running on http://...
🔥 Firebase Firestore connected
💳 Stripe integration active
📦 AWS S3 connected
```

## Step 7: Verify Firestore Collections

1. Go to Firebase Console
2. Click **Firestore Database**
3. Verify collections exist:
   - ✅ `users` (2 documents)
   - ✅ `files` (11 documents)
   - ✅ `compliance-ledger` (3 documents)

## Troubleshooting

### Firebase credentials missing error
- Ensure `.env` has all three Firebase variables
- Check private key has `\n` escapes
- Heroku env vars must match exactly

### Firestore connection fails
- Verify Firebase project is active
- Check service account has Firestore read/write permissions
- Test locally first: `npm run dev`

### Migration script fails
- Ensure `.env` is populated with Firebase credentials
- Run from `backend-deploy` directory
- Check CSV files exist (users.csv, files.csv, compliance-ledger.csv)

## Endpoints Ready

All endpoints are now using Firebase Firestore:
- ✅ User management (GET/POST/PATCH)
- ✅ File operations (upload/download)
- ✅ Stripe payments
- ✅ AWS S3 integration
- ✅ Contact forms

## Database Schema

### users
- UserID, Email, Username, Tier, SubscriptionStatus, CreatedDate, UpdatedAt

### files
- UserID, FileName, FileSize, UploadedAt, URL, Status, PageCount

### compliance-ledger
- Lot_Number, Material, S3_Key, Test_Date, CreatedAt

---

**Backend is now 100% Firebase-based and ready for production! 🚀**
