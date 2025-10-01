importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: ""AIzaSyCN2W-KtQ5xhNlvYQSyIm11QfNvuNJliPA",",
  authDomain: " "instantplumberconnect.firebaseapp.com",",
  projectId: ""instantplumberconnect",",
  storageBucket: " "instantplumberconnect.firebasestorage.app",",
  messagingSenderId: ""948897330821",",
  appId: ""1:948897330821:web:b7614ef398c350e015dbec","
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
