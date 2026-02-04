import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAXOGJ4fnR1GX7ohmXBH4-WqBJCavSMvJs",
    authDomain: "money-revenue.firebaseapp.com",
    projectId: "money-revenue",
    storageBucket: "money-revenue.firebasestorage.app",
    messagingSenderId: "1028362894413",
    appId: "1:1028362894413:web:2b90ca8171958d44eeb004",
    measurementId: "G-HQX5RHHE2S",
};

const app: FirebaseApp = initializeApp(firebaseConfig)

export const db: Firestore = initializeFirestore(app, {}, 'weather-meta')

export const auth: Auth = getAuth(app)
export const provider = new GoogleAuthProvider()
