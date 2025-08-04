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

// Check if it's a new day and reset daily count
function shouldResetDailyCount(lastMessageDate: any): boolean {
  if (!lastMessageDate) return true;
  
  const today = new Date();
  const lastDate = lastMessageDate.toDate ? lastMessageDate.toDate() : new Date(lastMessageDate);
  
  return today.toDateString() !== lastDate.toDateString();
}

// Validate user permissions for chat
export async function validateUserChat(uid: string, personaType: string = 'basic'): Promise<{
  allowed: boolean;
  error?: string;
  user?: any;
  subscription?: any;
}> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { allowed: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (!userData) {
        return { allowed: false, error: 'Unable to retrieve user data' };
    }
    const plan = userData.plan || 'free';
    
    // Get active subscription
    const subscriptionsSnapshot = await db
      .collection('subscriptions')
      .where('uid', '==', uid)
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
        const batch = db.batch();
        
        // Update user to free plan
        batch.update(userRef, {
          plan: 'free',
          subscriptionStatus: 'expired',
          features: {
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
          },
          updatedAt: new Date()
        });
        
        // Update subscription status
        batch.update(subscriptionsSnapshot.docs[0].ref, {
          status: 'expired',
          updatedAt: new Date()
        });
        
        await batch.commit();
        
        // Update local userData
        userData.plan = 'free';
        userData.subscriptionStatus = 'expired';
        userData.features = {
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
      }
    }

    const currentPlan = userData.plan || 'free';
    const features = userData.features || {};
    
    // Check persona access permissions
    if (personaType === 'premium' && !features.premiumPersonas) {
      return { 
        allowed: false, 
        error: 'Premium personas require Pro subscription',
        user: userData,
        subscription 
      };
    }
    
    if (personaType === 'locked' && !features.lockedPersonas) {
      return { 
        allowed: false, 
        error: 'Locked personas require Pro subscription',
        user: userData,
        subscription 
      };
    }
    
    if (personaType === 'custom' && !features.customPersonas) {
      return { 
        allowed: false, 
        error: 'Custom personas require Pro Plus subscription',
        user: userData,
        subscription 
      };
    }

    // Check daily message limits
    const normalizedPlan = currentPlan.toLowerCase();
    const dailyLimit = DAILY_MESSAGE_LIMITS[normalizedPlan as keyof typeof DAILY_MESSAGE_LIMITS] || DAILY_MESSAGE_LIMITS.free;
    
    // For Pro users, check if subscription is active
    let effectiveLimit = dailyLimit;
    if (normalizedPlan === 'pro' && userData.subscriptionStatus !== 'active') {
      return { 
        allowed: false, 
        error: 'Subscription inactive. Please check your email to activate it.',
        user: userData,
        subscription 
      };
    }
    if (normalizedPlan === 'pro-plus') {
      return {
        allowed: false,
        error: 'Pro Plus is a coming soon feature.',
        user: userData,
        subscription
      };
    }
    
    if (effectiveLimit !== -1) { // Not unlimited
      const shouldReset = shouldResetDailyCount(userData.lastMessageDate);
      const currentDailyCount = shouldReset ? 0 : (userData.dailyMessageCount || 0);
      
      if (currentDailyCount >= effectiveLimit) {
        return { 
          allowed: false, 
          error: `Daily message limit (${effectiveLimit}) reached. Upgrade to Pro for unlimited messages.`,
          user: userData,
          subscription 
        };
      }
    }

    return { 
      allowed: true, 
      user: userData,
      subscription 
    };

  } catch (error) {
    console.error('Error validating user chat:', error);
    return { allowed: false, error: 'Internal server error' };
  }
}

