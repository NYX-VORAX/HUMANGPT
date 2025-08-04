import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface SubscriptionPlan {
  id: string
  name: string
  displayName: string
  price: number
  currency: string
  interval: 'monthly' | 'yearly'
  features: {
    basicPersonas: boolean
    premiumPersonas: boolean
    unlimitedMessages: boolean
    prioritySupport: boolean
    advancedAnalytics: boolean
    customPersonas: boolean
    apiAccess: boolean
    exportData: boolean
  }
  limits: {
    dailyMessages: number // -1 for unlimited
    monthlyMessages: number // -1 for unlimited
    personas: number // -1 for unlimited
  }
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'Free Plan',
    price: 0,
    currency: 'USD',
    interval: 'monthly',
    features: {
      basicPersonas: true,
      premiumPersonas: false,
      unlimitedMessages: false,
      prioritySupport: false,
      advancedAnalytics: false,
      customPersonas: false,
      apiAccess: false,
      exportData: false
    },
    limits: {
      dailyMessages: 20,
      monthlyMessages: 600,
      personas: 8
    }
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'pro',
    displayName: 'Pro Plan (Monthly)',
    price: 9.99,
    currency: 'USD',
    interval: 'monthly',
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: false,
      apiAccess: false,
      exportData: true
    },
    limits: {
      dailyMessages: -1,
      monthlyMessages: -1,
      personas: 11 // 8 basic + 3 premium
    }
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'pro',
    displayName: 'Pro Plan (Yearly)',
    price: 99.99,
    currency: 'USD',
    interval: 'yearly',
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: false,
      apiAccess: false,
      exportData: true
    },
    limits: {
      dailyMessages: -1,
      monthlyMessages: -1,
      personas: 11 // 8 basic + 3 premium
    }
  },
  pro_plus_monthly: {
    id: 'pro_plus_monthly',
    name: 'pro-plus',
    displayName: 'Pro Plus Plan (Monthly)',
    price: 19.99,
    currency: 'USD',
    interval: 'monthly',
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: true,
      apiAccess: true,
      exportData: true
    },
    limits: {
      dailyMessages: -1,
      monthlyMessages: -1,
      personas: -1 // unlimited
    }
  },
  pro_plus_yearly: {
    id: 'pro_plus_yearly',
    name: 'pro-plus',
    displayName: 'Pro Plus Plan (Yearly)',
    price: 199.99,
    currency: 'USD',
    interval: 'yearly',
    features: {
      basicPersonas: true,
      premiumPersonas: true,
      unlimitedMessages: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customPersonas: true,
      apiAccess: true,
      exportData: true
    },
    limits: {
      dailyMessages: -1,
      monthlyMessages: -1,
      personas: -1 // unlimited
    }
  }
}

/**
 * Create or update subscription for a user
 */
export const createUserSubscription = async (
  userId: string,
  subscriptionData: {
    id: string
    planId: string
    status: 'active' | 'cancelled' | 'expired' | 'past_due'
    startDate: Date
    endDate: Date
    customerId?: string
    paymentMethod?: string
    autoRenew?: boolean
  }
): Promise<void> => {
  const plan = SUBSCRIPTION_PLANS[subscriptionData.planId]
  if (!plan) throw new Error('Invalid plan ID')

  const userRef = doc(db, 'users', userId)
  const renewalDate = new Date(subscriptionData.endDate)
  
  // Calculate renewal date based on interval
  if (plan.interval === 'monthly') {
    renewalDate.setMonth(renewalDate.getMonth() + 1)
  } else {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1)
  }

  await updateDoc(userRef, {
    plan: plan.name,
    subscriptionStatus: subscriptionData.status,
    
    subscription: {
      id: subscriptionData.id,
      status: subscriptionData.status,
      plan: plan.name,
      startDate: subscriptionData.startDate,
      endDate: subscriptionData.endDate,
      renewalDate: renewalDate,
      cancelledAt: null,
      trialEnd: null,
      autoRenew: subscriptionData.autoRenew || true,
      paymentMethod: subscriptionData.paymentMethod || null,
      priceId: plan.id,
      customerId: subscriptionData.customerId || null,
      interval: plan.interval,
      amount: plan.price,
      currency: plan.currency
    },
    
    features: plan.features,
    
    'account.lastLoginAt': serverTimestamp(),
    
    updatedAt: serverTimestamp()
  })
}

