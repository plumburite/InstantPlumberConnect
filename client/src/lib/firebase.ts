// Firebase disabled for deployment - will be re-enabled later
// import { initializeApp } from 'firebase/app';
// import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';

// Firebase temporarily disabled for core app deployment
// Push notifications will be added in a future enhancement
console.log('Firebase/FCM temporarily disabled - core app functionality available');

// Stub Firebase app object
export const firebaseApp = null;

// Messaging stub
let messaging: any = null;

export const requestNotificationPermission = async (): Promise<string | null> => {
  console.log('Push notifications temporarily disabled - feature will be available in future update');
  return null;
};

export const setupForegroundMessageHandler = () => {
  console.log('Firebase messaging temporarily disabled');
  return;
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