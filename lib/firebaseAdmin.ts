import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Global variables for singleton pattern
let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;

// Production-ready service account configuration parser
function getServiceAccountConfig() {
  // For production deployment, prioritize individual environment variables
  // This approach is more secure and easier to manage in serverless environments
  
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  
  // Detailed validation with specific error messages
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required but not set');
  }
  
  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is required but not set');
  }
  
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is required but not set');
  }
  
  // Validate email format
  if (!clientEmail.includes('@') || !clientEmail.includes('.iam.gserviceaccount.com')) {
    throw new Error('FIREBASE_CLIENT_EMAIL must be a valid service account email');
  }
  
  // Process private key - handle various formats
  let processedPrivateKey = privateKey;
  
  // Replace literal \n with actual newlines
  processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
  
  // Ensure proper private key format
  if (!processedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('FIREBASE_PRIVATE_KEY must be a valid private key in PEM format');
  }
  
  return {
    projectId,
    clientEmail,
    privateKey: processedPrivateKey
  };
}

// Production-ready Firebase Admin SDK initialization
function initializeFirebaseAdmin(): App | null {
  // Return existing app if already initialized
  if (adminApp) {
    return adminApp;
  }

  // If previous initialization failed, don't retry during build
  if (initializationError && process.env.NODE_ENV !== 'production') {
    console.warn('Previous Firebase initialization failed, skipping retry during build');
    return null;
  }

  // Prevent multiple initialization attempts
  if (initializationAttempted && !adminApp) {
    throw initializationError || new Error('Firebase initialization previously failed');
  }

  initializationAttempted = true;

  try {
    // Get service account configuration
    const serviceAccountConfig = getServiceAccountConfig();
    
    console.log('Initializing Firebase Admin SDK for project:', serviceAccountConfig.projectId);
    
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      console.log('Using existing Firebase Admin app');
      return adminApp;
    }

    // Initialize new Firebase Admin app
    adminApp = initializeApp({
      credential: cert({
        projectId: serviceAccountConfig.projectId,
        clientEmail: serviceAccountConfig.clientEmail,
        privateKey: serviceAccountConfig.privateKey
      }),
      projectId: serviceAccountConfig.projectId,
      // Optional: Add database URL if using Realtime Database
      // databaseURL: `https://${serviceAccountConfig.projectId}-default-rtdb.firebaseio.com`
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('🔥 Project ID:', serviceAccountConfig.projectId);
    console.log('📧 Service Account:', serviceAccountConfig.clientEmail.substring(0, 20) + '...');
    
    return adminApp;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Firebase Admin SDK initialization failed:', errorMessage);
    
    initializationError = error instanceof Error ? error : new Error(errorMessage);
    
    // In production, throw the error immediately
    if (process.env.NODE_ENV === 'production') {
      throw initializationError;
    }
    
    // During build time, log and return null
    return null;
  }
}

// Lazy initialization functions
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    const app = initializeFirebaseAdmin();
    if (!app) {
      throw new Error('Firebase Admin SDK failed to initialize. Cannot get Auth instance.');
    }
    adminAuth = getAuth(app);
  }
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    const app = initializeFirebaseAdmin();
    if (!app) {
      throw new Error('Firebase Admin SDK failed to initialize. Cannot get Firestore instance.');
    }
    adminDb = getFirestore(app);
  }
  return adminDb;
}

// Helper functions for production debugging and health checks
export function getFirebaseStatus() {
  return {
    initialized: !!adminApp,
    hasAuth: !!adminAuth,
    hasDb: !!adminDb,
    initializationAttempted,
    hasError: !!initializationError,
    errorMessage: initializationError?.message
  };
}

export function resetFirebaseConnection() {
  adminApp = null;
  adminAuth = null;
  adminDb = null;
  initializationAttempted = false;
  initializationError = null;
  console.log('🔄 Firebase Admin SDK connection reset');
}

// Test function to validate Firebase configuration
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const app = initializeFirebaseAdmin();
    if (!app) {
      console.error('❌ Firebase app initialization failed');
      return false;
    }

    // Test Firestore connection
    const db = getAdminDb();
    await db.collection('__test__').limit(1).get();
    console.log('✅ Firestore connection test passed');

    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
}

// Safe initialization function that doesn't throw during build
export function safeInitializeFirebase(): App | null {
  try {
    return initializeFirebaseAdmin();
  } catch (error) {
    console.warn('⚠️ Safe Firebase initialization failed, continuing without Firebase');
    return null;
  }
}

// Backwards compatibility exports
export { getAdminAuth as adminAuth, getAdminDb as adminDb };
