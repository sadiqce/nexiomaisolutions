import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../services/airtableService';
import PaymentModalEmbedded from '../components/payment/PaymentModalEmbedded';

const PricingView = () => {
  const { currentUser } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [currentTier, setCurrentTier] = useState(null);
  const [pendingTier, setPendingTier] = useState(null);
  const [pendingActivationDate, setPendingActivationDate] = useState(null);

  const fetchUserTier = useCallback(async () => {
    try {
      const user = await getUser(currentUser.uid);
      if (user && user.Tier) {
        setCurrentTier(user.Tier);
        setPendingTier(user.PendingTier || null);
        setPendingActivationDate(user.PendingActivationDate || null);
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
      price: '$0',
      description: 'Get started for free',
      features: [
        { text: '5 documents per month', included: true },
        { text: '2 MB max file size', included: true },
        { text: '2 pages max per document', included: true },
        { text: '24-hour file retention', included: true },
        { text: 'Standard AI extraction', included: true },
        { text: 'Top-Up packs available', included: false },
      ],
      cta: 'Get Started',
      ctaAction: 'free',
      highlighted: false,
    },
    {
      name: 'Standard',
      price: '$49',
      description: 'For daily operations',
      features: [
        { text: '100 documents per month', included: true },
        { text: '10 MB max file size', included: true },
        { text: '10 pages max per document', included: true },
        { text: '7-day file retention', included: true },
        { text: 'Standard AI extraction', included: true },
        { text: 'Top-Up packs ($20/50 docs)', included: true },
      ],
      cta: 'Subscribe',
      ctaAction: 'standard',
      highlighted: true,
    },
    {
      name: 'Volume',
      price: '$149',
      description: 'For high volume users',
      features: [
        { text: '500 documents per month', included: true },
        { text: '25 MB max file size', included: true },
        { text: '25 pages max per document', included: true },
        { text: '14-day file retention', included: true },
        { text: 'Standard AI extraction', included: true },
        { text: 'Top-Up packs ($20/50 docs)', included: true },
      ],
      cta: 'Subscribe',
      ctaAction: 'volume',
      highlighted: false,
    },
  ];

  const handlePayment = (planType) => {
    if (planType === 'free') {
      window.location.assign('/');
      return;
    }

    if (!currentUser) {
      window.location.assign('/portal/login?redirect=pricing');
      return;
    }

    if (pendingTier) {
      setError(`You already have ${pendingTier} plan scheduled for activation.`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (currentTier === 'Volume') {
      setError('You are already on the highest tier.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSelectedPlan(planType === 'standard' ? 'Standard' : 'Volume');
    setShowPaymentModal(true);
  };

  const handlePaymentModalClose = (success = false) => {
    setShowPaymentModal(false);
    if (success) {
      setError('');
      if (currentUser) {
        fetchUserTier();
      }
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Pending Tier Status */}
        {pendingTier && (
          <div className="mb-8 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg text-sm">
            <p className="font-semibold">Pending Upgrade: {pendingTier} Plan</p>
            <p className="mt-1">Activation scheduled for {new Date(pendingActivationDate).toLocaleDateString()}.</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-3 sm:mb-4\">Simple, transparent pricing</h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto\">Scale your operations with flexible plans. Cancel anytime, no hidden fees.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg border transition ${
                plan.highlighted
                  ? 'border-blue-300 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:shadow-md'
              }`}
            >
              {plan.highlighted && (
                <div className="px-6 py-2 bg-blue-600 text-white text-xs font-semibold rounded-t-lg text-center">
                  Most Popular
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Name and Price */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2 text-sm">/month</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button 
                  onClick={() => handlePayment(plan.ctaAction)}
                  disabled={
                    loading || 
                    (plan.ctaAction !== 'free' && !currentUser) ||
                    (plan.ctaAction !== 'free' && pendingTier) ||
                    (plan.ctaAction !== 'free' && currentTier === 'Volume')
                  }
                  className={`w-full px-4 py-2.5 font-medium rounded-lg text-sm transition mb-6 ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } ${
                    (loading || 
                    (plan.ctaAction !== 'free' && !currentUser) ||
                    (plan.ctaAction !== 'free' && pendingTier) ||
                    (plan.ctaAction !== 'free' && currentTier === 'Volume')) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading && plan.ctaAction !== 'free' ? 'Processing...' : plan.cta}
                </button>

                {/* Features */}
                <div className="space-y-2.5">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className={`mr-2.5 flex-shrink-0 text-sm font-medium ${
                        feature.included ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {feature.included ? '✓' : '–'}
                      </span>
                      <span className={`text-sm ${
                        feature.included ? 'text-gray-700' : 'text-gray-400 line-through'
                      }`}>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sm:p-8 mb-12 sm:mb-16">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Need more documents?</h2>
          <p className="text-gray-600 text-sm mb-4">Purchase additional documents anytime with no expiration. They roll over month to month.</p>
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <p className="font-semibold text-gray-900">$20 for 50 documents</p>
            </div>
            <div className="text-gray-600 text-sm">Perfect for spikes, backlogs, or testing.</div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Feature</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Sandbox</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Standard</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-4 text-gray-700">Monthly documents</td>
                <td className="text-center py-3 px-4 text-gray-600">5</td>
                <td className="text-center py-3 px-4 text-gray-600">100</td>
                <td className="text-center py-3 px-4 text-gray-600">500</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-700">Max file size</td>
                <td className="text-center py-3 px-4 text-gray-600">2 MB</td>
                <td className="text-center py-3 px-4 text-gray-600">10 MB</td>
                <td className="text-center py-3 px-4 text-gray-600">25 MB</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-700">Pages per document</td>
                <td className="text-center py-3 px-4 text-gray-600">2</td>
                <td className="text-center py-3 px-4 text-gray-600">10</td>
                <td className="text-center py-3 px-4 text-gray-600">25</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-700">File retention</td>
                <td className="text-center py-3 px-4 text-gray-600">24 hours</td>
                <td className="text-center py-3 px-4 text-gray-600">7 days</td>
                <td className="text-center py-3 px-4 text-gray-600">14 days</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Modal */}
        <PaymentModalEmbedded
          isOpen={showPaymentModal}
          onClose={handlePaymentModalClose}
          userId={currentUser?.uid}
          userEmail={currentUser?.email}
          currentTier={currentTier}
          pendingTier={pendingTier}
          pendingActivationDate={pendingActivationDate}
          targetPlan={selectedPlan}
        />
      </div>
    </section>
  );
};

export default PricingView;
