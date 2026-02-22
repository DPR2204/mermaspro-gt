import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase config from Firebase Console
// Go to: Firebase Console → ⚙️ Project Settings → General → Your web app
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY").trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mermaspro-gt.firebaseapp.com").trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || "mermaspro-gt").trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mermaspro-gt.firebasestorage.app").trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID").trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID").trim(),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
