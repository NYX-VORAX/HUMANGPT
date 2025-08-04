# HumanGPT Firebase Backend Setup Guide

This guide provides complete instructions for setting up Firebase backend for HumanGPT, including user authentication, premium subscriptions, payment validation, and chat limit management.

## Table of Contents
- [Firebase Project Setup](#firebase-project-setup)
- [Database Structure](#database-structure)
- [User Authentication](#user-authentication)
- [Premium Subscription Management](#premium-subscription-management)
- [Payment Validation](#payment-validation)
- [Chat Limit Management](#chat-limit-management)
- [Admin Functions](#admin-functions)
- [Testing & Validation](#testing--validation)

## Firebase Project Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `humangpt-53e2a`
4. Enable Google Analytics (recommended)
5. Choose your analytics account

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Enable
   - **Google**: Enable (configure OAuth consent screen)

### 3. Setup Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll configure security rules later)
3. Select your preferred location

### 4. Configure Web App
1. Go to **Project Settings** → **General** → **Your apps**
2. Click **Web app** icon
3. Register app with name: `HumanGPT`
4. Copy the configuration object (already added to `lib/firebase.ts`)

## Database Structure

### Collections Overview

```
users/
├── {userId}/
│   ├── uid: string
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string
│   ├── plan: 'free' | 'pro' | 'pro-plus'
│   ├── subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'expired'
│   ├── subscriptionId: string (reference to subscriptions collection)
│   ├── createdAt: timestamp
│   ├── lastLoginAt: timestamp
│   ├── messageCount: number (total messages sent)
│   ├── dailyMessageCount: number (messages sent today)
│   ├── lastMessageDate: timestamp
│   ├── subscriptionEndDate: timestamp
│   └── preferences: object

subscriptions/
├── {subscriptionId}/
│   ├── uid: string (user reference)
│   ├── plan: 'pro' | 'pro-plus'
│   ├── status: 'active' | 'canceled' | 'expired'
│   ├── paymentMethod: string
│   ├── amount: number
│   ├── currency: string (default: 'USD')
│   ├── createdAt: timestamp
│   ├── nextBillingDate: timestamp
│   ├── cancelAtPeriodEnd: boolean
│   └── paymentProvider: 'stripe' | 'paypal' | 'crypto'

payments/
├── {paymentId}/
│   ├── uid: string (user reference)
│   ├── subscriptionId: string
│   ├── amount: number
│   ├── currency: string
│   ├── status: 'pending' | 'completed' | 'failed' | 'refunded'
│   ├── paymentMethod: string
│   ├── paymentProvider: string
│   ├── transactionId: string
│   ├── createdAt: timestamp
│   └── completedAt: timestamp
```

## User Authentication

### Setting Up Users

#### 1. Email/Password Registration
```typescript
// Example usage in signup
const { user, error } = await signUpWithEmail(email, password, displayName)
```

#### 2. Google OAuth
```typescript
// Example usage in login
const { user, error } = await signInWithGoogle()
```

### User Document Creation
When a user signs up, a document is automatically created in the `users` collection:

```typescript
const userData = {
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || '',
  photoURL: user.photoURL || '',
  plan: 'free',                    // Default plan
  subscriptionStatus: 'inactive',
  createdAt: new Date(),
  lastLoginAt: new Date(),
  messageCount: 0,
  dailyMessageCount: 0,
  lastMessageDate: null,
  preferences: {
    theme: 'dark',
    notifications: true
  }
}
```

## Premium Subscription Management

### Plan Types
- **Free**: 20 messages/day, basic personas
- **Pro**: Unlimited messages, premium personas, $19.99/month
- **Pro Plus**: All Pro features + early access, $29.99/month

### Subscription Workflow

#### 1. Create Subscription
```typescript
const createSubscription = async (uid, plan, paymentMethod, amount) => {
  const subscriptionData = {
    uid,
    plan,
    paymentMethod,
    amount,
    status: 'active',
    createdAt: new Date(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    cancelAtPeriodEnd: false
  }
  
  // Create subscription document
  const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscriptionData)
  
  // Update user plan
  await updateUserPlan(uid, plan)
  
  return subscriptionRef.id
}
```

#### 2. Check Subscription Status
```typescript
// Check if user has active subscription
const { subscription } = await getActiveSubscription(userId)
if (subscription && subscription.status === 'active') {
  // User has active premium
}
```

#### 3. Handle Subscription Expiry
```typescript
// Function to check and handle expired subscriptions (run daily via Cloud Functions)
const handleExpiredSubscriptions = async () => {
  const now = new Date()
  const expiredQuery = query(
    collection(db, 'subscriptions'),
    where('nextBillingDate', '<=', now),
    where('status', '==', 'active')
  )
  
  const snapshot = await getDocs(expiredQuery)
  
  snapshot.forEach(async (doc) => {
    const subscription = doc.data()
    
    // Update subscription status
    await updateDoc(doc.ref, {
      status: 'expired',
      updatedAt: new Date()
    })
    
    // Downgrade user to free plan
    await updateUserPlan(subscription.uid, 'free', 'expired')
  })
}
```

## Payment Validation

### Payment Integration

#### 1. PayPal Integration
```typescript
// PayPal payment validation
const validatePayPalPayment = async (paymentId, payerId) => {
  try {
    // Call PayPal API to verify payment
    const response = await fetch(`/api/paypal/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, payerId })
    })
    
    const result = await response.json()
    return result.status === 'COMPLETED'
  } catch (error) {
    console.error('PayPal validation error:', error)
    return false
  }
}
```

#### 2. Cryptocurrency Payment
```typescript
// Crypto payment validation (example with blockchain API)
const validateCryptoPayment = async (transactionHash, expectedAmount) => {
  try {
    // Verify transaction on blockchain
    const response = await fetch(`https://api.blockchain.info/tx/${transactionHash}`)
    const transaction = await response.json()
    
    // Check if transaction amount matches expected amount
    return transaction.amount >= expectedAmount
  } catch (error) {
    console.error('Crypto validation error:', error)
    return false
  }
}
```

#### 3. Payment Record Creation
```typescript
const recordPayment = async (uid, paymentData) => {
  const payment = {
    uid,
    amount: paymentData.amount,
    currency: paymentData.currency || 'USD',
    status: 'completed',
    paymentMethod: paymentData.method,
    paymentProvider: paymentData.provider,
    transactionId: paymentData.transactionId,
    createdAt: new Date(),
    completedAt: new Date()
  }
  
  const paymentRef = await addDoc(collection(db, 'payments'), payment)
  
  // Create subscription after successful payment
  await createSubscription(uid, paymentData.plan, paymentData.method, paymentData.amount)
  
  return paymentRef.id
}
```

## Chat Limit Management

### Free Plan Limits
Free users are limited to 20 messages per day.

#### 1. Check Message Limit
```typescript
const canSendMessage = (userData) => {
  // Premium users can always send messages
  if (userData.plan === 'pro' || userData.plan === 'pro-plus') {
    return true
  }
  
  // Free users have daily limit
  return userData.dailyMessageCount < 20
}
```

#### 2. Increment Message Count
```typescript
const incrementMessageCount = async (uid) => {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  
  if (userSnap.exists()) {
    const userData = userSnap.data()
    const today = new Date().toDateString()
    const lastMessageDate = userData.lastMessageDate?.toDate?.()?.toDateString()
    
    let dailyCount = userData.dailyMessageCount || 0
    
    // Reset daily count if it's a new day
    if (lastMessageDate !== today) {
      dailyCount = 0
    }
    
    await updateDoc(userRef, {
      messageCount: (userData.messageCount || 0) + 1,
      dailyMessageCount: dailyCount + 1,
      lastMessageDate: new Date()
    })
    
    return {
      totalMessages: (userData.messageCount || 0) + 1,
      dailyMessages: dailyCount + 1,
      remainingMessages: 20 - (dailyCount + 1)
    }
  }
}
```

#### 3. Reset Daily Counts (Cloud Function)
```typescript
// Cloud Function to reset daily message counts at midnight
exports.resetDailyMessageCounts = functions.pubsub
  .schedule('0 0 * * *') // Run daily at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    
    const batch = writeBatch(db)
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        dailyMessageCount: 0
      })
    })
    
    await batch.commit()
    console.log('Daily message counts reset')
  })
