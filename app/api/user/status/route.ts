import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

const FREE_PLAN_FEATURES = {
  basicPersonas: true,
  premiumPersonas: false,
  unlimitedMessages: false,
  prioritySupport: false,
  advancedAnalytics: false,
  customPersonas: false,
  apiAccess: false,
  exportData: false,
  lockedPersonas: false,
  infiniteChat: false
};

const PLAN_FEATURES = {
  free: FREE_PLAN_FEATURES,
  pro: {
    basicPersonas: true,
    premiumPersonas: true,
    unlimitedMessages: true,
    prioritySupport: true,
    advancedAnalytics: true,
    customPersonas: false,
    apiAccess: false,
    exportData: true,
    lockedPersonas: true,
    infiniteChat: true
  },
  'pro-plus': {
    basicPersonas: true,
    premiumPersonas: true,
    unlimitedMessages: true,
    prioritySupport: true,
    advancedAnalytics: true,
    customPersonas: true,
    apiAccess: true,
    exportData: true,
    lockedPersonas: true,
    infiniteChat: true
  }
};

const DAILY_MESSAGE_LIMITS = {
  free: 20,
  pro: -1, // Unlimited
  'pro-plus': -1 // Unlimited
};

// Check if subscription is expired
function isSubscriptionExpired(subscription: any): boolean {
  if (!subscription || !subscription.endDate) return true;
  
  const now = new Date();
  const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
  
  return now > endDate;
}

// Calculate days remaining in subscription
function getDaysRemaining(subscription: any): number {
  if (!subscription || !subscription.endDate) return 0;
  
  const now = new Date();
  const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
  
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

// Check if daily message limit is reached
function isDailyLimitReached(user: any): boolean {
  const plan = user.plan || 'free';
  const dailyLimit = DAILY_MESSAGE_LIMITS[plan as keyof typeof DAILY_MESSAGE_LIMITS];
  
  if (dailyLimit === -1) return false; // Unlimited
  
  const today = new Date();
  const lastMessageDate = user.lastMessageDate?.toDate ? user.lastMessageDate.toDate() : new Date(user.lastMessageDate || 0);
  
  // Reset daily count if it's a new day
  if (today.toDateString() !== lastMessageDate.toDateString()) {
    return false;
  }
  
  return (user.dailyMessageCount || 0) >= dailyLimit;
}

export async function GET(request: NextRequest) {
  try {
    // Security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers }
      );
    }

    const token = authHeader.substring(7);
    
    let decodedToken;
    try {
      const adminAuth = getAdminAuth();
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401, headers }
      );
    }

    const adminDb = getAdminDb();
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create default user document
      const defaultUserData = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || null,
        photoURL: decodedToken.picture || null,
        plan: 'free',
        subscriptionStatus: 'inactive',
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
        features: FREE_PLAN_FEATURES,
        updatedAt: new Date()
      };

      await userRef.set(defaultUserData);
      
      return NextResponse.json({
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name || null,
          photoURL: decodedToken.picture || null,
          plan: 'free',
          subscriptionStatus: 'inactive',
          features: FREE_PLAN_FEATURES,
          limits: {
            dailyMessages: DAILY_MESSAGE_LIMITS.free,
            remainingMessages: DAILY_MESSAGE_LIMITS.free,
            isLimitReached: false
          },
          subscription: null
        }
      }, { status: 200, headers });
    }

    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'Unable to retrieve user data' },
        { status: 500, headers }
      );
    }
    const plan = userData.plan || 'free';
    
    // Get active subscription
    const subscriptionsSnapshot = await adminDb
      .collection('subscriptions')
      .where('uid', '==', decodedToken.uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let subscription = null;
    let subscriptionExpired = false;

    if (!subscriptionsSnapshot.empty) {
      subscription = subscriptionsSnapshot.docs[0].data();
      subscriptionExpired = isSubscriptionExpired(subscription);
      
      // If subscription is expired, downgrade user to free plan
      if (subscriptionExpired && plan !== 'free') {
        const batch = adminDb.batch();
        
        // Update user to free plan
        batch.update(userRef, {
          plan: 'free',
          subscriptionStatus: 'expired',
          features: FREE_PLAN_FEATURES,
          updatedAt: new Date()
        });
        
        // Update subscription status
        batch.update(subscriptionsSnapshot.docs[0].ref, {
          status: 'expired',
          updatedAt: new Date()
        });
        
        await batch.commit();
        
        return NextResponse.json({
          success: true,
          user: {
            uid: decodedToken.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            plan: 'free',
            subscriptionStatus: 'expired',
            features: FREE_PLAN_FEATURES,
            limits: {
              dailyMessages: DAILY_MESSAGE_LIMITS.free,
              remainingMessages: Math.max(0, DAILY_MESSAGE_LIMITS.free - (userData.dailyMessageCount || 0)),
              isLimitReached: isDailyLimitReached({ ...userData, plan: 'free' })
            },
            subscription: {
              ...subscription,
              status: 'expired',
              daysRemaining: 0
            }
          }
        }, { status: 200, headers });
      }
    }

    // Calculate remaining messages for current plan
    const normalizedPlan = plan.toLowerCase();
    const dailyLimit = DAILY_MESSAGE_LIMITS[normalizedPlan as keyof typeof DAILY_MESSAGE_LIMITS] || DAILY_MESSAGE_LIMITS.free;
    
    // For Pro users, check if subscription is active
    let effectiveLimit = dailyLimit;
    if ((normalizedPlan === 'pro' || normalizedPlan === 'pro-plus') && userData.subscriptionStatus !== 'active') {
      effectiveLimit = DAILY_MESSAGE_LIMITS.free; // Treat as free if subscription not active
    }
    
    const remainingMessages = effectiveLimit === -1 ? -1 : Math.max(0, effectiveLimit - (userData.dailyMessageCount || 0));
    const isLimitReached = effectiveLimit === -1 ? false : (userData.dailyMessageCount || 0) >= effectiveLimit;

    // Get plan features
    const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || FREE_PLAN_FEATURES;

    // Update last login
    await userRef.update({
      lastLoginAt: new Date()
    });

    const response = {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        plan: plan,
        subscriptionStatus: userData.subscriptionStatus || 'inactive',
        features: features,
        limits: {
          dailyMessages: effectiveLimit,
          remainingMessages: remainingMessages,
          isLimitReached: isLimitReached,
          planLimit: dailyLimit, // Original plan limit
          hasUnlimitedMessages: effectiveLimit === -1
        },
        subscription: subscription ? {
          id: subscription.subscriptionId,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          nextBillingDate: subscription.nextBillingDate,
          autoRenew: subscription.autoRenew,
          amount: subscription.amount,
          currency: subscription.currency,
          paymentMethod: subscription.paymentMethod,
          daysRemaining: getDaysRemaining(subscription)
        } : null,
        preferences: userData.preferences || {
          theme: 'dark',
          notifications: true,
          language: 'en'
        },
        stats: {
          totalMessages: userData.messageCount || 0,
          dailyMessages: userData.dailyMessageCount || 0,
          lastMessageDate: userData.lastMessageDate,
          memberSince: userData.createdAt
        }
      }
    };

    return NextResponse.json(response, { status: 200, headers });

  } catch (error) {
    console.error('User status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Disable other HTTP methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
