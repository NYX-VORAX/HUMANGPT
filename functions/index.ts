import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled function to reset daily message count for all users at midnight UTC
 */
export const resetDailyMessageCount = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      functions.logger.info('Starting daily message count reset');
      
      const usersSnapshot = await db.collection('users').get();
      const batchSize = 500; // Firestore batch limit
      const batches = [];
      
      for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        
        for (let j = i; j < Math.min(i + batchSize, usersSnapshot.docs.length); j++) {
          const doc = usersSnapshot.docs[j];
          batch.update(doc.ref, {
            dailyMessageCount: 0,
          });
        }
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      
      functions.logger.info(`Daily message count reset completed for ${usersSnapshot.docs.length} users`);
      return null;
    } catch (error) {
      functions.logger.error('Failed to reset daily message count:', error);
      throw error;
    }
  });

/**
 * Scheduled function to expire subscriptions that have passed their nextBillingDate
 */
export const expireSubscriptionsTask = functions.pubsub
  .schedule('0 */6 * * *') // Run every 6 hours
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      functions.logger.info('Starting subscription expiry check');
      
      const expiredSubscriptions = await db
        .collection('subscriptions')
        .where('nextBillingDate', '<', admin.firestore.Timestamp.now())
        .where('status', '==', 'active')
        .get();
      
      const batch = db.batch();
      const processedUsers = new Set<string>();
      
      expiredSubscriptions.forEach(doc => {
        const subscription = doc.data();
        
        // Update subscription status
        batch.update(doc.ref, { status: 'expired' });
        
        // Update user plan if not already processed
        if (!processedUsers.has(subscription.uid)) {
          const userRef = db.collection('users').doc(subscription.uid);
          batch.update(userRef, {
            plan: 'free',
            subscriptionStatus: 'expired',
          });
          processedUsers.add(subscription.uid);
        }
      });
      
      await batch.commit();
      
      functions.logger.info(`Expired ${expiredSubscriptions.size} subscriptions and downgraded ${processedUsers.size} users`);
      return null;
    } catch (error) {
      functions.logger.error('Failed to expire subscriptions:', error);
      throw error;
    }
  });

/**
 * Triggered when a user is created via Firebase Auth
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = db.collection('users').doc(user.uid);
    
    await userRef.set({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      plan: 'free',
      subscriptionStatus: 'inactive',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
      dailyMessageCount: 0,
      lastMessageDate: null,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
      },
    });
    
    functions.logger.info(`User document created for ${user.uid}`);
    return null;
  } catch (error) {
    functions.logger.error(`Failed to create user document for ${user.uid}:`, error);
    throw error;
  }
});

/**
 * Scheduled function to check and handle expired subscriptions
 */
export const checkExpiredSubscriptions = functions.pubsub
  .schedule('0 */6 * * *') // Run every 6 hours
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      functions.logger.info('Starting expired subscription check');
      
      const now = admin.firestore.Timestamp.now();
      
      // Get all users with active or cancelled subscriptions that have passed their end date
      const expiredSubscriptionsQuery = await db
        .collection('users')
        .where('subscription.status', 'in', ['active', 'cancelled'])
        .where('subscription.endDate', '<', now)
        .get();
      
      const batch = db.batch();
      const processedUsers = new Set<string>();
      
      expiredSubscriptionsQuery.forEach(doc => {
        const userData = doc.data();
        const subscription = userData.subscription;
        
        if (!processedUsers.has(doc.id)) {
          // Downgrade user to free plan
          batch.update(doc.ref, {
            plan: 'free',
            subscriptionStatus: 'expired',
            'subscription.status': 'expired',
            'subscription.cancelledAt': now,
            'features.basicPersonas': true,
            'features.premiumPersonas': false,
            'features.unlimitedMessages': false,
            'features.prioritySupport': false,
            'features.advancedAnalytics': false,
            'features.customPersonas': false,
            'features.apiAccess': false,
            'features.exportData': false,
            updatedAt: now
          });
          
          processedUsers.add(doc.id);
        }
      });
      
      await batch.commit();
      
      functions.logger.info(`Processed ${processedUsers.size} expired subscriptions`);
      return null;
    } catch (error) {
      functions.logger.error('Failed to check expired subscriptions:', error);
      throw error;
    }
  });

/**
 * Scheduled function to reset monthly usage statistics
 */
export const resetMonthlyUsage = functions.pubsub
  .schedule('0 0 1 * *') // Run on the 1st of every month at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      functions.logger.info('Starting monthly usage reset');
      
      const usersSnapshot = await db.collection('users').get();
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        
        for (let j = i; j < Math.min(i + batchSize, usersSnapshot.docs.length); j++) {
          const doc = usersSnapshot.docs[j];
          batch.update(doc.ref, {
            'usage.messagesThisMonth': 0,
            'usage.apiCallsToday': 0,
            'usage.lastResetDate': admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      
      functions.logger.info(`Monthly usage reset completed for ${usersSnapshot.docs.length} users`);
      return null;
    } catch (error) {
      functions.logger.error('Failed to reset monthly usage:', error);
      throw error;
    }
  });

