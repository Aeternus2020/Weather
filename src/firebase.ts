import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAXOGJ4fnR1GX7ohmXBH4-WqBJCavSMvJs",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "forecast-atlas.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "forecast-atlas",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "forecast-atlas.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1028362894413",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1028362894413:web:2b90ca8171958d44eeb004",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HQX5RHHE2S",
};

const app: FirebaseApp = initializeApp(firebaseConfig)

const firestoreDbId = import.meta.env.VITE_FIRESTORE_DB?.trim()
export const db: Firestore =
    firestoreDbId && firestoreDbId !== '(default)'
        ? initializeFirestore(app, {}, firestoreDbId)
        : getFirestore(app)

export const auth: Auth = getAuth(app)
export const provider = new GoogleAuthProvider()