/**
 * Cancel user subscription
 */
export const cancelUserSubscription = async (userId: string, cancelImmediately: boolean = false): Promise<void> => {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    throw new Error('User not found')
  }
  
  const userData = userDoc.data()
  const now = new Date()
  
  if (cancelImmediately) {
    // Immediate cancellation - downgrade to free
    await downgradeToFree(userId)
  } else {
    // Cancel at end of billing period
    await updateDoc(userRef, {
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': now,
      'subscription.autoRenew': false,
      subscriptionStatus: 'cancelled',
      updatedAt: serverTimestamp()
    })
  }
}

/**
 * Downgrade user to free plan
 */
export const downgradeToFree = async (userId: string): Promise<void> => {
  const freePlan = SUBSCRIPTION_PLANS.free
  const userRef = doc(db, 'users', userId)
  
  await updateDoc(userRef, {
    plan: 'free',
    subscriptionStatus: 'inactive',
    
    subscription: {
      id: null,
      status: 'inactive',
      plan: 'free',
      startDate: null,
      endDate: null,
      renewalDate: null,
      cancelledAt: serverTimestamp(),
      trialEnd: null,
      autoRenew: false,
      paymentMethod: null,
      priceId: null,
      customerId: null,
      interval: null,
      amount: 0,
      currency: 'USD'
    },
    
    features: freePlan.features,
    
    updatedAt: serverTimestamp()
  })
}

/**
 * Check if user's subscription has expired and handle accordingly
 */
export const checkAndHandleExpiredSubscription = async (userId: string): Promise<boolean> => {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    return false
  }
  
  const userData = userDoc.data()
  const subscription = userData.subscription
  
  if (!subscription || subscription.status === 'inactive' || subscription.status === 'expired') {
    return false
  }
  
  const now = new Date()
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null
  
  if (endDate && now > endDate) {
    if (subscription.autoRenew && subscription.status === 'active') {
      // Try to renew subscription (this would typically involve payment processing)
      console.log(`Attempting to renew subscription for user ${userId}`)
      // In a real implementation, you would:
      // 1. Charge the payment method
      // 2. If successful, extend the subscription
      // 3. If failed, mark as past_due or cancelled
      
      // For now, we'll mark as expired
      await updateDoc(userRef, {
        'subscription.status': 'expired',
        subscriptionStatus: 'expired',
        updatedAt: serverTimestamp()
      })
      
      // Downgrade to free after grace period
      await downgradeToFree(userId)
      return true
    } else {
      // Subscription ended without auto-renewal
      await downgradeToFree(userId)
      return true
    }
  }
  
  return false
}

/**
 * Get user's current plan features
 */
export const getUserPlanFeatures = (userData: any): SubscriptionPlan['features'] => {
  if (userData?.features) {
    return userData.features
  }
  
  // Fallback to free plan features
  return SUBSCRIPTION_PLANS.free.features
}

/**
 * Check if user has access to a specific feature
 */
export const hasFeatureAccess = (userData: any, feature: keyof SubscriptionPlan['features']): boolean => {
  const features = getUserPlanFeatures(userData)
  return features[feature] || false
}

/**
 * Get subscription status display text
 */
export const getSubscriptionStatusText = (status: string): string => {
  switch (status) {
    case 'active': return 'Active'
    case 'cancelled': return 'Cancelled'
    case 'expired': return 'Expired'
    case 'past_due': return 'Past Due'
    case 'inactive': return 'Inactive'
    default: return 'Unknown'
  }
}

/**
 * Calculate days remaining in subscription
 */
export const getDaysRemaining = (endDate: any): number => {
  if (!endDate) return 0
  
  const end = endDate.toDate ? endDate.toDate() : new Date(endDate)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Format price for display
 */
export const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}
