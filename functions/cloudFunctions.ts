import * as functions from 'firebase-functions';
import { createOrUpdateUserDocument } from './authHandlers';
import { resetAllUsersDailyMessageCount } from './chatLimit';
import { expireSubscriptions } from './subscriptionManager';
import { adminDb, COLLECTIONS, SUBSCRIPTION_STATUS, getPlanFromAmount, getPlanPrice } from './firebaseConfig';

/**
 * Triggered when a user is created via Firebase Auth
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await createOrUpdateUserDocument(user);
    functions.logger.info(`User document created for ${user.uid}`);
  } catch (error) {
    functions.logger.error(`Failed to create user document for ${user.uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to create user document');
  }
});

/**
 * Triggered when a user is deleted via Firebase Auth
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    // Delete user document and related data
    const batch = adminDb.batch();
    
    // Delete user document
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(user.uid);
    batch.delete(userRef);
    
    // Delete user's subscriptions
    const subscriptionsQuery = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('uid', '==', user.uid)
      .get();
    
    subscriptionsQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user's payments
    const paymentsQuery = await adminDb
      .collection(COLLECTIONS.PAYMENTS)
      .where('uid', '==', user.uid)
      .get();
    
    paymentsQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    functions.logger.info(`User data deleted for ${user.uid}`);
  } catch (error) {
    functions.logger.error(`Failed to delete user data for ${user.uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user data');
  }
});

/**
 * Scheduled function to reset daily message count for all users at midnight UTC
 */
export const resetDailyMessageCount = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      await resetAllUsersDailyMessageCount();
      functions.logger.info('Daily message count reset completed');
    } catch (error) {
      functions.logger.error('Failed to reset daily message count:', error);
      throw new functions.https.HttpsError('internal', 'Failed to reset daily message count');
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
      await expireSubscriptions();
      
      // Also update users with expired subscriptions to downgrade their plan
      const expiredSubscriptions = await adminDb
        .collection(COLLECTIONS.SUBSCRIPTIONS)
        .where('status', '==', SUBSCRIPTION_STATUS.EXPIRED)
        .get();
      
      const batch = adminDb.batch();
      const processedUsers = new Set<string>();
      
      expiredSubscriptions.forEach(doc => {
        const subscription = doc.data();
        
        // Avoid processing the same user multiple times
        if (!processedUsers.has(subscription.uid)) {
          const userRef = adminDb.collection(COLLECTIONS.USERS).doc(subscription.uid);
          batch.update(userRef, {
            plan: 'free',
            subscriptionStatus: 'expired',
          });
          processedUsers.add(subscription.uid);
        }
      });
      
      await batch.commit();
      
      functions.logger.info(`Expired ${expiredSubscriptions.size} subscriptions and downgraded ${processedUsers.size} users`);
    } catch (error) {
      functions.logger.error('Failed to expire subscriptions:', error);
      throw new functions.https.HttpsError('internal', 'Failed to expire subscriptions');
    }
  });

/**
 * HTTP callable function to get user statistics (for admin dashboard)
 */
export const getUserStatistics = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated and has admin role
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Get total users
    const usersSnapshot = await adminDb.collection(COLLECTIONS.USERS).get();
    const totalUsers = usersSnapshot.size;
    
    // Get active subscriptions
    const activeSubscriptionsSnapshot = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('status', '==', SUBSCRIPTION_STATUS.ACTIVE)
      .get();
    const activeSubscriptions = activeSubscriptionsSnapshot.size;
    
    // Get successful payments count
    const paymentsSnapshot = await adminDb
      .collection(COLLECTIONS.PAYMENTS)
      .where('status', '==', 'success')
      .get();
    const successfulPayments = paymentsSnapshot.size;
    
    // Calculate total revenue
    let totalRevenue = 0;
    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      totalRevenue += payment.amount || 0;
    });
    
    return {
      totalUsers,
      activeSubscriptions,
      successfulPayments,
      totalRevenue,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    functions.logger.error('Failed to get user statistics:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user statistics');
  }
});

/**
 * HTTP callable function to manually reset a user's daily message count
 */
export const resetUserDailyLimit = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { uid } = data;
    
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }
    
    // Only allow users to reset their own daily limit or admin users
    if (context.auth.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Can only reset own daily limit');
    }
    
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    await userRef.update({
      dailyMessageCount: 0,
    });
    
    functions.logger.info(`Daily message count reset for user ${uid}`);
    
    return { success: true, message: 'Daily message count reset successfully' };
  } catch (error) {
    functions.logger.error('Failed to reset user daily limit:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reset daily limit');
  }
});

/**
 * HTTP callable function to handle webhook events from payment providers
 */
export const handlePaymentWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Basic webhook validation (in production, verify signature)
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    const { uid, amount, paymentMethod, transactionId, status } = req.body;
    
    if (!uid || !amount || !paymentMethod || !transactionId || !status) {
      res.status(400).send('Missing required fields');
      return;
    }
    
    if (status === 'success') {
      // Handle successful payment with new pricing structure
      const currency = req.body.currency || 'USD';
      const plan = getPlanFromAmount(amount, currency as 'USD' | 'INR');
      
      // Validate amount against expected price
      const expectedAmount = getPlanPrice(plan, currency as 'USD' | 'INR');
      if (amount < expectedAmount) {
        res.status(400).send(`Invalid amount: Expected ${expectedAmount} ${currency}, got ${amount}`);
        return;
      }
      
      // Update user plan
      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
      await userRef.update({
        plan,
        subscriptionStatus: 'active',
      });
      
      // Create subscription
      const subscriptionRef = adminDb.collection(COLLECTIONS.SUBSCRIPTIONS).doc();
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      
      await subscriptionRef.set({
        uid,
        plan,
        status: 'active',
        paymentMethod,
        amount,
        currency: currency || 'USD',
        nextBillingDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Record payment
      const paymentRef = adminDb.collection(COLLECTIONS.PAYMENTS).doc();
      await paymentRef.set({
        uid,
        subscriptionId: subscriptionRef.id,
        amount,
        currency: currency || 'USD',
        paymentMethod,
        status: 'success',
        transactionId,
        createdAt: new Date(),
      });
      
      functions.logger.info(`Payment processed successfully for user ${uid}: ${plan} plan for ${amount} ${currency}`);
    }
    
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    functions.logger.error('Failed to process payment webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});
