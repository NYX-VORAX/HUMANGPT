import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import crypto from 'crypto';

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

// Webhook secrets for verification
const WEBHOOK_SECRETS = {
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  paypal: process.env.PAYPAL_WEBHOOK_SECRET,
  razorpay: process.env.RAZORPAY_WEBHOOK_SECRET,
};

// Plan configuration (same as payment confirmation)
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
      lockedPersonas: true,
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
      lockedPersonas: true,
      infiniteChat: true
    }
  }
};

// Verify Stripe webhook signature
function verifyStripeSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRETS.stripe) return false;
  
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const signatureHash = elements.find(e => e.startsWith('v1='))?.split('=')[1];
  
  if (!timestamp || !signatureHash) return false;
  
  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRETS.stripe)
    .update(timestamp + '.' + payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

// Verify PayPal webhook signature
function verifyPayPalSignature(payload: string, headers: any): boolean {
  // PayPal webhook verification logic
  // This is a simplified version - in production, implement full PayPal webhook verification
  return true; // Placeholder
}

// Verify Razorpay webhook signature
function verifyRazorpaySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRETS.razorpay) return false;
  
  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRETS.razorpay)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

// Process successful payment from webhook
async function processPaymentSuccess(paymentData: any) {
  const db = getFirestore();
  const auth = getAuth();
  
  const {
    uid,
    email,
    displayName,
    plan,
    amount,
    currency,
    paymentMethod,
    transactionId,
    paymentProviderId
  } = paymentData;
  
  // Check if user exists
  let userRecord;
  try {
    userRecord = await auth.getUser(uid);
  } catch (error) {
    // Create user if doesn't exist
    userRecord = await auth.createUser({
      uid,
      email,
      displayName,
      emailVerified: true
    });
  }
  
  const now = new Date();
  const subscriptionEndDate = new Date(now);
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
  
  const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
  
  // Use batch write for atomic operations
  const batch = db.batch();
  
  // 1. Update user document
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  
  if (userDoc.exists) {
    batch.update(userRef, {
      plan: plan,
      subscriptionStatus: 'active',
      features: planConfig.features,
      lastLoginAt: now,
      updatedAt: now
    });
  } else {
    // Create new user document
    const userData = {
      uid,
      email,
      displayName: displayName || null,
      photoURL: null,
      plan: plan,
      subscriptionStatus: 'active',
      createdAt: now,
      lastLoginAt: now,
      messageCount: 0,
      dailyMessageCount: 0,
      lastMessageDate: null,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
      },
      features: planConfig.features,
      updatedAt: now
    };
    batch.set(userRef, userData);
  }
  
  // 2. Create subscription document
  const subscriptionRef = db.collection('subscriptions').doc();
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
    subscriptionId: subscriptionRef.id,
    paymentProviderId: paymentProviderId || null
  };
  batch.set(subscriptionRef, subscriptionData);
  
  // 3. Create payment record
  const paymentRef = db.collection('payments').doc();
  const paymentRecordData = {
    uid,
    subscriptionId: subscriptionRef.id,
    amount,
    currency,
    paymentMethod,
    status: 'success',
    transactionId,
    paymentProviderId: paymentProviderId || null,
    plan,
    createdAt: now,
    processedAt: now
  };
  batch.set(paymentRef, paymentRecordData);
  
  // 4. Create webhook log
  const webhookLogRef = db.collection('webhook_logs').doc();
  const webhookLogData = {
    uid,
    event: 'payment_success',
    provider: paymentMethod,
    transactionId,
    amount,
    currency,
    plan,
    processed: true,
    createdAt: now
  };
  batch.set(webhookLogRef, webhookLogData);
  
  // Execute batch write
  await batch.commit();
  
  return {
    success: true,
    subscriptionId: subscriptionRef.id,
    paymentId: paymentRef.id
  };
}

// Handle Stripe webhook
async function handleStripeWebhook(payload: any) {
  const { type, data } = payload;
  
  if (type === 'payment_intent.succeeded') {
    const paymentIntent = data.object;
    const metadata = paymentIntent.metadata;
    
    if (!metadata.uid || !metadata.plan) {
      throw new Error('Missing required metadata in payment intent');
    }
    
    return await processPaymentSuccess({
      uid: metadata.uid,
      email: metadata.email,
      displayName: metadata.displayName,
      plan: metadata.plan,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod: 'stripe',
      transactionId: paymentIntent.id,
      paymentProviderId: paymentIntent.customer
    });
  }
  
  return { success: true, message: 'Event processed' };
}

// Handle PayPal webhook
async function handlePayPalWebhook(payload: any) {
  const { event_type, resource } = payload;
  
  if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const customId = resource.custom_id;
    const metadata = JSON.parse(customId || '{}');
    
    if (!metadata.uid || !metadata.plan) {
      throw new Error('Missing required metadata in PayPal payment');
    }
    
    return await processPaymentSuccess({
      uid: metadata.uid,
      email: metadata.email,
      displayName: metadata.displayName,
      plan: metadata.plan,
      amount: parseFloat(resource.amount.value),
      currency: resource.amount.currency_code,
      paymentMethod: 'paypal',
      transactionId: resource.id,
      paymentProviderId: resource.payer?.payer_id
    });
  }
  
  return { success: true, message: 'Event processed' };
}

// Handle Razorpay webhook
async function handleRazorpayWebhook(payload: any) {
  const { event, payload: eventPayload } = payload;
  
  if (event === 'payment.captured') {
    const payment = eventPayload.payment.entity;
    const notes = payment.notes;
    
    if (!notes.uid || !notes.plan) {
      throw new Error('Missing required notes in Razorpay payment');
    }
    
    return await processPaymentSuccess({
      uid: notes.uid,
      email: notes.email,
      displayName: notes.displayName,
      plan: notes.plan,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      paymentMethod: 'razorpay',
      transactionId: payment.id,
      paymentProviderId: payment.order_id
    });
  }
  
  return { success: true, message: 'Event processed' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || 
                     request.headers.get('x-razorpay-signature') || 
                     request.headers.get('paypal-auth-algo');
    
    const provider = request.headers.get('x-webhook-provider') || 
                    (signature?.startsWith('t=') ? 'stripe' : 
                     signature?.startsWith('sha256=') ? 'razorpay' : 'paypal');
    
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Verify webhook signature
    let signatureValid = false;
    switch (provider) {
      case 'stripe':
        signatureValid = verifyStripeSignature(body, signature || '');
        break;
      case 'paypal':
        signatureValid = verifyPayPalSignature(body, request.headers);
        break;
      case 'razorpay':
        signatureValid = verifyRazorpaySignature(body, signature || '');
        break;
    }
    
    if (!signatureValid && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    // Process webhook based on provider
    let result;
    switch (provider) {
      case 'stripe':
        result = await handleStripeWebhook(payload);
        break;
      case 'paypal':
        result = await handlePayPalWebhook(payload);
        break;
      case 'razorpay':
        result = await handleRazorpayWebhook(payload);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported webhook provider' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log webhook error to database
    try {
      const db = getFirestore();
      const errorLogRef = db.collection('webhook_errors').doc();
      await errorLogRef.set({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        provider: request.headers.get('x-webhook-provider') || 'unknown',
        path: request.nextUrl.pathname
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
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
