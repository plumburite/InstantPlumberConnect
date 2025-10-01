const cleanValue = (val: string | undefined) => {
  if (!val) return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'") || cleaned.startsWith(',') || cleaned.startsWith(' ')) {
    cleaned = cleaned.slice(1).trim();
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'") || cleaned.endsWith(',') || cleaned.endsWith(' ')) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
};

export const getFirebaseEnvForClient = () => {
  return {
    VITE_FIREBASE_API_KEY: cleanValue(process.env.FIREBASE_API_KEY),
    VITE_FIREBASE_AUTH_DOMAIN: cleanValue(process.env.FIREBASE_AUTH_DOMAIN),
    VITE_FIREBASE_PROJECT_ID: cleanValue(process.env.FIREBASE_PROJECT_ID),
    VITE_FIREBASE_STORAGE_BUCKET: cleanValue(process.env.FIREBASE_STORAGE_BUCKET),
    VITE_FIREBASE_MESSAGING_SENDER_ID: cleanValue(process.env.FIREBASE_MESSAGING_SENDER_ID),
    VITE_FIREBASE_APP_ID: cleanValue(process.env.FIREBASE_APP_ID),
    VITE_FIREBASE_VAPID_KEY: cleanValue(process.env.FIREBASE_VAPID_KEY),
  };
};
