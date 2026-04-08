// Firebase Messaging Service Worker
// Firebase config is injected at runtime via the main app
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// This will be initialized when the main thread sends the config
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      const options = {
        body: body || 'Nova atualização na FUTRA',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data || {},
        vibrate: [100, 50, 100],
      };
      self.registration.showNotification(title || 'FUTRA', options);
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.fcm_options?.link || '/notifications';
  event.waitUntil(clients.openWindow(link));
});
