import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

/**
 * Web app config from Firebase Console → Project settings → General → Your apps → Web app.
 * Same project (`eggfleet-7d090`) as the Android app, but Web needs its own registered app
 * to get `appId` / `authDomain`. The VAPID key comes from Cloud Messaging settings → Web Push certificates.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.appId && vapidKey,
);

let messagingPromise: Promise<Messaging | null> | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!firebaseEnabled) return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!(await isSupported())) return null;
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

/** Request browser notification permission and return an FCM registration token, or null if unavailable/denied. */
export async function requestFcmToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  } catch {
    return null;
  }
}

/** Subscribe to push messages received while the app is in the foreground. */
export async function onForegroundMessage(callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void) {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data as Record<string, string> | undefined,
      });
    });
  } catch {
    // FCM unavailable (unsupported browser, blocked service worker, etc.) — in-app feed still works.
  }
}
