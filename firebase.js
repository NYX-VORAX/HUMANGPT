// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration - All values must be set in environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Only connect to emulators in development when explicitly enabled
if (process.env.NODE_ENV === 'development' && 
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  // Connect to Firebase emulators if running locally
  try {
    // Check if auth emulator is already connected
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
  } catch (error) {
    // Emulator connection failed, continue with production
    if (process.env.NODE_ENV === 'development') {
      console.warn('Auth emulator connection failed:', error);
    }
  }
  
  try {
    // Check if firestore emulator is already connected
    if (!db._delegate?._databaseId?.projectId?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
  } catch (error) {
    // Emulator connection failed, continue with production
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firestore emulator connection failed:', error);
    }
  }
}

// Initialize Firebase Analytics only in production and browser environment
export const analytics = typeof window !== 'undefined' && process.env.NODE_ENV === 'production' 
  ? getAnalytics(app) 
  : null;

export default app;