// Update user message count after successful chat
export async function updateUserMessageCount(uid: string): Promise<void> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error('Unable to retrieve user data');
    }
    const shouldReset = shouldResetDailyCount(userData.lastMessageDate);
    const now = new Date();

    if (shouldReset) {
      // Reset daily count for new day
      await userRef.update({
        dailyMessageCount: 1,
        messageCount: (userData.messageCount || 0) + 1,
        lastMessageDate: now,
        updatedAt: now
      });
    } else {
      // Increment existing count
      await userRef.update({
        dailyMessageCount: (userData.dailyMessageCount || 0) + 1,
        messageCount: (userData.messageCount || 0) + 1,
        lastMessageDate: now,
        updatedAt: now
      });
    }

    // Log user activity
    const activityRef = db.collection('user_activities').doc();
    await activityRef.set({
      uid,
      action: 'message_sent',
      details: {
        dailyCount: shouldReset ? 1 : (userData.dailyMessageCount || 0) + 1,
        totalCount: (userData.messageCount || 0) + 1,
        resetDaily: shouldReset
      },
      timestamp: now
    });

  } catch (error) {
    console.error('Error updating user message count:', error);
    throw error;
  }
}

// Check and update subscription expiry status
export async function checkAndUpdateSubscriptionExpiry(uid: string): Promise<{
  expired: boolean;
  subscription?: any;
}> {
  try {
    const db = getFirestore();
    
    // Get active subscriptions
    const subscriptionsSnapshot = await db
      .collection('subscriptions')
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .get();

    if (subscriptionsSnapshot.empty) {
      return { expired: false };
    }

    const batch = db.batch();
    let hasExpired = false;

    subscriptionsSnapshot.forEach(doc => {
      const subscription = doc.data();
      
      if (isSubscriptionExpired(subscription)) {
        hasExpired = true;
        
        // Update subscription status
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: new Date()
        });
      }
    });

    if (hasExpired) {
      // Downgrade user to free plan
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, {
        plan: 'free',
        subscriptionStatus: 'expired',
        features: {
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
        },
        updatedAt: new Date()
      });

      // Log subscription expiry
      const activityRef = db.collection('user_activities').doc();
      batch.set(activityRef, {
        uid,
        action: 'subscription_expired',
        details: {
          downgraded_to: 'free',
          expired_at: new Date()
        },
        timestamp: new Date()
      });

      await batch.commit();
    }

    return { expired: hasExpired };

  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    return { expired: false };
  }
}

// Get user's current feature access
export async function getUserFeatures(uid: string): Promise<{
  features: any;
  plan: string;
  subscription?: any;
}> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error('Unable to retrieve user data');
    }
    const plan = userData.plan || 'free';
    
    // Get active subscription
    const subscriptionsSnapshot = await db
      .collection('subscriptions')
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let subscription = null;
    if (!subscriptionsSnapshot.empty) {
      subscription = subscriptionsSnapshot.docs[0].data();
      
      // Check if subscription is expired
      if (isSubscriptionExpired(subscription)) {
        await checkAndUpdateSubscriptionExpiry(uid);
        subscription = null;
      }
    }

    const features = userData.features || {
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

    return {
      features,
      plan,
      subscription
    };

  } catch (error) {
    console.error('Error getting user features:', error);
    throw error;
  }
}

// Create Pro subscription with email activation
export async function createProSubscription(uid: string, userEmail: string, paymentData?: any): Promise<{
  success: boolean;
  subscriptionId?: string;
  error?: string;
}> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    
    // Create subscription document
    const subscriptionRef = db.collection('subscriptions').doc();
    await subscriptionRef.set({
      uid,
      plan: 'pro',
      status: 'pending_activation', // Requires email activation
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentData,
      activationToken: generateActivationToken(), // You'll need to implement this
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    // Update user plan but keep subscription inactive
    await userRef.update({
      plan: 'pro',
      subscriptionStatus: 'pending_activation',
      pendingSubscriptionId: subscriptionRef.id,
      updatedAt: new Date()
    });

    // Send activation email (you'll need to implement this)
    await sendActivationEmail(userEmail, uid, subscriptionRef.id);

    // Log activity
    const activityRef = db.collection('user_activities').doc();
    await activityRef.set({
      uid,
      action: 'subscription_created',
      details: {
        plan: 'pro',
        status: 'pending_activation',
        subscriptionId: subscriptionRef.id
      },
      timestamp: new Date()
    });

    return {
      success: true,
      subscriptionId: subscriptionRef.id
    };

  } catch (error) {
    console.error('Error creating Pro subscription:', error);
    return {
      success: false,
      error: 'Failed to create subscription'
    };
  }
}

