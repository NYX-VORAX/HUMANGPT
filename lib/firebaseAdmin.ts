import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let initializationError: Error | null = null;

// Parse service account from environment variables
function getServiceAccountConfig() {
  // Option 1: Try to parse FIREBASE_SERVICE_ACCOUNT JSON string
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
        return {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        };
      }
    } catch (error) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', error);
    }
  }

  // Option 2: Use individual environment variables with fallback to project ID
  const projectId = process.env.FIREBASE_PROJECT_ID || 'humangpt-53e2a';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    };
  }

  return null;
}

// Initialize Firebase Admin SDK with proper error handling
function initializeFirebaseAdmin(): App | null {
  if (adminApp) {
    return adminApp;
  }

  if (initializationError) {
    throw initializationError;
  }

  try {
    const serviceAccountConfig = getServiceAccountConfig();
    
    if (!serviceAccountConfig) {
      const error = new Error('Missing Firebase service account configuration. Please set either FIREBASE_SERVICE_ACCOUNT (JSON string) or individual variables (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
      initializationError = error;
      console.error('Firebase initialization failed:', error.message);
      // Don't throw during build time, just return null
      return null;
    }

    // Initialize only if not already initialized
    if (!getApps().length) {
      adminApp = initializeApp({
        credential: cert(serviceAccountConfig)
      });
      console.log('Firebase Admin SDK initialized successfully with project:', serviceAccountConfig.projectId);
    } else {
      adminApp = getApps()[0];
    }

    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    initializationError = error as Error;
    // Don't throw during build time, just return null
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

// Backwards compatibility exports
export { getAdminAuth as adminAuth, getAdminDb as adminDb };