```

## Admin Functions

### 1. Manual Subscription Management
```typescript
// Grant premium manually (for testing or customer service)
const grantPremium = async (userId, plan, duration = 30) => {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + duration)
  
  await updateDoc(doc(db, 'users', userId), {
    plan: plan,
    subscriptionStatus: 'active',
    subscriptionEndDate: endDate,
    updatedAt: new Date()
  })
}

// Revoke premium
const revokePremium = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    plan: 'free',
    subscriptionStatus: 'inactive',
    subscriptionEndDate: null,
    updatedAt: new Date()
  })
}
```

### 2. User Analytics
```typescript
// Get user statistics
const getUserStats = async () => {
  const usersRef = collection(db, 'users')
  const snapshot = await getDocs(usersRef)
  
  let stats = {
    totalUsers: 0,
    freeUsers: 0,
    proUsers: 0,
    proPlusUsers: 0,
    totalMessages: 0
  }
  
  snapshot.forEach((doc) => {
    const userData = doc.data()
    stats.totalUsers++
    stats.totalMessages += userData.messageCount || 0
    
    switch (userData.plan) {
      case 'free':
        stats.freeUsers++
        break
      case 'pro':
        stats.proUsers++
        break
      case 'pro-plus':
        stats.proPlusUsers++
        break
    }
  })
  
  return stats
}
```

## Security Rules

### Firestore Security Rules
Add these rules to secure your database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Subscriptions - users can read their own, admins can write
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.uid;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Payments - users can read their own, admins can write
    match /payments/{paymentId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.uid;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## Testing & Validation

### 1. Test User Registration
```bash
# Test email registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### 2. Test Payment Flow
```typescript
// Test payment creation
const testPayment = async () => {
  const paymentData = {
    uid: 'test-user-id',
    plan: 'pro',
    amount: 19.99,
    currency: 'USD',
    method: 'paypal',
    provider: 'paypal',
    transactionId: 'test-transaction-123'
  }
  
  const paymentId = await recordPayment(paymentData.uid, paymentData)
  console.log('Payment recorded:', paymentId)
}
```