// Activate Pro subscription after email confirmation
export async function activateProSubscription(uid: string, subscriptionId: string, activationToken: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getFirestore();
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();

    if (!subscriptionDoc.exists) {
      return { success: false, error: 'Subscription not found' };
    }

    const subscriptionData = subscriptionDoc.data();
    if (!subscriptionData) {
      return { success: false, error: 'Invalid subscription data' };
    }

    if (subscriptionData.uid !== uid) {
      return { success: false, error: 'Unauthorized' };
    }

    if (subscriptionData.activationToken !== activationToken) {
      return { success: false, error: 'Invalid activation token' };
    }

    if (subscriptionData.status !== 'pending_activation') {
      return { success: false, error: 'Subscription already activated or expired' };
    }

    // Activate subscription
    const batch = db.batch();
    
    batch.update(subscriptionRef, {
      status: 'active',
      activatedAt: new Date(),
      updatedAt: new Date()
    });

    // Update user with Pro features
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, {
      subscriptionStatus: 'active',
      features: {
        basicPersonas: true,
        premiumPersonas: true,
        unlimitedMessages: true,
        prioritySupport: true,
        advancedAnalytics: true,
        customPersonas: false, // Only for Pro Plus
        apiAccess: true,
        exportData: true,
        lockedPersonas: true,
        infiniteChat: true
      },
      updatedAt: new Date()
    });

    // Log activation
    const activityRef = db.collection('user_activities').doc();
    batch.set(activityRef, {
      uid,
      action: 'subscription_activated',
      details: {
        plan: 'pro',
        subscriptionId,
        activatedAt: new Date()
      },
      timestamp: new Date()
    });

    await batch.commit();

    return { success: true };

  } catch (error) {
    console.error('Error activating Pro subscription:', error);
    return {
      success: false,
      error: 'Failed to activate subscription'
    };
  }
}

// Handle Pro Plus request (coming soon feature)
export async function requestProPlus(uid: string, userEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getFirestore();
    
    // Add to waitlist
    const waitlistRef = db.collection('pro_plus_waitlist').doc();
    await waitlistRef.set({
      uid,
      email: userEmail,
      requestedAt: new Date(),
      status: 'waiting',
      notified: false
    });

    // Log activity
    const activityRef = db.collection('user_activities').doc();
    await activityRef.set({
      uid,
      action: 'pro_plus_requested',
      details: {
        email: userEmail,
        waitlistId: waitlistRef.id
      },
      timestamp: new Date()
    });

    return { success: true };

  } catch (error) {
    console.error('Error adding to Pro Plus waitlist:', error);
    return {
      success: false,
      error: 'Failed to add to waitlist'
    };
  }
}

// Helper function to generate activation token (implement as needed)
function generateActivationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to send activation email (implement with your email service)
async function sendActivationEmail(email: string, uid: string, subscriptionId: string): Promise<void> {
  // Implement with your preferred email service (SendGrid, Nodemailer, etc.)
  console.log(`Sending activation email to ${email} for subscription ${subscriptionId}`);
  // This is where you would integrate with your email service
}

export default {
  validateUserChat,
  updateUserMessageCount,
  checkAndUpdateSubscriptionExpiry,
  getUserFeatures,
  createProSubscription,
  activateProSubscription,
  requestProPlus
};
