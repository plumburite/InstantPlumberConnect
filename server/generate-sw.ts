import * as fs from 'fs';
import * as path from 'path';

export function generateServiceWorker() {
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
  
  const apiKey = cleanValue(process.env.FIREBASE_API_KEY);
  const authDomain = cleanValue(process.env.FIREBASE_AUTH_DOMAIN);
  const projectId = cleanValue(process.env.FIREBASE_PROJECT_ID);
  const storageBucket = cleanValue(process.env.FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = cleanValue(process.env.FIREBASE_MESSAGING_SENDER_ID);
  const appId = cleanValue(process.env.FIREBASE_APP_ID);
  
  const template = `importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain}",
  projectId: "${projectId}",
  storageBucket: "${storageBucket}",
  messagingSenderId: "${messagingSenderId}",
  appId: "${appId}"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data,
    requireInteraction: payload.data?.type === 'new_call',
  };

  if (payload.data?.type === 'new_call') {
    notificationOptions.actions = [
      { action: 'accept', title: 'Accept Call' },
      { action: 'decline', title: 'Decline' }
    ];
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'accept') {
    event.waitUntil(
      clients.openWindow('/plumber-dashboard?action=accept&callId=' + event.notification.data.callId)
    );
  } else if (event.action === 'decline') {
    console.log('Call declined from notification');
  } else {
    event.waitUntil(
      clients.openWindow('/plumber-dashboard')
    );
  }
});
`;

  const outputPath = path.join(process.cwd(), 'client', 'public', 'firebase-messaging-sw.js');
  fs.writeFileSync(outputPath, template);
  console.log('Firebase service worker generated successfully');
}
