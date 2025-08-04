import * as admin from 'firebase-admin';
import { 
  adminDb, 
  COLLECTIONS, 
  PLANS, 
  FREE_PLAN_DAILY_LIMIT, 
  UserData 
} from './firebaseConfig';
import { getUserData } from './authHandlers';

/**
 * Checks if a user can send a message based on their plan and daily limit
 */
export const canSendMessage = async (uid: string): Promise<boolean> => {
  try {
    const userData = await getUserData(uid);
    
    if (!userData) {
      throw new Error('User not found');
    }

    // Premium users have unlimited messages
    if (userData.plan === PLANS.PRO || userData.plan === PLANS.PRO_PLUS) {
      return true;
    }

    // Free users have daily limit
    if (userData.plan === PLANS.FREE) {
      return userData.dailyMessageCount < FREE_PLAN_DAILY_LIMIT;
    }

    return false;
  } catch (error) {
    throw new Error(`Failed to check message limit: ${error}`);
  }
};

/**
 * Increments the message count for a user
 */
export const incrementMessageCount = async (uid: string): Promise<void> => {
  try {
    const userData = await getUserData(uid);
    
    if (!userData) {
      throw new Error('User not found');
    }

    // Check if user can send message before incrementing
    const canSend = await canSendMessage(uid);
    if (!canSend) {
      throw new Error('Message limit exceeded');
    }

    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      dailyMessageCount: admin.firestore.FieldValue.increment(1),
      lastMessageDate: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`Failed to increment message count: ${error}`);
  }
};

/**
 * Gets the remaining message count for a user
 */
export const getRemainingMessageCount = async (uid: string): Promise<number> => {
  try {
    const userData = await getUserData(uid);
    
    if (!userData) {
      throw new Error('User not found');
    }

    // Premium users have unlimited messages
    if (userData.plan === PLANS.PRO || userData.plan === PLANS.PRO_PLUS) {
      return -1; // -1 indicates unlimited
    }

    // Free users have daily limit
    if (userData.plan === PLANS.FREE) {
      return Math.max(0, FREE_PLAN_DAILY_LIMIT - userData.dailyMessageCount);
    }

    return 0;
  } catch (error) {
    throw new Error(`Failed to get remaining message count: ${error}`);
  }
};

/**
 * Resets daily message count for a specific user
 */
export const resetUserDailyMessageCount = async (uid: string): Promise<void> => {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      dailyMessageCount: 0,
    });
  } catch (error) {
    throw new Error(`Failed to reset daily message count: ${error}`);
  }
};

/**
 * Resets daily message count for all users (used by Cloud Function)
 */
export const resetAllUsersDailyMessageCount = async (): Promise<void> => {
  try {
    const usersSnapshot = await adminDb.collection(COLLECTIONS.USERS).get();
    
    const batch = adminDb.batch();
    
    usersSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        dailyMessageCount: 0,
      });
    });
    
    // Commit in batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < usersSnapshot.size; i += batchSize) {
      const batchSlice = adminDb.batch();
      
      for (let j = i; j < Math.min(i + batchSize, usersSnapshot.size); j++) {
        const doc = usersSnapshot.docs[j];
        batchSlice.update(doc.ref, {
          dailyMessageCount: 0,
        });
      }
      
      batches.push(batchSlice.commit());
    }
    
    await Promise.all(batches);
  } catch (error) {
    throw new Error(`Failed to reset all users daily message count: ${error}`);
  }
};

/**
 * Gets message statistics for a user
 */
export const getUserMessageStats = async (uid: string): Promise<{
  totalMessages: number;
  dailyMessages: number;
  remainingMessages: number;
  lastMessageDate: admin.firestore.Timestamp | null;
  plan: UserData['plan'];
}> => {
  try {
    const userData = await getUserData(uid);
    
    if (!userData) {
      throw new Error('User not found');
    }

    const remainingMessages = await getRemainingMessageCount(uid);

    return {
      totalMessages: userData.messageCount,
      dailyMessages: userData.dailyMessageCount,
      remainingMessages,
      lastMessageDate: userData.lastMessageDate,
      plan: userData.plan,
    };
  } catch (error) {
    throw new Error(`Failed to get user message stats: ${error}`);
  }
};

/**
 * Checks if it's a new day for the user (based on last message date)
 */
export const isNewDay = (lastMessageDate: admin.firestore.Timestamp | null): boolean => {
  if (!lastMessageDate) {
    return true;
  }

  const now = new Date();
  const lastMessage = lastMessageDate.toDate();
  
  return now.getUTCDate() !== lastMessage.getUTCDate() ||
         now.getUTCMonth() !== lastMessage.getUTCMonth() ||
         now.getUTCFullYear() !== lastMessage.getUTCFullYear();
};

/**
 * Validates message content (basic validation)
 */
export const validateMessage = (message: string): boolean => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // Basic validation rules
  if (message.trim().length === 0) {
    return false;
  }

  if (message.length > 10000) { // 10k character limit
    return false;
  }

  return true;
};
