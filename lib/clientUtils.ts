import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// Production domain validation
const isProductionDomain = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.includes('vercel.app') || 
         hostname.includes('firebase.app') || 
         hostname.includes('firebaseapp.com') ||
         hostname.includes('yourdomain.com'); // Replace with your actual domain
};
import { UserData } from './firebaseConfig';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Creates or updates user document in Firestore when user signs up/logs in
 */
export const createOrUpdateUserDocumentClient = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLoginAt: serverTimestamp(),
  };

  if (userSnap.exists()) {
    // Update existing user
    await updateDoc(userRef, userData);
  } else {
    // Create new user document
    await setDoc(userRef, {
      ...userData,
      plan: 'free',
      subscriptionStatus: 'inactive',
      createdAt: serverTimestamp(),
      messageCount: 0,
      dailyMessageCount: 0,
      lastMessageDate: null,
      
      // Subscription Management Fields
      subscription: {
        id: null,
        status: 'inactive', // inactive, active, cancelled, expired, past_due
        plan: 'free', // free, pro, pro-plus
        startDate: null,
        endDate: null,
        renewalDate: null,
        cancelledAt: null,
        trialEnd: null,
        autoRenew: false,
        paymentMethod: null,
        priceId: null,
        customerId: null,
        interval: null, // monthly, yearly
        amount: 0,
        currency: 'USD'
      },
      
      // Billing Information
      billing: {
        name: null,
        email: userData.email,
        address: {
          line1: null,
          line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null
        },
        phone: null
      },
      
      // Usage Tracking
      usage: {
        totalMessages: 0,
        messagesThisMonth: 0,
        lastResetDate: serverTimestamp(),
        apiCallsToday: 0,
        bandwidthUsed: 0
      },
      
      // Feature Access
      features: {
        basicPersonas: true,
        premiumPersonas: false,
        unlimitedMessages: false,
        prioritySupport: false,
        advancedAnalytics: false,
        customPersonas: false,
        apiAccess: false,
        exportData: false
      },
      
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
        emailUpdates: true,
        marketingEmails: false
      },
      
      // Account Status
      account: {
        isActive: true,
        isVerified: false,
        isSuspended: false,
        suspensionReason: null,
        lastLoginAt: serverTimestamp(),
        loginCount: 1,
        referralCode: null,
        referredBy: null
      }
    });
  }
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserDocumentClient(userCredential.user);
    return userCredential.user;
  } catch (error) {
    throw new Error(`Sign up failed: ${error}`);
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserDocumentClient(userCredential.user);
    return userCredential.user;
  } catch (error) {
    throw new Error(`Sign in failed: ${error}`);
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    await createOrUpdateUserDocumentClient(userCredential.user);
    return userCredential.user;
  } catch (error) {
    throw new Error(`Google sign in failed: ${error}`);
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error(`Sign out failed: ${error}`);
  }
};

/**
 * Get current user data from Firestore
 */
export const getCurrentUserData = async (): Promise<UserData | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to get user data: ${error}`);
  }
};

/**
 * Check if user can send message
 */
export const canUserSendMessage = async (): Promise<boolean> => {
  const userData = await getCurrentUserData();
  if (!userData) return false;

  // Premium users have unlimited messages
  if (userData.plan === 'pro' || userData.plan === 'pro-plus') {
    return true;
  }

  // Free users have 20 messages per day limit
  return userData.dailyMessageCount < 20;
};

/**
 * Check if it's a new day and reset daily count if needed
 */
export const checkAndResetDailyCount = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data();
  const now = new Date();
  const today = now.toDateString();
  
  // Get last message date
  let lastMessageDate = null;
  if (userData.lastMessageDate) {
    if (userData.lastMessageDate.toDate) {
      lastMessageDate = userData.lastMessageDate.toDate().toDateString();
    } else {
      lastMessageDate = new Date(userData.lastMessageDate).toDateString();
    }
  }
  
  // If it's a new day, reset daily count
  if (!lastMessageDate || lastMessageDate !== today) {
    await updateDoc(userRef, {
      dailyMessageCount: 0,
      lastMessageDate: serverTimestamp(),
    });
  }
};

/**
 * Increment message count for current user
 */
export const incrementUserMessageCount = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check and reset daily count if it's a new day
  await checkAndResetDailyCount();
  
  const canSend = await canUserSendMessage();
  if (!canSend) {
    throw new Error('Daily message limit reached');
  }

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    messageCount: increment(1),
    dailyMessageCount: increment(1),
    lastMessageDate: serverTimestamp(),
  });
};

/**
 * Get user's remaining message count
 */
export const getRemainingMessages = async (): Promise<number> => {
  const userData = await getCurrentUserData();
  if (!userData) return 0;

  // Premium users have unlimited messages
  if (userData.plan === 'pro' || userData.plan === 'pro-plus') {
    return -1; // -1 indicates unlimited
  }

  // Free users have 20 messages per day limit
  return Math.max(0, 20 - userData.dailyMessageCount);
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Listen to user data changes
 */
export const onUserDataChange = (callback: (userData: UserData | null) => void): (() => void) => {
  const user = auth.currentUser;
  if (!user) {
    callback(null);
    return () => {};
  }

  const userRef = doc(db, 'users', user.uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserData);
    } else {
      callback(null);
    }
  });
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (preferences: Partial<UserData['preferences']>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const updates: any = {};
  
  Object.entries(preferences).forEach(([key, value]) => {
    updates[`preferences.${key}`] = value;
  });

  await updateDoc(userRef, updates);
};
