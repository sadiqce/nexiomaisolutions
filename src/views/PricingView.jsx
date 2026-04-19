import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../services/airtableService';
import PaymentModalEmbedded from '../components/payment/PaymentModalEmbedded';

const PricingView = () => {
  const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";
  
  const { currentUser } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [currentTier, setCurrentTier] = useState(null);

  const fetchUserTier = useCallback(async () => {
    try {
      const user = await getUser(currentUser.uid);
      if (user && user.Tier) {
        setCurrentTier(user.Tier);
      }
    } catch (err) {
      console.error('Error fetching user tier:', err);
    }
  }, [currentUser]);

  // Fetch user's current tier on component load
  React.useEffect(() => {
    if (currentUser) {
      fetchUserTier();
    }
  }, [currentUser, fetchUserTier]);

  const plans = [
    {
      name: 'Sandbox',
      subtitle: 'Free Tier',
      price: '$0',
      period: '/ month',
      description: 'A strictly restricted test drive. See the AI successfully extract data, proving the system works.',
      icon: '🧪',
      features: [
        { text: '5 documents per month', included: true },
        { text: 'Max file size: 2 MB', included: true },
        { text: 'Max document length: 2 pages', included: true },
        { text: '24-hour file retention', included: true },
        { text: 'Standard AI extraction (Material, Lot Number)', included: true },
        { text: 'View-only access to Compliance Ledger', included: true },
        { text: 'Priority queueing', included: false },
        { text: 'Top-Up packs available', included: false },
      ],
      cta: 'Get Started Free',
      ctaAction: 'free',
      highlighted: false,
    },
    {
      name: 'Standard',
      subtitle: 'Daily Compliance',
      price: '$49',
      period: '/ month',
      description: 'Bread-and-butter tier for businesses doing daily or weekly compliance uploads with auto-subscription and top-up flexibility.',
      icon: '⚡',
      features: [
        { text: '100 documents per month', included: true },
        { text: 'Max file size: 10 MB', included: true },
        { text: 'Max document length: 10 pages', included: true },
        { text: '7-day file retention', included: true },
        { text: 'Standard AI extraction', included: true },
        { text: 'Priority queueing', included: false },
        { text: 'Top-Up packs available ($20/50 docs)', included: true },
        { text: 'Auto-renewal with cancel anytime', included: true },
      ],
      cta: 'Subscribe Now',
      ctaAction: 'standard',
      highlighted: true,
    },
    {
      name: 'Volume',
      subtitle: 'High Volume',
      price: '$149',
      period: '/ month',
      description: 'For heavy users processing bulk shipments with auto-subscription and flexible top-ups.',
      icon: '🚀',
      features: [
        { text: '500 documents per month', included: true },
        { text: 'Max file size: 25 MB', included: true },
        { text: 'Max document length: 25 pages', included: true },
        { text: '14-day file retention', included: true },
        { text: 'Standard AI extraction', included: true },
        { text: 'Priority queue processing', included: true },
        { text: 'Top-Up packs available ($20/50 docs)', included: true },
        { text: 'Auto-renewal with cancel anytime', included: true },
      ],
      cta: 'Subscribe Now',
      ctaAction: 'volume',
      highlighted: false,
    },
  ];

  const handlePayment = (planType) => {
    if (planType === 'free') {
      // Sandbox (Free) plan - navigate to home
      window.location.assign('/');
      return;
    }

    if (!currentUser) {
      // Not logged in - redirect to login
      window.location.assign('/portal/login?redirect=pricing');
      return;
    }

    // Open payment modal for paid plans
    setSelectedPlan(planType === 'standard' ? 'Standard' : 'Volume');
    setShowPaymentModal(true);
  };

  const handlePaymentModalClose = (success = false) => {
    setShowPaymentModal(false);
    if (success) {
      setError('');
    }
  };

  return (
    <section className="min-h-screen bg-gray-900 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-900/30 border border-red-700 text-red-200 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold mb-4">Transparent, Usage-Based Pricing</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Scale from testing to high-volume processing. Hard limits protect your costs. Top-ups available whenever you need more.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl transition duration-300 transform hover:scale-105 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-purple-900 to-fuchsia-900 border-2 border-fuchsia-500 shadow-2xl lg:scale-105'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Icon and Name */}
                <div className="text-5xl mb-3">{plan.icon}</div>
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-fuchsia-400 text-sm mb-4">{plan.subtitle}</p>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-gray-400 ml-2">{plan.period}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-6">{plan.description}</p>

                {/* CTA Button */}
                <button 
                  onClick={() => handlePayment(plan.ctaAction)}
                  disabled={loading && plan.ctaAction !== 'free'}
                  className={`w-full ${BUTTON_GRADIENT} py-3 rounded-lg font-bold mb-8 ${
                    loading && plan.ctaAction !== 'free' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading && plan.ctaAction !== 'free' ? 'Processing...' : plan.cta}
                </button>

                {/* Features */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase">What's Included</p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className={`mr-3 flex-shrink-0 ${feature.included ? 'text-green-400' : 'text-gray-600'}`}>
                        {feature.included ? '✓' : '✗'}
                      </span>
                      <span className={feature.included ? 'text-gray-200 text-sm' : 'text-gray-500 text-sm line-through'}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top-Up Info */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="text-3xl mr-3">📦</span>
            Document Top-Ups
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-300 mb-4">
                Hit your monthly limit? No problem. Purchase document top-ups anytime:
              </p>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-white font-bold text-lg mb-2">$20 for 50 documents</p>
                <p className="text-green-400 text-sm mt-3">✓ No expiration</p>
                <p className="text-green-400 text-sm">✓ Rolls over month-to-month</p>
              </div>
            </div>
            <div>
              <p className="text-gray-300 mb-4">
                Top-ups are perfect for:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-2">•</span>
                  <span>Unexpected volume spikes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-2">•</span>
                  <span>Processing historical backlogs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-2">•</span>
                  <span>Seasonal business fluctuations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-2">•</span>
                  <span>Testing new extraction features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Limits Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">📊 Plan Comparison & Limits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 font-bold">Feature</th>
                  <th className="text-center py-3 px-4 font-bold">Sandbox</th>
                  <th className="text-center py-3 px-4 font-bold">Standard</th>
                  <th className="text-center py-3 px-4 font-bold">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                <tr>
                  <td className="py-3 px-4 text-gray-300">Monthly Limit</td>
                  <td className="text-center py-3 px-4 text-yellow-400">5 docs</td>
                  <td className="text-center py-3 px-4 text-green-400">100 docs</td>
                  <td className="text-center py-3 px-4 text-purple-400">500 docs</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300">Max File Size</td>
                  <td className="text-center py-3 px-4 text-yellow-400">2 MB</td>
                  <td className="text-center py-3 px-4 text-green-400">10 MB</td>
                  <td className="text-center py-3 px-4 text-purple-400">25 MB</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300">Max Pages per Doc</td>
                  <td className="text-center py-3 px-4 text-yellow-400">2 pages</td>
                  <td className="text-center py-3 px-4 text-green-400">10 pages</td>
                  <td className="text-center py-3 px-4 text-purple-400">25 pages</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300">File Retention</td>
                  <td className="text-center py-3 px-4 text-yellow-400">24 hours</td>
                  <td className="text-center py-3 px-4 text-green-400">7 days</td>
                  <td className="text-center py-3 px-4 text-purple-400">14 days</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300">Priority Processing</td>
                  <td className="text-center py-3 px-4 text-gray-500">No</td>
                  <td className="text-center py-3 px-4 text-gray-500">No</td>
                  <td className="text-center py-3 px-4 text-green-400">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        <PaymentModalEmbedded
          isOpen={showPaymentModal}
          onClose={handlePaymentModalClose}
          userId={currentUser?.uid}
          userEmail={currentUser?.email}
          currentTier={currentTier}
          targetPlan={selectedPlan}
        />
      </div>
    </section>
  );
};

export default PricingView;
