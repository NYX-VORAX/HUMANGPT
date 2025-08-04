import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLimits, formatMessageCount, getPlanDisplayName, getPlanColor } from '@/lib/useUserLimits';

const UserProfileDropdown = () => {
  const { userData } = useAuth();
  const limits = useUserLimits();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if user has unlimited messages
  const hasUnlimitedMessages = () => {
    if (!userData) return false;
    
    // Use API-provided limits if available
    if (userData.limits) {
      return userData.limits.hasUnlimitedMessages;
    }
    
    // Fallback to manual check
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus;
    const plan = userData.subscription?.plan || userData.plan;
    return subscriptionStatus === 'active' && (plan === 'pro' || plan === 'pro-plus');
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  // Conditional render after all hooks are called
  if (!userData) {
    return null;
  }

  const planColor = getPlanColor(userData.plan);
  const userInitials = getInitials(userData.displayName || userData.email || '');

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
        id="options-menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {userInitials}
        </div>
        <div className="flex items-center space-x-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${planColor} text-white`}>
            {getPlanDisplayName(limits.plan)}
          </span>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-md shadow-lg ring-1 ring-gray-700 ring-opacity-50 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            <div className="py-1" role="none">
              <div className="px-4 py-2 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Plan:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${planColor} text-white`}>
                    {getPlanDisplayName(limits.plan)}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Messages Today:</span>
                  <span className="text-sm font-medium text-white">
                    {hasUnlimitedMessages() ? 
                      (userData.stats?.dailyMessages || userData.dailyMessageCount || 0) : 
                      formatMessageCount(limits.dailyCount)
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Messages Left:</span>
                  <span className="text-sm font-medium text-white">
                    {hasUnlimitedMessages() ? 'Unlimited' : (limits.isUnlimited ? 'Unlimited' : limits.messagesLeft)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total Messages:</span>
                  <span className="text-sm font-medium text-white">
                    {userData.stats?.totalMessages || userData.messageCount || limits.totalCount || 0}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Status:</span>
                  <span className={`text-sm font-medium ${
                    (userData.subscription?.status === 'active' || userData.subscriptionStatus === 'active') ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {(userData.subscription?.status || userData.subscriptionStatus || 'inactive').toUpperCase()}
                  </span>
                </div>
              </div>
              {!hasUnlimitedMessages() && (
                <div className="px-4 py-2 border-t border-gray-700">
                  <button
                    onClick={() => {
                      window.location.href = '/premium';
                    }}
                    className="block w-full text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              )}
              {hasUnlimitedMessages() && userData.subscription?.endDate && (
                <div className="px-4 py-2 border-t border-gray-700">
                  <div className="text-center">
                    <span className="text-xs text-green-400">Active until:</span>
                    <div className="text-sm font-medium text-white">
                      {new Date(userData.subscription.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileDropdown;

