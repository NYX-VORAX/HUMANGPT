import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Admin SDK initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Firebase Client SDK configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXRzRmZHChiuGPvFSQATieydIM2mkhm7k",
  authDomain: "humangpt-53e2a.firebaseapp.com",
  projectId: "humangpt-53e2a",
  storageBucket: "humangpt-53e2a.firebasestorage.app",
  messagingSenderId: "3109257561",
  appId: "1:3109257561:web:8c714b53ca62fec3cf0c48",
  measurementId: "G-1E5FQZLYPR"
};

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);

// Common interfaces
export interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  plan: 'free' | 'pro' | 'pro-plus';
  subscriptionStatus: 'inactive' | 'active' | 'expired' | 'cancelled';
  createdAt: admin.firestore.Timestamp;
  lastLoginAt: admin.firestore.Timestamp;
  messageCount: number;
  dailyMessageCount: number;
  lastMessageDate: admin.firestore.Timestamp | null;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
}

export interface SubscriptionData {
  uid: string;
  plan: 'pro' | 'pro-plus';
  status: 'active' | 'expired' | 'cancelled';
  paymentMethod: 'manual' | 'stripe' | 'paypal';
  amount: number;
  currency: string;
  nextBillingDate: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface PaymentData {
  uid: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  paymentMethod: 'manual' | 'stripe' | 'paypal';
  status: 'success' | 'failed' | 'pending';
  transactionId: string;
  createdAt: admin.firestore.Timestamp;
}

export const COLLECTIONS = {
  USERS: 'users',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
} as const;

export const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  PRO_PLUS: 'pro-plus',
} as const;

export const SUBSCRIPTION_STATUS = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_METHODS = {
  MANUAL: 'manual',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
} as const;

export const FREE_PLAN_DAILY_LIMIT = 20;

// Pricing Configuration
export const PRICING = {
  PRO: {
    USD: 2.50,
    INR: 199,
    currency: 'USD',
    displayPrice: '$2.50/month',
    displayPriceINR: '₹199/month',
  },
  PRO_PLUS: {
    USD: 5.00,
    INR: 399,
    currency: 'USD',
    displayPrice: '$5.00/month',
    displayPriceINR: '₹399/month',
  },
} as const;

// Plan Features
export const PLAN_FEATURES = {
  FREE: {
    name: 'Free',
    messageLimit: 20,
    features: ['20 messages per day', 'Basic chat functionality', 'Email support'],
  },
  PRO: {
    name: 'Pro',
    messageLimit: -1, // Unlimited
    features: ['Unlimited messages', 'Priority support', 'Advanced chat features', 'Chat history'],
    price: PRICING.PRO,
  },
  PRO_PLUS: {
    name: 'Pro Plus',
    messageLimit: -1, // Unlimited
    features: ['Everything in Pro', 'API access', 'Custom integrations', 'Premium support', 'Early access to new features'],
    price: PRICING.PRO_PLUS,
  },
} as const;

// Helper function to get plan price based on currency
export const getPlanPrice = (plan: 'pro' | 'pro-plus', currency: 'USD' | 'INR' = 'USD'): number => {
  if (plan === 'pro') {
    return currency === 'USD' ? PRICING.PRO.USD : PRICING.PRO.INR;
  }
  return currency === 'USD' ? PRICING.PRO_PLUS.USD : PRICING.PRO_PLUS.INR;
};

// Helper function to determine plan based on amount
export const getPlanFromAmount = (amount: number, currency: 'USD' | 'INR' = 'USD'): 'pro' | 'pro-plus' => {
  const proPrice = getPlanPrice('pro', currency);
  const proPlusPrice = getPlanPrice('pro-plus', currency);
  
  if (amount >= proPlusPrice) {
    return 'pro-plus';
  } else if (amount >= proPrice) {
    return 'pro';
  }
  return 'pro'; // Default to pro if amount is less than expected
};
