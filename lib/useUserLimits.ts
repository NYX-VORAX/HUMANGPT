import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserLimits {
  messagesLeft: number | string;
  dailyCount: number;
  totalCount: number;
  canSend: boolean;
  plan: string;
  isUnlimited: boolean;
}

export const useUserLimits = (): UserLimits => {
  const { userData } = useAuth();
  const [limits, setLimits] = useState<UserLimits>({
    messagesLeft: 0,
    dailyCount: 0,
    totalCount: 0,
    canSend: false,
    plan: 'free',
    isUnlimited: false
  });

  const calculateLimits = useCallback(() => {
    if (!userData) {
      return {
        messagesLeft: 0,
        dailyCount: 0,
        totalCount: 0,
        canSend: false,
        plan: 'free',
        isUnlimited: false
      };
    }

    // Use API-provided limits if available
    if (userData.limits) {
      return {
        messagesLeft: userData.limits.hasUnlimitedMessages ? '∞' : userData.limits.remainingMessages,
        dailyCount: userData.stats?.dailyMessages || userData.dailyMessageCount || 0,
        totalCount: userData.stats?.totalMessages || userData.messageCount || 0,
        canSend: !userData.limits.isLimitReached,
        plan: userData.plan,
        isUnlimited: userData.limits.hasUnlimitedMessages
      };
    }

    // Fallback to manual calculation
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus;
    const isPremium = (userData.plan === 'pro' || userData.plan === 'pro-plus') && subscriptionStatus === 'active';
    const dailyLimit = 20;
    const currentDaily = userData.stats?.dailyMessages || userData.dailyMessageCount || 0;

    if (isPremium) {
      return {
        messagesLeft: '∞',
        dailyCount: currentDaily,
        totalCount: userData.stats?.totalMessages || userData.messageCount || 0,
        canSend: true,
        plan: userData.plan,
        isUnlimited: true
      };
    }

    const remaining = Math.max(0, dailyLimit - currentDaily);

    return {
      messagesLeft: remaining,
      dailyCount: currentDaily,
      totalCount: userData.stats?.totalMessages || userData.messageCount || 0,
      canSend: remaining > 0,
      plan: userData.plan,
      isUnlimited: false
    };
  }, [userData]);

  useEffect(() => {
    setLimits(calculateLimits());
  }, [calculateLimits]);

  return limits;
};

// Helper function to format message count display
export const formatMessageCount = (count: number | string): string => {
  if (count === '∞') return 'Unlimited';
  if (typeof count === 'number') {
    return count.toString();
  }
  return '0';
};

// Helper function to get plan display name
export const getPlanDisplayName = (plan: string): string => {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'pro-plus':
      return 'Pro Plus';
    default:
      return 'Free';
  }
};

// Helper function to get plan color
export const getPlanColor = (plan: string): string => {
  switch (plan) {
    case 'free':
      return 'bg-gray-500';
    case 'pro':
      return 'bg-purple-500';
    case 'pro-plus':
      return 'bg-gradient-to-r from-purple-500 to-pink-500';
    default:
      return 'bg-gray-500';
  }
};
