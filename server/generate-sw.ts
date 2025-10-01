import * as fs from 'fs';
import * as path from 'path';

export function generateServiceWorker() {
  const template = `importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}"
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
