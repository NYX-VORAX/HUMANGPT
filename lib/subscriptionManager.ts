import * as admin from 'firebase-admin';
import { adminDb, COLLECTIONS, SUBSCRIPTION_STATUS, SubscriptionData, PLANS, getPlanPrice } from './firebaseConfig';

/**
 * Creates a subscription document
 */
export const createSubscription = async (
  uid: string,
  plan: SubscriptionData['plan'],
  paymentMethod: SubscriptionData['paymentMethod'],
  amount: number,
  currency: 'USD' | 'INR' = 'USD'
): Promise<string> => {
  try {
    const subscriptionRef = adminDb.collection(COLLECTIONS.SUBSCRIPTIONS).doc();
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // One month ahead

    // Validate amount against plan pricing
    const expectedAmount = getPlanPrice(plan, currency);
    if (amount < expectedAmount) {
      throw new Error(`Invalid amount: Expected ${expectedAmount} ${currency}, got ${amount}`);
    }

    const newSubscription: SubscriptionData = {
      uid,
      plan,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      paymentMethod,
      amount,
      currency,
      nextBillingDate: admin.firestore.Timestamp.fromDate(nextBillingDate),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as SubscriptionData;

    await subscriptionRef.set(newSubscription);
    return subscriptionRef.id;
  } catch (error) {
    throw new Error(`Failed to create subscription: ${error}`);
  }
};

/**
 * Gets active subscription for a user
 */
export const getActiveSubscription = async (uid: string): Promise<SubscriptionData | null> => {
  try {
    const subscriptionsSnapshot = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('uid', '==', uid)
      .where('status', '==', SUBSCRIPTION_STATUS.ACTIVE)
      .get();

    if (subscriptionsSnapshot.empty) {
      return null;
    }

    return subscriptionsSnapshot.docs[0].data() as SubscriptionData;
  } catch (error) {
    throw new Error(`Failed to get active subscription: ${error}`);
  }
};

/**
 * Expires subscriptions where nextBillingDate has passed
 */
export const expireSubscriptions = async (): Promise<void> => {
  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('nextBillingDate', '<', admin.firestore.Timestamp.now())
      .where('status', '==', SUBSCRIPTION_STATUS.ACTIVE)
      .get();

    const batch = adminDb.batch();

    snapshot.forEach((doc) => {
      batch.update(doc.ref, { status: SUBSCRIPTION_STATUS.EXPIRED });
    });

    await batch.commit();
  } catch (error) {
    throw new Error(`Failed to expire subscriptions: ${error}`);
  }
};

/**
 * Updates subscription data
 */
export const updateSubscription = async (subscriptionId: string, data: Partial<SubscriptionData>): Promise<void> => {
  try {
    const subscriptionRef = adminDb.collection(COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);

    await subscriptionRef.update(data);
  } catch (error) {
    throw new Error(`Failed to update subscription: ${error}`);
  }
};
