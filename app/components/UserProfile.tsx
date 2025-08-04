'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { logout } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UserProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, userData } = useAuth()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
    router.push('/')
  }

  if (!user) return null

  const getPlanBadge = () => {
    const plan = userData?.plan || 'free'
    const colors = {
      free: 'bg-gray-500',
      pro: 'bg-purple-500',
      'pro-plus': 'bg-gradient-to-r from-purple-500 to-pink-500'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full text-white ${colors[plan]}`}>
        {plan.toUpperCase()}
      </span>
    )
  }

  const getMessagesLeft = () => {
    if (!userData) return 0
    if (userData.plan === 'pro' || userData.plan === 'pro-plus') return '∞'
    return Math.max(0, 20 - (userData.dailyMessageCount || 0))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white/10 backdrop-blur-lg rounded-full p-2 border border-white/20 hover:bg-white/20 transition-all duration-300"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-white font-medium text-sm hidden md:block">
          {user.displayName || user.email?.split('@')[0]}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-gray-700 shadow-2xl z-50"
          >
            {/* User Info Section */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">
                    {user.displayName || 'User'}
                  </h3>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getPlanBadge()}
                    <span className="text-gray-400 text-xs">
                      {getMessagesLeft()} messages left today
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Status Section */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Daily Messages</p>
                  <p className="text-white text-lg font-bold">
                    {userData?.dailyMessageCount || 0} / {userData?.plan === 'free' ? '20' : '∞'}
                  </p>
                </div>
                {userData?.plan === 'free' && (
                  <Link href="/premium">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Upgrade
                    </motion.button>
                  </Link>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <Link href="/settings">
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </motion.button>
              </Link>

              <Link href="/premium">
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span>Upgrade to Premium</span>
                </motion.button>
              </Link>

              <motion.button
                whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:text-red-400 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
