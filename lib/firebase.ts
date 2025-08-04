// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXRzRmZHChiuGPvFSQATieydIM2mkhm7k",
  authDomain: "humangpt-53e2a.firebaseapp.com",
  projectId: "humangpt-53e2a",
  storageBucket: "humangpt-53e2a.firebasestorage.app",
  messagingSenderId: "3109257561",
  appId: "1:3109257561:web:8c714b53ca62fec3cf0c48",
  measurementId: "G-1E5FQZLYPR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}
export { analytics };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create or update user document
    await createOrUpdateUserDocument(user);
    
    return { user, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { user: null, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return { user: null, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Create user document with additional info
    await createOrUpdateUserDocument(user, { displayName });
    
    // Sign out the user after creating account so they need to login
    await signOut(auth);
    
    return { user: null, error: null, success: true };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return { user: null, error: error.message, success: false };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { error: error.message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// User document management
export const createOrUpdateUserDocument = async (user: User, additionalData?: any) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user document
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData?.displayName || '',
      photoURL: user.photoURL || '',
      plan: 'free',
      subscriptionStatus: 'inactive',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      messageCount: 0,
      dailyMessageCount: 0,
      lastMessageDate: null,
      preferences: {
        theme: 'dark',
        notifications: true
      },
      ...additionalData
    };

    await setDoc(userRef, userData);
    return userData;
  } else {
    // Update existing user's last login
    await updateDoc(userRef, {
      lastLoginAt: new Date()
    });
    return userSnap.data();
  }
};

// User data functions
export const getUserDocument = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { data: userSnap.data(), error: null };
    } else {
      return { data: null, error: 'User not found' };
    }
  } catch (error: any) {
    console.error('Get user document error:', error);
    return { data: null, error: error.message };
  }
};

export const updateUserPlan = async (uid: string, plan: 'free' | 'pro' | 'pro-plus', subscriptionStatus: string = 'active') => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      plan,
      subscriptionStatus,
      updatedAt: new Date()
    });
    return { error: null };
  } catch (error: any) {
    console.error('Update user plan error:', error);
    return { error: error.message };
  }
};

// Message tracking (for free plan limits)
export const incrementMessageCount = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const today = new Date().toDateString();
      const lastMessageDate = userData.lastMessageDate?.toDate?.()?.toDateString();
      
      let dailyCount = userData.dailyMessageCount || 0;
      
      // Reset daily count if it's a new day
      if (lastMessageDate !== today) {
        dailyCount = 0;
      }
      
      await updateDoc(userRef, {
        messageCount: (userData.messageCount || 0) + 1,
        dailyMessageCount: dailyCount + 1,
        lastMessageDate: new Date()
      });
      
      return { 
        totalMessages: (userData.messageCount || 0) + 1,
        dailyMessages: dailyCount + 1,
        error: null 
      };
    }
    
    return { totalMessages: 0, dailyMessages: 0, error: 'User not found' };
  } catch (error: any) {
    console.error('Increment message count error:', error);
    return { totalMessages: 0, dailyMessages: 0, error: error.message };
  }
};

// Payment tracking
export const createPaymentRecord = async (uid: string, paymentData: any) => {
  try {
    const paymentRef = await addDoc(collection(db, 'payments'), {
      uid,
      ...paymentData,
      createdAt: new Date(),
      status: 'completed'
    });
    
    return { paymentId: paymentRef.id, error: null };
  } catch (error: any) {
    console.error('Create payment record error:', error);
    return { paymentId: null, error: error.message };
  }
};

// Subscription management
export const getActiveSubscription = async (uid: string) => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef, where('uid', '==', uid), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const subscription = querySnapshot.docs[0].data();
      return { subscription, error: null };
    }
    
    return { subscription: null, error: null };
  } catch (error: any) {
    console.error('Get active subscription error:', error);
    return { subscription: null, error: error.message };
  }
};

export const createSubscription = async (uid: string, plan: string, paymentMethod: string, amount: number) => {
  try {
    const subscriptionData = {
      uid,
      plan,
      paymentMethod,
      amount,
      status: 'active',
      createdAt: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false
    };
    
    const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscriptionData);
    
    // Update user plan
    await updateUserPlan(uid, plan as 'free' | 'pro' | 'pro-plus');
    
    return { subscriptionId: subscriptionRef.id, error: null };
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return { subscriptionId: null, error: error.message };
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
