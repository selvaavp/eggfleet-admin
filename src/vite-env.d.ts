/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Full API base URL including `/api/v1`, e.g. `http://localhost:3000/api/v1`
   * or `https://your-api.example.com/api/v1`.
   * Leave unset during `npm run dev` so Vite proxies `/api` → Nest on port 3000.
   */
  readonly VITE_API_BASE_URL?: string;

  /** Firebase Cloud Messaging (browser push) — see `.env` for setup notes. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
