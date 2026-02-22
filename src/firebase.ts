import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';

// TODO: Replace with your actual Firebase config from Firebase Console
// Go to: Firebase Console → ⚙️ Project Settings → General → Your web app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mermaspro-gt.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mermaspro-gt",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mermaspro-gt.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({}),
  });
} catch {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
}
export const db = firestoreDb;
export default app;
