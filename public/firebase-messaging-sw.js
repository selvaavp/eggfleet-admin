/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Static copy of the Firebase web config (firebase web config values are not secret —
// they identify the project, not authenticate it). Keep this in sync with the
// VITE_FIREBASE_* values in `.env` / `.env.local`.
firebase.initializeApp({
  apiKey: 'AIzaSyA8_hZNi44sGSxRRr8_6QgyyrJe6QFoEww',
  authDomain: 'eggfleet-7d090.firebaseapp.com',
  projectId: 'eggfleet-7d090',
  storageBucket: 'eggfleet-7d090.firebasestorage.app',
  messagingSenderId: '547368435771',
  appId: 'REPLACE_WITH_WEB_APP_ID',
});

const messaging = firebase.messaging();

// Shown when the admin panel tab is not focused/open.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'EggFleet';
  const body = payload.notification?.body ?? '';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/');
    }),
  );
});
