// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

// Firebase configuration (should match your main config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'PlumberConnect';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    requireInteraction: true,
    actions: payload.data?.type === 'new_call' ? [
      {
        action: 'accept',
        title: 'Accept Call',
        icon: '/accept-icon.png'
      },
      {
        action: 'decline',
        title: 'Decline',
        icon: '/decline-icon.png'
      }
    ] : []
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'accept' && data?.type === 'new_call') {
    // Open the app and accept the call
    event.waitUntil(
      clients.openWindow('/dashboard?accept=' + data.callId)
    );
  } else if (action === 'decline' && data?.type === 'new_call') {
    // Send decline message to server
    fetch('/api/calls/' + data.callId + '/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});