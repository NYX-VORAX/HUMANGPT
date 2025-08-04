import * as admin from 'firebase-admin';
import { adminDb, COLLECTIONS, PaymentData, getPlanFromAmount, getPlanPrice } from './firebaseConfig';
import { createSubscription, getActiveSubscription } from './subscriptionManager';
import { updateUserPlan } from './authHandlers';

/**
 * Simulates handling of email payment confirmation
 */
export const handleEmailPayment = async (
  uid: string,
  plan: 'pro' | 'pro-plus',
  amount: number,
  currency: 'USD' | 'INR' = 'USD'
): Promise<void> => {
  try {
    // Verify that the user sent payment manually
    // Placeholder for real verification logic

    const expectedAmount = getPlanPrice(plan, currency);
    if (amount < expectedAmount) {
      throw new Error(`Invalid amount: Expected ${expectedAmount} ${currency}, got ${amount}`);
    }

    // Create a new subscription after manual verification
    const subscriptionId = await createSubscription(uid, plan, 'manual', amount, currency);

    // Update user's plan to pro after verification
    await updateUserPlan(uid, plan, 'active');
  } catch (error) {
    throw new Error(`Failed to handle email payment: ${error}`);
  }
};

/**
 * Simulates sending payment instructions via email
 */
export const sendPaymentInstructions = async (uid: string, plan: 'pro' | 'pro-plus') => {
  // Send email logic here - placeholder
  console.log(`Send payment instructions to user ${uid} for ${plan} plan.`);
};

/**
 * Validate payment amount for a specific plan
 */
export const validatePaymentAmount = (amount: number, plan: 'pro' | 'pro-plus', currency: 'USD' | 'INR' = 'USD'): boolean => {
  const expectedAmount = getPlanPrice(plan, currency);
  return amount >= expectedAmount;
};

/**
 * Get pricing information for all plans
 */
export const getPricingInfo = () => {
  return {
    free: {
      name: 'Free',
      price: 0,
      currency: 'USD',
      features: ['20 messages per day', 'Basic chat functionality', 'Email support'],
    },
    pro: {
      name: 'Pro',
      priceUSD: getPlanPrice('pro', 'USD'),
      priceINR: getPlanPrice('pro', 'INR'),
      features: ['Unlimited messages', 'Priority support', 'Advanced chat features', 'Chat history'],
    },
    proPlus: {
      name: 'Pro Plus',
      priceUSD: getPlanPrice('pro-plus', 'USD'),
      priceINR: getPlanPrice('pro-plus', 'INR'),
      features: ['Everything in Pro', 'API access', 'Custom integrations', 'Premium support', 'Early access to new features'],
    },
  };
};