/**
 * HTTP callable function to create/update subscription
 */
export const manageSubscription = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { action, subscriptionData } = data;
    const userId = context.auth.uid;
    
    switch (action) {
      case 'create':
        await createSubscription(userId, subscriptionData);
        break;
      case 'cancel':
        await cancelSubscription(userId, subscriptionData.immediate || false);
        break;
      case 'update':
        await updateSubscription(userId, subscriptionData);
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
    }
    
    return { success: true };
  } catch (error) {
    functions.logger.error('Failed to manage subscription:', error);
    throw new functions.https.HttpsError('internal', 'Failed to manage subscription');
  }
});

// Helper functions
async function createSubscription(userId: string, subscriptionData: any) {
  const userRef = db.collection('users').doc(userId);
  
  const planFeatures = getPlanFeatures(subscriptionData.plan);
  
  await userRef.update({
    plan: subscriptionData.plan,
    subscriptionStatus: 'active',
    subscription: {
      id: subscriptionData.id,
      status: 'active',
      plan: subscriptionData.plan,
      startDate: admin.firestore.Timestamp.fromDate(new Date(subscriptionData.startDate)),
      endDate: admin.firestore.Timestamp.fromDate(new Date(subscriptionData.endDate)),
      renewalDate: admin.firestore.Timestamp.fromDate(new Date(subscriptionData.renewalDate)),
      cancelledAt: null,
      trialEnd: subscriptionData.trialEnd ? admin.firestore.Timestamp.fromDate(new Date(subscriptionData.trialEnd)) : null,
      autoRenew: subscriptionData.autoRenew || true,
      paymentMethod: subscriptionData.paymentMethod,
      priceId: subscriptionData.priceId,
      customerId: subscriptionData.customerId,
      interval: subscriptionData.interval,
      amount: subscriptionData.amount,
      currency: subscriptionData.currency || 'USD'
    },
    features: planFeatures,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function cancelSubscription(userId: string, immediate: boolean) {
  const userRef = db.collection('users').doc(userId);
  
  if (immediate) {
    // Immediate cancellation - downgrade to free
    const freePlanFeatures = getPlanFeatures('free');
    await userRef.update({
      plan: 'free',
      subscriptionStatus: 'cancelled',
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
      features: freePlanFeatures,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } else {
    // Cancel at end of billing period
    await userRef.update({
      subscriptionStatus: 'cancelled',
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.autoRenew': false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function updateSubscription(userId: string, subscriptionData: any) {
  const userRef = db.collection('users').doc(userId);
  
  const planFeatures = getPlanFeatures(subscriptionData.plan);
  
  await userRef.update({
    plan: subscriptionData.plan,
    'subscription.plan': subscriptionData.plan,
    'subscription.amount': subscriptionData.amount,
    'subscription.interval': subscriptionData.interval,
    'subscription.priceId': subscriptionData.priceId,
    features: planFeatures,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

function getPlanFeatures(plan: string) {
  switch (plan) {
    case 'pro':
      return {
        basicPersonas: true,
        premiumPersonas: true,
        unlimitedMessages: true,
        prioritySupport: true,
        advancedAnalytics: true,
        customPersonas: false,
        apiAccess: false,
        exportData: true
      };
    case 'pro-plus':
      return {
        basicPersonas: true,
        premiumPersonas: true,
        unlimitedMessages: true,
        prioritySupport: true,
        advancedAnalytics: true,
        customPersonas: true,
        apiAccess: true,
        exportData: true
      };
    default: // free
      return {
        basicPersonas: true,
        premiumPersonas: false,
        unlimitedMessages: false,
        prioritySupport: false,
        advancedAnalytics: false,
        customPersonas: false,
        apiAccess: false,
        exportData: false
      };
  }
}

/**
 * HTTP callable function to get user statistics (for admin dashboard)
 */
export const getUserStatistics = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Get active subscriptions
    const activeSubscriptionsSnapshot = await db
      .collection('users')
      .where('subscription.status', '==', 'active')
      .get();
    const activeSubscriptions = activeSubscriptionsSnapshot.size;
    
    // Get revenue from active subscriptions
    let totalRevenue = 0;
    activeSubscriptionsSnapshot.forEach(doc => {
      const userData = doc.data();
      totalRevenue += userData.subscription?.amount || 0;
    });
    
    // Get plan distribution
    const planDistribution = {
      free: 0,
      pro: 0,
      'pro-plus': 0
    };
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const plan = userData.subscription?.plan || userData.plan || 'free';
      if (planDistribution.hasOwnProperty(plan)) {
        planDistribution[plan as keyof typeof planDistribution]++;
      }
    });
    
    return {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      planDistribution,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    functions.logger.error('Failed to get user statistics:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user statistics');
  }
});
