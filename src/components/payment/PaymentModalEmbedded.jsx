import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, createPaymentIntentForPlan, processPaymentSuccess, PAYMENT_PLANS } from '../../services/paymentService';

/**
 * Inner form component that uses Stripe hooks
 */
const PaymentForm = ({ userId, userEmail, selectedPlan, onSuccess, onCancel, onError, currentTier }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessError('');

    if (!stripe || !elements) {
      setProcessError('Stripe is not loaded. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // At this point, a subscription is already created via createPaymentIntentForPlan()
      // We just need to confirm its payment intent
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}?payment_success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setProcessError(error.message || 'Payment failed');
        setIsProcessing(false);
        onError?.(error);
        return;
      }

      // Payment succeeded - now update Airtable
      if (paymentIntent.status === 'succeeded') {
        // Get subscription ID from payment intent metadata
        // The subscription was created during createPaymentIntentForPlan()
        // Pass the subscription ID and status to processPaymentSuccess
        const result = await processPaymentSuccess(
          userId, 
          selectedPlan, 
          paymentIntent.subscription, // subscription ID is in paymentIntent.subscription
          paymentIntent.status
        );
        onSuccess?.(result);
      } else if (paymentIntent.status === 'requires_action') {
        setProcessError('Additional authentication required');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setProcessError(err.message || 'Payment processing failed');
      setIsProcessing(false);
      onError?.(err);
    }
  };

  const plan = PAYMENT_PLANS[selectedPlan];
  const displayPrice = `$${(plan.amount / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">Order Summary</h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex justify-between">
            <span>{selectedPlan} Plan</span>
            <span className="text-white font-semibold">{displayPrice}/mo</span>
          </div>
          <div className="pt-2 border-t border-blue-600">
            <p className="text-xs text-gray-400 mt-2">
              ✓ {plan.monthlyLimit} documents/month
            </p>
            <p className="text-xs text-gray-400">
              ✓ Up to {plan.maxPages} pages per document
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* Error message */}
      {processError && (
        <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded-lg text-sm">
          {processError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onCancel()}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 border border-gray-600 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 transition font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white font-semibold transition"
        >
          {isProcessing ? 'Processing...' : `Pay ${displayPrice}`}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Your payment information is secured by Stripe
      </p>
    </form>
  );
};

/**
 * PaymentModal - Plan upgrade modal with embedded Stripe Payment Element
 * Keeps users on the website during payment
 */
const PaymentModalEmbedded = ({ 
  isOpen, 
  onClose, 
  userId, 
  userEmail, 
  currentTier = 'Sandbox', 
  pendingTier = null,
  pendingActivationDate = null,
  targetPlan = 'Standard' 
}) => {
  const [selectedPlan, setSelectedPlan] = useState(targetPlan);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user has a pending tier
  const hasPendingTier = !!pendingTier;

  // Check if user is on Volume (highest tier)
  const isOnVolume = currentTier === 'Volume';

  // Determine which plans can be purchased
  const canPurchasePlan = (planName) => {
    if (hasPendingTier) return false; // Can't upgrade if pending tier exists
    if (isOnVolume) return false; // Can't upgrade from Volume
    if (planName === currentTier) return false; // Can't buy current plan
    if (currentTier === 'Standard' && planName !== 'Volume') return false; // Standard can only upgrade to Volume
    return true;
  };

  // Check if user can proceed with any purchase
  const canProceed = !isOnVolume && !hasPendingTier && selectedPlan !== currentTier;

  const getButtonDisabledState = (planName) => {
    return !canPurchasePlan(planName) || loading || successMessage;
  };

  // Reset state and sync with targetPlan when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set selected plan based on what's available
      if (hasPendingTier) {
        setSelectedPlan(pendingTier);
      } else if (isOnVolume) {
        setSelectedPlan('Volume');
      } else if (currentTier === 'Standard') {
        setSelectedPlan('Volume');
      } else {
        setSelectedPlan(targetPlan);
      }
      setSuccessMessage('');
      setError('');
      setClientSecret('');
    }
  }, [isOpen, currentTier, targetPlan, isOnVolume, hasPendingTier, pendingTier]);

  // Initialize Stripe and create payment intent when plan changes
  useEffect(() => {
    if (isOpen && canProceed && !successMessage && !isOnVolume && !hasPendingTier) {
      createPaymentIntent();
      initializeStripe();
    }
  }, [isOpen, selectedPlan, canProceed, successMessage, isOnVolume, hasPendingTier]);

  const initializeStripe = async () => {
    try {
      const stripe = await getStripe();
      setStripePromise(stripe);
    } catch (err) {
      console.error('Failed to initialize Stripe:', err);
      setError('Failed to load payment form. Please refresh and try again.');
    }
  };

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      if (!userId || !userEmail) {
        throw new Error('User information not available');
      }

      const paymentData = await import('../../services/paymentService').then(m =>
        m.createPaymentIntentForPlan(selectedPlan, userEmail, userId)
      );

      setClientSecret(paymentData.clientSecret);
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
      console.error('Payment intent error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    const message = result?.message || `Successfully upgraded to ${selectedPlan} plan!`;
    setSuccessMessage(message);
    setTimeout(() => {
      onClose(true);
    }, 3000);
  };

  const handlePaymentError = (err) => {
    console.error('Payment error:', err);
  };

  if (!isOpen) return null;

  const planDetails = PAYMENT_PLANS[selectedPlan];
  const displayPrice = `$${(planDetails.amount / 100).toFixed(2)}/mo`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
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

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 bg-green-900/20 border border-green-600 text-green-400 px-4 py-3 rounded-lg text-sm">
            ✓ {successMessage}
          </div>
        )}

        {/* Volume Plan Message */}
        {isOnVolume && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <p className="text-green-400 text-sm flex items-center">
              <span className="mr-2">✓</span>
              You're on our highest tier! Enjoy your Volume plan.
            </p>
          </div>
        )}

        {/* Pending Tier Message */}
        {hasPendingTier && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
            <p className="text-blue-400 text-sm font-semibold">
              ⏳ Pending Upgrade: {pendingTier} Plan
            </p>
            <p className="text-blue-300 text-xs mt-2">
              Activation scheduled for {new Date(pendingActivationDate).toLocaleDateString()}. You cannot upgrade while a tier change is pending.
            </p>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-semibold mb-3">
            Choose a Plan
          </label>
          <div className="space-y-2">
            {Object.entries(PAYMENT_PLANS).map(([planName, plan]) => {
              const isCurrentPlan = planName === currentTier;
              const canPurchase = canPurchasePlan(planName);
              return (
                <label
                  key={planName}
                  className={`flex items-start p-3 border rounded-lg transition ${
                    !canPurchase
                      ? 'border-gray-500 bg-gray-600/50 cursor-not-allowed'
                      : selectedPlan === planName
                      ? 'border-purple-500 bg-purple-500/10 cursor-pointer'
                      : 'border-gray-600 hover:border-purple-500 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={planName}
                    checked={selectedPlan === planName}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-4 h-4 accent-purple-500 mt-1"
                    disabled={getButtonDisabledState(planName)}
                  />
                  <div className="ml-3 flex-1">
                    <p className={`font-semibold ${!canPurchase ? 'text-gray-400' : 'text-white'}`}>
                      {planName} Plan {isCurrentPlan && '(Current)'}
                    </p>
                    <p className={`text-sm ${!canPurchase ? 'text-gray-500' : 'text-gray-400'}`}>
                      ${(plan.amount / 100).toFixed(2)}/month • {plan.monthlyLimit} documents/mo
                    </p>
                    {isOnVolume && (
                      <p className="text-xs text-green-400 mt-1">✓ Highest tier</p>
                    )}
                  </div>
                </label>
              );
            })}
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

        {/* Payment Form or Status */}
        {successMessage ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-4xl mb-4">✓</div>
            <p className="text-white font-semibold mb-2">Payment Successful!</p>
            <p className="text-gray-400 text-sm">Your plan has been upgraded and Airtable has been updated.</p>
          </div>
        ) : isOnVolume ? (
          <div className="text-center py-8 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="text-green-400 text-4xl mb-4">✓</div>
            <p className="text-white font-semibold mb-2">Maximum Plan Reached</p>
            <p className="text-gray-400 text-sm">You're already on our highest tier. Enjoy your Volume plan!</p>
          </div>
        ) : hasPendingTier ? (
          <div className="text-center py-8 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="text-blue-400 text-4xl mb-4">⏳</div>
            <p className="text-white font-semibold mb-2">Pending Tier Activation</p>
            <p className="text-gray-400 text-sm mb-3">You have a tier change pending and cannot upgrade while it's active.</p>
            <p className="text-blue-300 text-xs">
              Your {pendingTier} plan will activate on {new Date(pendingActivationDate).toLocaleDateString()}
            </p>
          </div>
        ) : canProceed && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              userId={userId}
              userEmail={userEmail}
              selectedPlan={selectedPlan}
              onSuccess={handlePaymentSuccess}
              onCancel={() => onClose(false)}
              onError={handlePaymentError}
              currentTier={currentTier}
            />
          </Elements>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded-lg text-sm">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={createPaymentIntent}
              className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        ) : canProceed ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaymentModalEmbedded;
