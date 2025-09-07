# Firebase Setup Guide (Optional)

Firebase Cloud Messaging (FCM) is **optional** for this application. The app will work perfectly without it, but enabling FCM adds push notifications for plumbers when new calls come in.

## When Firebase is NOT configured:
- ✅ All core features work normally (video chat, SMS authentication, dashboard)
- ✅ Plumbers see new calls in their dashboard when logged in
- ⚠️ No push notifications when app is in background

## To Enable Firebase Push Notifications:

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable Cloud Messaging

### 2. Get Service Account Key
1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file

### 3. Get Web App Configuration
1. Go to Project Settings > General
2. Add a Web App if not already created
3. Copy the configuration values

### 4. Set Environment Variables

Add these to your Replit Secrets:

**Backend (Service Account):**
- `FIREBASE_SERVICE_ACCOUNT_KEY` - The entire JSON content from step 2
- `FIREBASE_PROJECT_ID` - Your Firebase project ID

**Frontend (Web App):**
- `VITE_FIREBASE_API_KEY` - From Firebase config
- `VITE_FIREBASE_AUTH_DOMAIN` - From Firebase config
- `VITE_FIREBASE_PROJECT_ID` - From Firebase config
- `VITE_FIREBASE_STORAGE_BUCKET` - From Firebase config
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - From Firebase config
- `VITE_FIREBASE_APP_ID` - From Firebase config
- `VITE_FIREBASE_VAPID_KEY` - Generate in Cloud Messaging > Web Push certificates

### 5. Deploy Service Worker
Create `public/firebase-messaging-sw.js` with your Firebase config to handle background notifications.

## Note
The application is fully functional without Firebase. This is an optional enhancement for improved user experience with push notifications.