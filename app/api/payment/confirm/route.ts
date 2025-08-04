import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

// Plan configuration
const SUBSCRIPTION_PLANS = {
  pro: {
    name: 'pro',
    displayName: 'Pro Plan',
    priceUSD: 2.50,
    priceINR: 199,
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: false,
      apiAccess: false,
      exportData: true,
      lockedPersonas: true, // Unlock locked personas
      infiniteChat: true
    }
  },
  'pro-plus': {
    name: 'pro-plus',
    displayName: 'Pro Plus Plan',
    priceUSD: 5.00,
    priceINR: 399,
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: true,
      apiAccess: true,
      exportData: true,
      lockedPersonas: true, // Unlock locked personas
      infiniteChat: true
    }
  }
};

const FREE_PLAN_FEATURES = {
  basicPersonas: true,
  premiumPersonas: false,
  unlimitedMessages: false,
  prioritySupport: false,
  advancedAnalytics: false,
  customPersonas: false,
  apiAccess: false,
  exportData: false,
  lockedPersonas: false, // Locked personas remain locked
  infiniteChat: false
};

// Payment method validation
const VALID_PAYMENT_METHODS = ['stripe', 'paypal', 'crypto', 'razorpay'];

// Validate payment amount based on plan and currency
function validatePaymentAmount(plan: string, amount: number, currency: string = 'USD'): boolean {
  const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
  if (!planConfig) return false;
  
  const expectedAmount = currency === 'INR' ? planConfig.priceINR : planConfig.priceUSD;
  // Allow for small variations due to payment processor fees
  const tolerance = currency === 'INR' ? 10 : 0.50;
  
  return Math.abs(amount - expectedAmount) <= tolerance;
}

// Calculate subscription end date (1 month from start)
function calculateSubscriptionEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
}

// Generate unique transaction ID
function generateTransactionId(paymentMethod: string): string {
  return `${paymentMethod}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create user data structure for new users
function createUserData(uid: string, email: string, displayName: string | null, plan: string) {
  const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
  
  return {
    uid,
    email,
    displayName: displayName || null,
    photoURL: null,
    plan: plan,
    subscriptionStatus: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    messageCount: 0,
    dailyMessageCount: 0,
    lastMessageDate: null,
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en',
    },
    features: planConfig.features,
    updatedAt: new Date(),
    subscription: {} as any // Will be populated later
  };
}

export async function POST(request: NextRequest) {
  try {
    // Security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400, headers }
      );
    }

    // Validate required fields
    const {
      uid,
      email,
      displayName,
      plan,
      amount,
      currency = 'USD',
      paymentMethod,
      transactionId,
      paymentProviderId,
      subscriptionId
    } = body;

    if (!uid || !email || !plan || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: uid, email, plan, amount, paymentMethod' },
        { status: 400, headers }
      );
    }

    // Validate plan
    if (!SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription plan' },
        { status: 400, headers }
      );
    }

    // Validate payment method
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400, headers }
      );
    }

    // Validate payment amount
    if (!validatePaymentAmount(plan, amount, currency)) {
      return NextResponse.json(
        { success: false, error: 'Payment amount does not match plan price' },
        { status: 400, headers }
      );
    }

    const db = getFirestore();
    const auth = getAuth();
    
    // Check if user exists, if not create them
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (error) {
      // User doesn't exist, create them
      try {
        userRecord = await auth.createUser({
          uid,
          email,
          displayName,
          emailVerified: true
        });
      } catch (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create user account' },
          { status: 500, headers }
        );
      }
    }

    const now = new Date();
    const subscriptionEndDate = calculateSubscriptionEndDate(now);
    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];

    // Use batch write for atomic operations
    const batch = db.batch();

    // 1. Create/Update user document
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const subscriptionRef = db.collection('subscriptions').doc();
    if (userDoc.exists) {
      // Update existing user
      batch.update(userRef, {
        plan: plan,
        subscriptionStatus: 'active',
        features: planConfig.features,
        lastLoginAt: now,
        updatedAt: now,
        // Store subscription details in user document
        subscription: {
          id: subscriptionId || subscriptionRef.id,
          status: 'active',
          plan: plan,
          startDate: now,
          endDate: subscriptionEndDate,
          nextBillingDate: subscriptionEndDate,
          autoRenew: true,
          paymentMethod: paymentMethod,
          amount: amount,
          currency: currency,
          paymentProviderId: paymentProviderId || null
        }
      });
    } else {
      // Create new user
      const userData = createUserData(uid, email, displayName, plan);
      // Add subscription details to new user
      userData.subscription = {
        id: subscriptionId || subscriptionRef.id,
        status: 'active',
        plan: plan,
        startDate: now,
        endDate: subscriptionEndDate,
        nextBillingDate: subscriptionEndDate,
        autoRenew: true,
        paymentMethod: paymentMethod,
        amount: amount,
        currency: currency,
        paymentProviderId: paymentProviderId || null
      };
      batch.set(userRef, userData);
    }

    // 2. Create subscription document
    const subscriptionData = {
      uid,
      plan,
      status: 'active',
      paymentMethod,
      amount,
      currency,
      startDate: now,
      endDate: subscriptionEndDate,
      nextBillingDate: subscriptionEndDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
      subscriptionId: subscriptionId || subscriptionRef.id,
      paymentProviderId: paymentProviderId || null
    };
    batch.set(subscriptionRef, subscriptionData);

    // 3. Create payment record
    const paymentRef = db.collection('payments').doc();
    const paymentData = {
      uid,
      subscriptionId: subscriptionRef.id,
      amount,
      currency,
      paymentMethod,
      status: 'success',
      transactionId: transactionId || generateTransactionId(paymentMethod),
      paymentProviderId: paymentProviderId || null,
      plan,
      createdAt: now,
      processedAt: now
    };
    batch.set(paymentRef, paymentData);

    // 4. Create user activity log
    const activityRef = db.collection('user_activities').doc();
    const activityData = {
      uid,
      action: 'subscription_activated',
      details: {
        plan,
        amount,
        currency,
        paymentMethod,
        subscriptionId: subscriptionRef.id,
        paymentId: paymentRef.id
      },
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
    batch.set(activityRef, activityData);

    // Execute batch write
    await batch.commit();

    // Log successful payment confirmation
    console.log(`Payment confirmed for user ${uid}:`, {
      plan,
      amount,
      currency,
      paymentMethod,
      subscriptionId: subscriptionRef.id,
      endDate: subscriptionEndDate.toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and subscription activated',
      data: {
        subscriptionId: subscriptionRef.id,
        paymentId: paymentRef.id,
        plan,
        status: 'active',
        startDate: now.toISOString(),
        endDate: subscriptionEndDate.toISOString(),
        features: planConfig.features
      }
    }, { status: 200, headers });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during payment confirmation' },
      { status: 500, headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }}
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Disable other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
