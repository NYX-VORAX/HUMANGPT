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

// Check and expire subscriptions
async function checkAndExpireSubscriptions() {
  const db = getFirestore();
  const now = new Date();
  
  // Get all active subscriptions
  const subscriptionsSnapshot = await db
    .collection('subscriptions')
    .where('status', '==', 'active')
    .get();
  
  const expiredSubscriptions = [];
  const batch = db.batch();
  
  for (const doc of subscriptionsSnapshot.docs) {
    const subscription = doc.data();
    const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
    
    // Check if subscription has expired
    if (now > endDate) {
      // Mark subscription as expired
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: now
      });
      
      // Update user to free plan
      const userRef = db.collection('users').doc(subscription.uid);
      batch.update(userRef, {
        plan: 'free',
        subscriptionStatus: 'expired',
        features: FREE_PLAN_FEATURES,
        'subscription.status': 'expired',
        updatedAt: now
      });
      
      expiredSubscriptions.push({
        uid: subscription.uid,
        subscriptionId: doc.id,
        plan: subscription.plan,
        endDate: endDate
      });
    }
  }
  
  // Commit all changes
  if (expiredSubscriptions.length > 0) {
    await batch.commit();
    console.log(`Expired ${expiredSubscriptions.length} subscriptions:`, expiredSubscriptions);
  }
  
  return expiredSubscriptions;
}

// Check and reset daily counts for all users
async function checkAndResetDailyCounts() {
  const db = getFirestore();
  const now = new Date();
  const today = now.toDateString();
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  const resetsNeeded = [];
  const batch = db.batch();
  
  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    
    // Check if daily count needs reset
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
      batch.update(doc.ref, {
        dailyMessageCount: 0,
        lastMessageDate: now
      });
      
      resetsNeeded.push({
        uid: userData.uid,
        previousCount: userData.dailyMessageCount || 0,
        lastMessageDate: lastMessageDate
      });
    }
  }
  
  // Commit all resets
  if (resetsNeeded.length > 0) {
    await batch.commit();
    console.log(`Reset daily counts for ${resetsNeeded.length} users`);
  }
  
  return resetsNeeded;
}

export async function POST(request: NextRequest) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Verify API key for automated calls
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'check-expiry') {
      const expiredSubscriptions = await checkAndExpireSubscriptions();
      
      return NextResponse.json({
        success: true,
        message: `Checked subscriptions, expired: ${expiredSubscriptions.length}`,
        data: {
          expiredCount: expiredSubscriptions.length,
          expiredSubscriptions: expiredSubscriptions
        }
      }, { status: 200, headers });
    }
    
    if (action === 'reset-daily') {
      const resetsNeeded = await checkAndResetDailyCounts();
      
      return NextResponse.json({
        success: true,
        message: `Reset daily counts for ${resetsNeeded.length} users`,
        data: {
          resetCount: resetsNeeded.length,
          resets: resetsNeeded
        }
      }, { status: 200, headers });
    }
    
    if (action === 'full-check') {
      const [expiredSubscriptions, resetsNeeded] = await Promise.all([
        checkAndExpireSubscriptions(),
        checkAndResetDailyCounts()
      ]);
      
      return NextResponse.json({
        success: true,
        message: `Full check complete: ${expiredSubscriptions.length} expired, ${resetsNeeded.length} resets`,
        data: {
          expiredCount: expiredSubscriptions.length,
          resetCount: resetsNeeded.length,
          expiredSubscriptions: expiredSubscriptions,
          resets: resetsNeeded
        }
      }, { status: 200, headers });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400, headers }
    );

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }}
    );
  }
}

// For manual testing
export async function GET(request: NextRequest) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    };

    const [expiredSubscriptions, resetsNeeded] = await Promise.all([
      checkAndExpireSubscriptions(),
      checkAndResetDailyCounts()
    ]);

    return NextResponse.json({
      success: true,
      message: `Manual check complete: ${expiredSubscriptions.length} expired, ${resetsNeeded.length} resets`,
      data: {
        timestamp: new Date().toISOString(),
        expiredCount: expiredSubscriptions.length,
        resetCount: resetsNeeded.length,
        expiredSubscriptions: expiredSubscriptions,
        resets: resetsNeeded
      }
    }, { status: 200, headers });

  } catch (error) {
    console.error('Manual subscription check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }}
    );
  }
}
