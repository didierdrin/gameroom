import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { toast } from 'react-toastify';
import type { Socket } from 'socket.io-client';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD_R-bviEw4ukMHHoNwNik7v9_vbJaf3YE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'simplemessaging-c7b5c.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://simplemessaging-c7b5c-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'simplemessaging-c7b5c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'simplemessaging-c7b5c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '423846686036',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:423846686036:web:a81f20fe902bd534a2ecc1',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5P8RZ8BWCS',
};

const vapidKey =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BBtGK4nr684dzPycv_obitFuGgMwtM6BujAd1W7COZkpivQyDdaOptSvV_coi0GCzNRmFpBOL3leRxQvjrwNtYw';

const SW_PATH = '/firebase-messaging-sw.js';
const ICON_PATH = '/assets/ticket-icon.png';

export function getOrInitFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (e) {
    console.error('FCM service worker registration failed', e);
    return null;
  }
}

export async function requestFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!(await isSupported())) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = (await navigator.serviceWorker.getRegistration('/')) ||
      (await registerMessagingServiceWorker());
    if (!registration) return null;

    const app = getOrInitFirebaseApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

let foregroundUnsubscribe: (() => void) | null = null;

export function initForegroundMessaging(messaging: Messaging): () => void {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;

  foregroundUnsubscribe = onMessage(messaging, async (payload) => {
    const title = payload.notification?.title ?? 'Arena';
    const body = payload.notification?.body ?? '';
    const data = (payload.data ?? {}) as Record<string, string>;

    toast.info(body ? `${title}: ${body}` : title, { autoClose: 5000 });

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const tag = data.type || 'arena-push';
        await registration.showNotification(title, {
          body: body || undefined,
          icon: ICON_PATH,
          badge: ICON_PATH,
          data,
          tag,
          requireInteraction: data.type === 'GAME_START',
        });
      } catch (e) {
        console.warn('Foreground system notification failed', e);
      }
    }
  });

  return () => {
    foregroundUnsubscribe?.();
    foregroundUnsubscribe = null;
  };
}

export async function registerFcmTokenOnSocket(
  socket: Socket | null,
  playerId: string | undefined,
): Promise<void> {
  if (!socket?.connected || !playerId) return;
  const token = await requestFCMToken();
  if (token) {
    socket.emit('registerFCMToken', { playerId, token });
  }
}
