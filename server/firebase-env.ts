export const getFirebaseEnvForClient = () => {
  return {
    VITE_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
    VITE_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    VITE_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    VITE_FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
    VITE_FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY || '',
  };
};
