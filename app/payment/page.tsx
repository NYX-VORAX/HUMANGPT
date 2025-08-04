'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const planDetails = {
  'pro': {
    name: 'Pro',
    price: '$2.50',
    period: 'per month',
    features: ['Unlimited conversations', 'Premium personas', 'Priority support']
  },
  'pro-plus': {
    name: 'Pro Plus',
    price: '$5.00',
    period: 'per month',
    features: ['Everything in Pro', 'Early access', 'Beta testing', '24/7 support']
  }
}

const paymentInstructions = {
  email: 'payments@humangpt.com',
  subject: 'HumanGPT Pro Subscription Payment',
  bankDetails: {
    accountName: 'HumanGPT LLC',
    accountNumber: '1234567890',
    routingNumber: '987654321',
    bankName: 'Sample Bank'
  },
  paypalEmail: 'payments@humangpt.com',
  cryptoWallet: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
}

export default function Payment() {
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    preferredCurrency: 'USD'
  })

  useEffect(() => {
    // Get plan from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const plan = urlParams.get('plan')
    if (plan && (plan === 'pro' || plan === 'pro-plus')) {
      setSelectedPlan(plan)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSendInstructions = async () => {
    if (!formData.email || !formData.fullName) {
      alert('Please fill in all required fields.')
      return
    }
    
    setLoading(true)
    
    // Simulate sending instructions
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setLoading(false)
    setShowInstructions(true)
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No plan selected</h1>
          <Link href="/premium" className="text-purple-400 hover:text-purple-300">
            Go back to pricing
          </Link>
        </div>
      </div>
    )
  }

  const plan = planDetails[selectedPlan as keyof typeof planDetails]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link
            href="/premium"
            className="text-white hover:text-purple-300 transition-colors duration-300 flex items-center space-x-2"
          >
            <span className="text-xl">←</span>
            <span>Back to Pricing</span>
          </Link>
          <div className="text-white text-xl font-bold">HumanGPT ✨</div>
        </motion.div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center"
              >
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h3>
                <p className="text-gray-600 mb-6">
                  Welcome to HumanGPT {plan.name}! You now have access to all premium features.
                </p>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm">
                  Redirecting to your dashboard...
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:order-2"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
              
              {/* Plan Details */}
              <div className="bg-white/5 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{plan.name} Plan</h3>
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                </div>
                <p className="text-gray-300 mb-4">{plan.period}</p>
                
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-green-400 text-sm">✓</span>
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{plan.price}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t border-white/20 pt-3">
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>{plan.price}</span>
                  </div>
                </div>
              </div>

              {/* Money Back Guarantee */}
              <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 text-center">
                <div className="text-green-400 text-2xl mb-2">🛡️</div>
                <h4 className="text-white font-semibold mb-1">7-Day Money Back Guarantee</h4>
                <p className="text-green-300 text-sm">Try risk-free! Cancel within 7 days for a full refund.</p>
              </div>
            </div>
          </motion.div>

          {/* Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:order-1"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
              {!showInstructions ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-8">Get Payment Instructions</h2>
                  
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-6 mb-8">
                    <div className="text-blue-400 text-3xl mb-3">📧</div>
                    <h3 className="text-white font-semibold mb-2">Email-Based Payment Process</h3>
                    <p className="text-blue-200 text-sm">
                      We'll send you detailed payment instructions via email. After you make the payment, we'll verify and activate your subscription.
                    </p>
                  </div>

                  {/* Contact Form */}
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Preferred Currency</label>
                      <select
                        name="preferredCurrency"
                        value={formData.preferredCurrency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="USD" className="bg-gray-800">USD ($)</option>
                        <option value="INR" className="bg-gray-800">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  {/* Send Instructions Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendInstructions}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-purple-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending Instructions...</span>
                      </div>
                    ) : (
                      `Get Payment Instructions - ${plan.price}`
                    )}
                  </motion.button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-8">Payment Instructions Sent!</h2>
                  
                  <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 mb-8">
                    <div className="text-green-400 text-3xl mb-3">✅</div>
                    <h3 className="text-white font-semibold mb-2">Check Your Email</h3>
                    <p className="text-green-200 text-sm mb-4">
                      We've sent detailed payment instructions to <strong>{formData.email}</strong>
                    </p>
                    <p className="text-green-200 text-sm">
                      Please check your inbox (and spam folder) for our email with payment details.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 mb-6">
                    <h4 className="text-white font-semibold mb-4">Quick Payment Options:</h4>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <h5 className="text-white font-medium mb-2">💳 Bank Transfer</h5>
                        <p className="text-gray-300 text-sm mb-2">Account: {paymentInstructions.bankDetails.accountName}</p>
                        <p className="text-gray-300 text-sm">Reference: {selectedPlan.toUpperCase()}-{formData.fullName.replace(/\s+/g, '')}</p>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <h5 className="text-white font-medium mb-2">📧 Email Payment</h5>
                        <p className="text-gray-300 text-sm mb-2">Send payment proof to: {paymentInstructions.email}</p>
                        <p className="text-gray-300 text-sm">Subject: {paymentInstructions.subject}</p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl">
                        <h5 className="text-white font-medium mb-2">🅿️ PayPal</h5>
                        <p className="text-gray-300 text-sm">Send to: {paymentInstructions.paypalEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
                    <div className="text-yellow-400 text-2xl mb-2">⏰</div>
                    <h4 className="text-white font-semibold mb-1">Processing Time</h4>
                    <p className="text-yellow-200 text-sm">Your subscription will be activated within 24 hours after payment verification.</p>
                  </div>
                </>
              )}
              
              {/* Security Info */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
                  <span>🔒</span>
                  <span>All payments are verified manually for security</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
