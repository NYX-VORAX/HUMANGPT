import * as admin from 'firebase-admin';
import { 
  adminDb, 
  COLLECTIONS, 
  PLANS, 
  SUBSCRIPTION_STATUS, 
  UserData 
} from './firebaseConfig';

/**
 * Creates or updates a user document in Firestore
 */
export const createOrUpdateUserDocument = async (user: admin.auth.UserRecord): Promise<void> => {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(user.uid);
    const userDoc = await userRef.get();

    const userData: Partial<UserData> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    if (userDoc.exists) {
      // Update existing user
      await userRef.update(userData);
    } else {
      // Create new user document
      const newUserData: UserData = {
        ...userData,
        plan: PLANS.FREE,
        subscriptionStatus: SUBSCRIPTION_STATUS.INACTIVE,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        messageCount: 0,
        dailyMessageCount: 0,
        lastMessageDate: null,
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
        },
      } as UserData;

      await userRef.set(newUserData);
    }
  } catch (error) {
    throw new Error(`Failed to create/update user document: ${error}`);
  }
};

/**
 * Gets user data from Firestore
 */
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as UserData;
  } catch (error) {
    throw new Error(`Failed to get user data: ${error}`);
  }
};

/**
 * Updates user preferences
 */
export const updateUserPreferences = async (
  uid: string, 
  preferences: Partial<UserData['preferences']>
): Promise<void> => {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      [`preferences.${Object.keys(preferences)[0]}`]: Object.values(preferences)[0],
    });
  } catch (error) {
    throw new Error(`Failed to update user preferences: ${error}`);
  }
};

/**
 * Updates user plan and subscription status
 */
export const updateUserPlan = async (
  uid: string, 
  plan: UserData['plan'], 
  subscriptionStatus: UserData['subscriptionStatus']
): Promise<void> => {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    
    await userRef.update({
      plan,
      subscriptionStatus,
    });
  } catch (error) {
    throw new Error(`Failed to update user plan: ${error}`);
  }
};

/**
 * Deletes a user document (for account deletion)
 */
export const deleteUserDocument = async (uid: string): Promise<void> => {
  try {
    const batch = adminDb.batch();
    
    // Delete user document
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(uid);
    batch.delete(userRef);
    
    // Delete user's subscriptions
    const subscriptionsQuery = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('uid', '==', uid)
      .get();
    
    subscriptionsQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user's payments
    const paymentsQuery = await adminDb
      .collection(COLLECTIONS.PAYMENTS)
      .where('uid', '==', uid)
      .get();
    
    paymentsQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    throw new Error(`Failed to delete user document: ${error}`);
  }
};

/**
 * Gets all users with pagination
 */
export const getAllUsers = async (
  limit: number = 100, 
  startAfter?: string
): Promise<{ users: UserData[]; lastVisible: string | null }> => {
  try {
    let query = adminDb
      .collection(COLLECTIONS.USERS)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      const startAfterDoc = await adminDb
        .collection(COLLECTIONS.USERS)
        .doc(startAfter)
        .get();
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();
    const users: UserData[] = [];
    let lastVisible: string | null = null;

    snapshot.forEach(doc => {
      users.push(doc.data() as UserData);
      lastVisible = doc.id;
    });

    return { users, lastVisible: snapshot.size === limit ? lastVisible : null };
  } catch (error) {
    throw new Error(`Failed to get all users: ${error}`);
  }
};
