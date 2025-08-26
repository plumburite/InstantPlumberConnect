import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';

// Firebase configuration (these would normally come from environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: any = null;

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(firebaseApp);
  } catch (error) {
    console.log('Firebase messaging not available:', error);
  }
}

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) return null;

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      
      if (currentToken) {
        console.log('FCM token:', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const setupForegroundMessageHandler = () => {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    const { toast } = useToast();
    
    // Show notification as toast when app is in foreground
    if (payload.notification) {
      toast({
        title: payload.notification.title || 'New Notification',
        description: payload.notification.body || 'You have a new notification',
      });
    }
    
    // Handle data payload if needed
    if (payload.data) {
      // Custom handling based on notification type
      handleNotificationData(payload.data);
    }
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
  try {
    const response = await fetch('/api/plumber/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        token,
        userId,
      }),
    });
    
    if (response.ok) {
      console.log('FCM token sent to server successfully');
    } else {
      console.error('Failed to send FCM token to server');
    }
  } catch (error) {
    console.error('Error sending FCM token to server:', error);
  }
};