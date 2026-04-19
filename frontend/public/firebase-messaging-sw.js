/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD_R-bviEw4ukMHHoNwNik7v9_vbJaf3YE',
  authDomain: 'simplemessaging-c7b5c.firebaseapp.com',
  databaseURL: 'https://simplemessaging-c7b5c-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'simplemessaging-c7b5c',
  storageBucket: 'simplemessaging-c7b5c.firebasestorage.app',
  messagingSenderId: '423846686036',
  appId: '1:423846686036:web:a81f20fe902bd534a2ecc1',
  measurementId: 'G-5P8RZ8BWCS',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Arena';
  const body = payload.notification?.body || '';
  const data = payload.data || {};

  return self.registration.showNotification(title, {
    body,
    icon: '/assets/ticket-icon.png',
    badge: '/assets/ticket-icon.png',
    data,
    tag: data.type || 'arena-push',
    requireInteraction: data.type === 'GAME_START',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let path = '/';
  if (data.roomId) {
    path = '/game-room/' + data.roomId;
  } else if (data.type === 'DISCUSSION_MESSAGE') {
    path = '/discussions';
  }
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
