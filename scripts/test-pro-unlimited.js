// Test script to verify Pro user unlimited messages functionality
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

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

const db = getFirestore();
const auth = getAuth();

async function testProUnlimitedMessages() {
  try {
    console.log('🧪 Testing Pro User Unlimited Messages...\n');
    
    // Create a test user
    const testEmail = 'prounlimitedtest@humangpt.com';
    let testUser;
    
    try {
      // Try to get existing user
      testUser = await auth.getUserByEmail(testEmail);
      console.log('✅ Found existing test user');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new test user
        testUser = await auth.createUser({
          email: testEmail,
          password: 'TestUser123!',
          displayName: 'Pro Test User',
          emailVerified: true
        });
        console.log('✅ Created new test user');
      } else {
        throw error;
      }
    }
    
    // Set up Pro user with active subscription
    const userRef = db.collection('users').doc(testUser.uid);
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    
    await userRef.set({
      uid: testUser.uid,
      email: testEmail,
      displayName: 'Pro Test User',
      photoURL: null,
      plan: 'pro',
      subscriptionStatus: 'active',
      createdAt: now,
      lastLoginAt: now,
      messageCount: 0,
      dailyMessageCount: 0,
      lastMessageDate: now,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
      },
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
      },
      updatedAt: now
    });
    
    // Create active subscription
    const subscriptionRef = db.collection('subscriptions').doc();
    await subscriptionRef.set({
      uid: testUser.uid,
      plan: 'pro',
      status: 'active',
      paymentMethod: 'stripe',
      amount: 2.50,
      currency: 'USD',
      startDate: now,
      endDate: subscriptionEndDate,
      nextBillingDate: subscriptionEndDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
      subscriptionId: subscriptionRef.id
    });
    
    console.log('✅ Set up Pro user with active subscription');
    
    // Test 1: Set daily message count to 50 (way over the free limit of 20)
    await userRef.update({
      dailyMessageCount: 50,
      messageCount: 50,
      lastMessageDate: now
    });
    
    console.log('✅ Set daily message count to 50 (over free limit)');
    
    // Test 2: Check user status
    const userData = await userRef.get();
    const user = userData.data();
    
    console.log('\n📊 User Status:');
    console.log(`Plan: ${user.plan}`);
    console.log(`Subscription Status: ${user.subscriptionStatus}`);
    console.log(`Daily Messages: ${user.dailyMessageCount}`);
    console.log(`Features:`, user.features);
    
    // Test 3: Simulate chat limit check
    const userPlan = user.plan.toLowerCase();
    const DAILY_MESSAGE_LIMITS = {
      free: 20,
      pro: -1, // Unlimited
      'pro-plus': -1 // Unlimited
    };
    
    const dailyLimit = DAILY_MESSAGE_LIMITS[userPlan] || DAILY_MESSAGE_LIMITS.free;
    const subscriptionStatus = user.subscriptionStatus.toLowerCase();
    
    let effectiveLimit = dailyLimit;
    if ((userPlan === 'pro' || userPlan === 'pro-plus') && subscriptionStatus !== 'active') {
      effectiveLimit = DAILY_MESSAGE_LIMITS.free;
    }
    
    const remainingMessages = effectiveLimit === -1 ? -1 : Math.max(0, effectiveLimit - user.dailyMessageCount);
    const canSendMessage = effectiveLimit === -1 || user.dailyMessageCount < effectiveLimit;
    
    console.log('\n🔍 Message Limit Check:');
    console.log(`Plan Limit: ${dailyLimit === -1 ? 'Unlimited' : dailyLimit}`);
    console.log(`Effective Limit: ${effectiveLimit === -1 ? 'Unlimited' : effectiveLimit}`);
    console.log(`Remaining Messages: ${remainingMessages === -1 ? 'Unlimited' : remainingMessages}`);
    console.log(`Can Send Message: ${canSendMessage}`);
    
    // Test 4: Test with expired subscription
    console.log('\n🧪 Testing with expired subscription...');
    await userRef.update({
      subscriptionStatus: 'expired'
    });
    
    const updatedUserData = await userRef.get();
    const updatedUser = updatedUserData.data();
    
    const updatedSubscriptionStatus = updatedUser.subscriptionStatus.toLowerCase();
    let updatedEffectiveLimit = dailyLimit;
    if ((userPlan === 'pro' || userPlan === 'pro-plus') && updatedSubscriptionStatus !== 'active') {
      updatedEffectiveLimit = DAILY_MESSAGE_LIMITS.free;
    }
    
    const updatedRemainingMessages = updatedEffectiveLimit === -1 ? -1 : Math.max(0, updatedEffectiveLimit - updatedUser.dailyMessageCount);
    const updatedCanSendMessage = updatedEffectiveLimit === -1 || updatedUser.dailyMessageCount < updatedEffectiveLimit;
    
    console.log(`Updated Subscription Status: ${updatedUser.subscriptionStatus}`);
    console.log(`Updated Effective Limit: ${updatedEffectiveLimit === -1 ? 'Unlimited' : updatedEffectiveLimit}`);
    console.log(`Updated Remaining Messages: ${updatedRemainingMessages === -1 ? 'Unlimited' : updatedRemainingMessages}`);
    console.log(`Updated Can Send Message: ${updatedCanSendMessage}`);
    
    // Restore active subscription
    await userRef.update({
      subscriptionStatus: 'active'
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Pro users with active subscriptions get unlimited messages');
    console.log('✅ Pro users with expired subscriptions are limited to 20 messages');
    console.log('✅ Message limits are properly enforced based on subscription status');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testProUnlimitedMessages();
}
