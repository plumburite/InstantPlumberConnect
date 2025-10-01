import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

let firebaseConfig: any = null;
let configLoaded = false;

const loadFirebaseConfig = async () => {
  if (configLoaded) return firebaseConfig;
  
  try {
    const response = await fetch('/api/firebase/config');
    firebaseConfig = await response.json();
    configLoaded = true;
    return firebaseConfig;
  } catch (error) {
    console.error('Failed to load Firebase config:', error);
    return null;
  }
};

let firebaseAppInstance: any = null;

const getFirebaseApp = async () => {
  if (firebaseAppInstance) return firebaseAppInstance;
  
  const config = await loadFirebaseConfig();
  if (!config || !config.VITE_FIREBASE_API_KEY) {
    console.warn('Firebase config not available');
    return null;
  }
  
  firebaseAppInstance = initializeApp({
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: config.VITE_FIREBASE_APP_ID,
  });
  
  return firebaseAppInstance;
};

export const firebaseApp = firebaseAppInstance;

let messaging: any = null;

const initializeMessaging = async () => {
  if (messaging) return messaging;
  
  const app = await getFirebaseApp();
  if (!app) return null;
  
  const supported = await isSupported();
  if (supported) {
    messaging = getMessaging(app);
  } else {
    console.warn('Firebase Messaging is not supported in this browser');
  }
  return messaging;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const msg = await initializeMessaging();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    const config = await loadFirebaseConfig();
    const vapidKey = config?.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    const token = await getToken(msg, { vapidKey });
    console.log('FCM token obtained:', token);
    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const setupForegroundMessageHandler = () => {
  initializeMessaging().then(msg => {
    if (!msg) return;
    
    onMessage(msg, (payload) => {
      console.log('Foreground message received:', payload);
      handleNotificationData(payload.data);
    });
  });
};

const handleNotificationData = (data: any) => {
  switch (data.type) {
    case 'new_call':
      // Handle new call notification
      console.log('New call notification:', data);
      break;
    case 'call_accepted':
      // Handle call accepted notification
      console.log('Call accepted notification:', data);
      break;
    case 'call_ended':
      // Handle call ended notification
      console.log('Call ended notification:', data);
      break;
    default:
      console.log('Unknown notification type:', data);
  }
};

export const sendTokenToServer = async (token: string, userId: string) => {
  console.log('FCM token registration temporarily disabled');
  return;
};