### 3. Test Message Limits
```typescript
// Test message sending
const testMessageLimit = async (userId) => {
  for (let i = 0; i < 25; i++) {
    const result = await incrementMessageCount(userId)
    console.log(`Message ${i + 1}:`, result)
    
    if (result.remainingMessages <= 0) {
      console.log('Daily limit reached')
      break
    }
  }
}
```

## Environment Variables

Create a `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCXRzRmZHChiuGPvFSQATieydIM2mkhm7k
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=humangpt-53e2a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=humangpt-53e2a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=humangpt-53e2a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=3109257561
NEXT_PUBLIC_FIREBASE_APP_ID=1:3109257561:web:8c714b53ca62fec3cf0c48

# Payment Provider Keys (for server-side validation)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
CRYPTO_WALLET_ADDRESS=your_crypto_wallet_address
```

## Deployment Checklist

### Before Production:
1. ✅ Update Firestore security rules
2. ✅ Set up payment provider webhooks
3. ✅ Configure custom domain for Firebase Auth
4. ✅ Set up Cloud Functions for subscription management
5. ✅ Enable Firebase App Check for security
6. ✅ Set up monitoring and alerts
7. ✅ Test all payment flows thoroughly
8. ✅ Set up backup and recovery procedures

## Monitoring & Maintenance

### Key Metrics to Monitor:
- Daily active users
- Message volume per day
- Subscription conversion rate
- Payment success/failure rates
- API error rates
- Database query performance

### Regular Maintenance Tasks:
- Monitor expired subscriptions
- Clean up old payment records
- Update security rules as needed
- Monitor and optimize database costs
- Review and update pricing plans

## Support & Troubleshooting

### Common Issues:

1. **Authentication fails**: Check Firebase config and domain settings
2. **Payment not recorded**: Verify webhook endpoints and signatures
3. **Chat limits not working**: Check message count logic and date comparisons
4. **Subscription not activated**: Verify payment validation flow

### Debug Commands:
```typescript
// Check user data
const debugUser = async (userId) => {
  const userData = await getUserDocument(userId)
  console.log('User data:', userData)
  
  const subscription = await getActiveSubscription(userId)
  console.log('Active subscription:', subscription)
}
```

This setup provides a robust backend for managing users, subscriptions, payments, and chat limits in your HumanGPT application.
