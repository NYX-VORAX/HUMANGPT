'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange, getCurrentUserData, incrementUserMessageCount, onUserDataChange, checkAndResetDailyCount } from '@/lib/clientUtils'

interface UserData {
  uid: string
  email: string | null
  displayName: string
  photoURL: string
  plan: 'free' | 'pro' | 'pro-plus'
  subscriptionStatus: string
  messageCount?: number
  dailyMessageCount?: number
  lastMessageDate: any
  
  subscription?: {
    id: string | null
    status: 'inactive' | 'active' | 'cancelled' | 'expired' | 'past_due'
    plan: 'free' | 'pro' | 'pro-plus'
    startDate: any
    endDate: any
    renewalDate: any
    cancelledAt: any
    trialEnd: any
    autoRenew: boolean
    paymentMethod: string | null
    priceId: string | null
    customerId: string | null
    interval: 'monthly' | 'yearly' | null
    amount: number
    currency: string
    daysRemaining?: number
  }
  
  limits?: {
    dailyMessages: number
    remainingMessages: number | string
    isLimitReached: boolean
    planLimit: number
    hasUnlimitedMessages: boolean
  }
  
  features?: {
    basicPersonas: boolean
    premiumPersonas: boolean
    unlimitedMessages: boolean
    prioritySupport: boolean
    advancedAnalytics: boolean
    customPersonas: boolean
    apiAccess: boolean
    exportData: boolean
  }
  
  preferences?: {
    theme: string
    notifications: boolean
    language: string
    emailUpdates?: boolean
    marketingEmails?: boolean
  }
  
  account?: {
    isActive: boolean
    isVerified: boolean
    isSuspended: boolean
    suspensionReason: string | null
    lastLoginAt: any
    loginCount: number
    referralCode: string | null
    referredBy: string | null
  }
  
  stats?: {
    totalMessages: number
    dailyMessages: number
    lastMessageDate: any
    memberSince: any
  }
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  isAuthenticated: boolean
  canSendMessage: boolean
  sendMessage: () => Promise<boolean>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  canSendMessage: false,
  sendMessage: async () => false,
  refreshUserData: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const refreshUserData = async () => {
    if (user && mounted) {
      try {
        // Use API to get user data with proper subscription checks
        const token = await user.getIdToken()
        const response = await fetch('/api/user/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUserData(data.user as UserData)
          }
        } else {
          // Fallback to client-side method
          await checkAndResetDailyCount()
          const data = await getCurrentUserData()
          if (data) {
            setUserData(data as UserData)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Fallback to client-side method
        try {
          await checkAndResetDailyCount()
          const data = await getCurrentUserData()
          if (data) {
            setUserData(data as UserData)
          }
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError)
        }
      }
    }
  }

  const canSendMessage = (): boolean => {
    if (!userData) return false
    
    // Check if account is active and not suspended
    if (userData.account && (!userData.account.isActive || userData.account.isSuspended)) {
      return false
    }
    
    // Check subscription status and plan
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus
    const plan = userData.subscription?.plan || userData.plan
    
    // Premium users with active subscription have unlimited messages
    if (subscriptionStatus === 'active' && (plan === 'pro' || plan === 'pro-plus')) {
      return true
    }
    
    // Free users or inactive subscriptions have daily limit (20 messages per day)
    return (userData.dailyMessageCount || 0) < 20
  }

  const sendMessage = async (): Promise<boolean> => {
    if (!user || !canSendMessage()) {
      return false
    }

    try {
      await incrementUserMessageCount()
      
      // Refresh user data to get updated counts
      await refreshUserData()
      
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  // Handle mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const authUnsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Fetch initial user data
        await refreshUserData()
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => {
      authUnsubscribe()
    }
  }, [mounted])

  // Separate effect for real-time user data updates
  useEffect(() => {
    if (!mounted) return
    
    let dataUnsubscribe: (() => void) | null = null

    if (user) {
      dataUnsubscribe = onUserDataChange((newData) => {
        if (newData) {
          setUserData(newData as UserData)
        }
      })
    }

    return () => {
      if (dataUnsubscribe) {
        dataUnsubscribe()
      }
    }
  }, [user, mounted])

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    canSendMessage: canSendMessage(),
    sendMessage,
    refreshUserData
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
