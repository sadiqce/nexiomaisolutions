import React, { useState, useEffect } from 'react';
import { redirectToCheckout, PAYMENT_PLANS } from '../../services/paymentService';
import { getUser } from '../../services/airtableService';

/**
 * PaymentModal - Plan upgrade modal
 * Redirects to Stripe Payment Link when user clicks Subscribe
 */
const PaymentModal = ({ isOpen, onClose, userId, userEmail, currentTier = 'Sandbox', targetPlan = 'Standard' }) => {
  const [selectedPlan, setSelectedPlan] = useState(targetPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-select the target plan when modal opens
  // Also check if user just returned from payment
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(targetPlan);
      setError('');
      
      // Check if returning from Stripe payment
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment_success') === 'true') {
        handlePaymentSuccess();
      }
    }
  }, [isOpen, targetPlan]);

  const handlePaymentSuccess = async () => {
    try {
      // Refresh user data to get updated tier
      const user = await getUser(userId);
      if (user && user.Tier !== currentTier) {
        // Tier was updated - payment succeeded!
        onClose(true);
      }
    } catch (err) {
      console.error('Error checking payment:', err);
    }
  };

  if (!isOpen) return null;

  const planDetails = PAYMENT_PLANS[selectedPlan];
  const displayPrice = `$${(planDetails.amount / 100).toFixed(2)}/mo`;

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!userId || !userEmail) {
        throw new Error('User information not available');
      }

      if (selectedPlan === currentTier) {
        throw new Error('You are already on this plan');
      }

      // Redirect to Stripe Payment Link
      await redirectToCheckout(selectedPlan, userEmail, userId);
    } catch (err) {
      setError(err.message || 'Failed to start checkout');
      console.error('Checkout error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upgrade Your Plan</h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white text-2xl font-bold"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Current Plan */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Current Plan</p>
          <h3 className="text-2xl font-bold text-purple-400">{currentTier}</h3>
          <p className="text-gray-400 text-xs mt-1">Your active subscription</p>
        </div>

        {/* Select Plan */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-semibold mb-3">
            Choose a Plan
          </label>
          <div className="space-y-2">
            {Object.entries(PAYMENT_PLANS).map(([planName, plan]) => (
              <label
                key={planName}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${
                  selectedPlan === planName
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 hover:border-purple-500'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={planName}
                  checked={selectedPlan === planName}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-4 h-4 accent-purple-500 mt-1"
                  disabled={loading}
                />
                <div className="ml-3 flex-1">
                  <p className="text-white font-semibold">{planName} Plan</p>
                  <p className="text-gray-400 text-sm">
                    ${(plan.amount / 100).toFixed(2)}/month • {plan.monthlyLimit} documents/mo
                  </p>
                  {planName === 'Volume' && (
                    <p className="text-fuchsia-400 text-xs mt-1">Best for high volume</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-6 p-4 bg-blue-600/20 border border-blue-600 rounded-lg">
          <h4 className="text-white font-semibold text-sm mb-3">Included:</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center">
              <span className="text-purple-400 mr-2">✓</span>
              {planDetails.monthlyLimit} documents/month
            </li>
            <li className="flex items-center">
              <span className="text-purple-400 mr-2">✓</span>
              Up to {planDetails.maxPages} pages per document
            </li>
            <li className="flex items-center">
              <span className="text-purple-400 mr-2">✓</span>
              {planDetails.retentionDays} days document retention
            </li>
            <li className="flex items-center">
              <span className="text-purple-400 mr-2">✓</span>
              Priority support
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onClose(false)}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded font-medium hover:bg-gray-600 transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubscribe}
            disabled={loading || selectedPlan === currentTier}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Subscribe (${displayPrice})`}
          </button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">
          Secure payment processing by Stripe
        </p>
      </div>
    </div>
  );
};

export default PaymentModal;
