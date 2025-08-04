import Link from 'next/link';

export default function Premium() {
  const plans = [
    {
      name: 'Basic',
      price: '$9.99',
      period: 'per month',
      features: [
        'Chat with 5 personas',
        'Basic conversation history',
        'Standard response time',
        'Email support'
      ],
      color: 'from-blue-400 to-blue-600',
      popular: false
    },
    {
      name: 'Premium',
      price: '$19.99',
      period: 'per month',
      features: [
        'Chat with all 8 personas',
        'Unlimited conversation history',
        'Priority response time',
        'Advanced personality customization',
        'Priority support',
        'Export conversations'
      ],
      color: 'from-purple-500 to-pink-500',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$49.99',
      period: 'per month',
      features: [
        'Everything in Premium',
        'Custom persona creation',
        'Team collaboration',
        'Advanced analytics',
        'API access',
        'Dedicated support'
      ],
      color: 'from-indigo-500 to-purple-600',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">HumanGPT ✨</Link>
          <nav className="space-x-4">
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/signup" className="hover:underline">Sign Up</Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Unlock the Full Power of <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">HumanGPT</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience premium AI conversations with advanced features, unlimited access, and priority support
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`relative ${plan.popular ? 'transform scale-105' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                  Most Popular
                </div>
              )}
              
              <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 h-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 ml-2">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        ✓
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full bg-gradient-to-r ${plan.color} text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300`}>
                  Choose {plan.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Why Choose Premium?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🚀',
                title: 'Priority Access',
                description: 'Get faster response times and priority server access during peak hours',
                color: 'from-blue-400 to-purple-500'
              },
              {
                icon: '🎨',
                title: 'Custom Personas',
                description: 'Create your own AI personas with unique personalities and characteristics',
                color: 'from-purple-400 to-pink-500'
              },
              {
                icon: '💾',
                title: 'Advanced History',
                description: 'Never lose a conversation with unlimited chat history and search functionality',
                color: 'from-green-400 to-blue-500'
              },
              {
                icon: '📊',
                title: 'Analytics & Insights',
                description: 'Track your conversation patterns and get insights into your AI interactions',
                color: 'from-yellow-400 to-orange-500'
              },
              {
                icon: '🤝',
                title: 'Team Collaboration',
                description: 'Share personas and conversations with your team for collaborative AI experiences',
                color: 'from-indigo-400 to-purple-500'
              },
              {
                icon: '🔧',
                title: 'API Access',
                description: 'Integrate HumanGPT into your own applications with our developer API',
                color: 'from-pink-400 to-red-500'
              }
            ].map((feature, index) => (
              <div key={index} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-500`}></div>
                <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300">
                  <div className="text-5xl mb-4 text-center">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-3 text-center">{feature.title}</h3>
                  <p className="text-gray-300 text-center leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-24">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to Upgrade?</h3>
            <p className="text-xl mb-8 text-purple-100">
              Join thousands of users who have unlocked the full potential of AI conversation
            </p>
            <Link 
              href="/signup" 
              className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors duration-300 inline-block"
            >
              Start Your Premium Journey →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
