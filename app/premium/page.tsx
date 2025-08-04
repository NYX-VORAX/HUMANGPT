'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  color: string
  buttonText: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out HumanGPT',
    features: [
      'Access to 8 basic personas',
      'Limited to 20 messages per day',
      'Basic conversation features',
      'Community support',
      'Standard response time'
    ],
    color: 'from-gray-500 to-gray-600',
    buttonText: 'Current Plan'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$2.50',
    period: 'per month',
    description: 'For serious AI conversation enthusiasts',
    features: [
      'Access to all 14 personas (8 basic + 6 premium)',
      'Unlimited conversations',
      'Premium personas with advanced personalities',
      'Priority email support',
      'Fast response times',
      'Conversation export feature',
      'Custom persona preferences',
      'No ads'
    ],
    popular: true,
    color: 'from-blue-500 to-purple-600',
    buttonText: 'Upgrade to Pro'
  },
  {
    id: 'pro-plus',
    name: 'Pro Plus',
    price: '$5.00',
    period: 'per month',
    description: 'Ultimate AI companion experience',
    features: [
      'Everything in Pro',
      'Early access to new personas',
      'Beta testing opportunities',
      'Priority chat support (24/7)',
      'Custom AI personality training',
      'Advanced conversation analytics',
      'Voice message support (coming soon)',
      'API access for developers',
      'White-label licensing options'
    ],
    color: 'from-purple-600 to-pink-600',
    buttonText: 'Upgrade to Pro Plus'
  }
]

export default function Premium() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      // Free plan is already active
      return
    }
    setSelectedPlan(planId)
    // Redirect to payment page
    window.location.href = `/payment?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link
            href="/"
            className="text-white hover:text-purple-300 transition-colors duration-300 flex items-center space-x-2"
          >
            <span className="text-xl">←</span>
            <span>Back to Home</span>
          </Link>
          <div className="text-white text-xl font-bold">HumanGPT ✨</div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Choose Your
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Unlock the full potential of AI conversations. Choose a plan that fits your needs and start building meaningful connections with our advanced AI personas.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`relative group ${
                plan.popular ? 'scale-105 md:scale-110' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    🔥 MOST POPULAR
                  </div>
                </div>
              )}

              {/* Glowing background */}
              <div className={`absolute inset-0 bg-gradient-to-r ${plan.color} rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />

              {/* Main card */}
              <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 h-full">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-300 text-sm">/{plan.period}</span>
                  </div>
                  <p className="text-gray-300 mt-3">{plan.description}</p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={plan.id === 'free'}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                    plan.id === 'free'
                      ? 'bg-gray-600 text-gray-300 cursor-default'
                      : `bg-gradient-to-r ${plan.color} text-white hover:shadow-xl hover:shadow-purple-500/25`
                  }`}
                >
                  {plan.buttonText}
                </motion.button>

                {/* Additional info for popular plan */}
                {plan.popular && (
                  <div className="mt-4 text-center">
                    <span className="text-xs text-green-400 font-medium">💰 Save 30% vs monthly</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Why Upgrade?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: '🚀',
                title: 'Unlimited Conversations',
                description: 'Chat as much as you want with no daily limits'
              },
              {
                icon: '👑',
                title: 'Premium Personas',
                description: 'Access to 6 exclusive AI companions with advanced personalities'
              },
              {
                icon: '⚡',
                title: 'Priority Support',
                description: 'Get help faster with our premium support team'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                question: 'Can I cancel anytime?',
                answer: 'Yes, you can cancel your subscription at any time. Your premium features will remain active until the end of your billing period.'
              },
              {
                question: 'What payment methods do you accept?',
                answer: 'We accept all major credit cards, PayPal, and cryptocurrency payments for your convenience.'
              },
              {
                question: 'Is there a free trial?',
                answer: 'Yes! You can try our premium features for 7 days free when you sign up for any paid plan.'
              },
              {
                question: 'How do premium personas differ?',
                answer: 'Premium personas have more sophisticated personalities, deeper conversation abilities, and specialized knowledge in their areas of expertise.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-3">{faq.question}</h4>
                <p className="text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Upgrade?</h3>
            <p className="text-purple-100 mb-6">
              Join thousands of users who have unlocked the full potential of AI conversations
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePlanSelect('pro')}
              className="bg-white text-purple-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors duration-300"
            >
              Start Your Free Trial →
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
