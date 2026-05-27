import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, getPaymentBackendUrl, createPaymentIntentForPlan, processPaymentSuccess, PAYMENT_PLANS } from '../../services/paymentService';

/**
 * Inner form component that uses Stripe hooks
 */
const PaymentForm = ({ userId, selectedPlan, intentType, subscriptionId, setupIntentId, customerId, onSuccess, onCancel, onError, isDeferred, deferredActivationDate }) => {
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
      const plan = PAYMENT_PLANS[selectedPlan];
      if (!plan?.stripePriceId) {
        throw new Error(`Stripe price ID not found for ${selectedPlan}`);
      }

      let paymentIntentId = null;
      let paymentMethodId = null;
      let subscriptionData = {
        subscriptionId,
        status: 'active',
      };

      if (intentType === 'setup') {
        console.log('Confirming payment method setup...');

        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}?setup_success=true`,
          },
          redirect: 'if_required',
        });

        if (error) {
          setProcessError(error.message || 'Payment setup failed');
          setIsProcessing(false);
          onError?.(error);
          return;
        }

        if (setupIntent.status !== 'succeeded') {
          setProcessError(`Setup failed with status: ${setupIntent.status}`);
          setIsProcessing(false);
          return;
        }

        paymentMethodId = setupIntent.payment_method || null;
        console.log('Payment method confirmed');

        const confirmResponse = await fetch(`${getPaymentBackendUrl()}/api/confirm-subscription-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupIntentId,
            customerId,
            userId,
            planType: selectedPlan,
            priceId: plan.stripePriceId,
            isDeferred,
            activationDate: deferredActivationDate,
          }),
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          throw new Error(error.error || 'Failed to confirm subscription');
        }

        subscriptionData = await confirmResponse.json();
        console.log(`Subscription created: ${subscriptionData.subscriptionId}`);
      } else {
        if (!subscriptionId) {
          throw new Error('Subscription was not created by the payment setup.');
        }

        console.log('Confirming subscription payment...');

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

        if (paymentIntent && !['succeeded', 'processing'].includes(paymentIntent.status)) {
          setProcessError(`Payment ended with status: ${paymentIntent.status}`);
          setIsProcessing(false);
          return;
        }

        paymentIntentId = paymentIntent?.id || null;
        paymentMethodId = paymentIntent?.payment_method || null;
        subscriptionData.status = paymentIntent?.status === 'processing' ? 'processing' : 'active';
        console.log('Subscription payment confirmed');
      }

      if (!subscriptionData.subscriptionId) {
        throw new Error('Subscription ID was not returned by the backend.');
      }

      const result = await processPaymentSuccess(
        userId, 
        selectedPlan, 
        subscriptionData.subscriptionId,
        subscriptionData.status,
        paymentIntentId,
        paymentMethodId,
        isDeferred,
        deferredActivationDate
      );
      onSuccess?.(result);
    } catch (err) {
      console.error('Payment error:', err);
      setProcessError(err.message || 'Payment processing failed');
      setIsProcessing(false);
      onError?.(err);
    }
  };

  const plan = PAYMENT_PLANS[selectedPlan];
  const displayPrice = `$${(plan.amount / 100).toFixed(2)}`;
  const submitLabel = isDeferred ? 'Schedule Plan' : `Pay ${displayPrice}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-gray-900 font-semibold mb-2">Order Summary</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>{selectedPlan} Plan</span>
            <span className="text-gray-900 font-semibold">{displayPrice}/mo</span>
          </div>
          <div className="pt-2 border-t border-blue-200">
            <p className="text-xs text-gray-600 mt-2">
              ✓ {plan.monthlyLimit} documents/month
            </p>
            <p className="text-xs text-gray-600">
              ✓ Up to {plan.maxPages} pages per document
            </p>
          </div>
        </div>
      </div>

      {isDeferred && deferredActivationDate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          Your {selectedPlan} plan will activate on {new Date(deferredActivationDate).toLocaleDateString()}. Your card is saved now and charged on the activation date.
        </div>
      )}

      {/* Stripe Payment Element */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {processError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onCancel()}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-semibold transition"
        >
          {isProcessing ? 'Processing...' : submitLabel}
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
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
  const [subscriptionId, setSubscriptionId] = useState('');
  const [setupIntentId, setSetupIntentId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [intentType, setIntentType] = useState('payment');
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeferred, setIsDeferred] = useState(false);
  const [deferredActivationDate, setDeferredActivationDate] = useState(null);

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

  // Reset state when modal opens - use targetPlan as-is
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(targetPlan);
      setSuccessMessage('');
      setError('');
      setClientSecret('');
      setSubscriptionId('');
      setSetupIntentId('');
      setCustomerId('');
      setIntentType('payment');
      setIsDeferred(false);
      setDeferredActivationDate(null);
    }
  }, [isOpen, targetPlan]);

  // Initialize Stripe and create payment intent when plan changes
  useEffect(() => {
    if (isOpen && canProceed && !successMessage && !isOnVolume && !hasPendingTier && selectedPlan) {
      createPaymentIntent();
      initializeStripe();
    }
  }, [isOpen, selectedPlan]);

  const initializeStripe = async () => {
    try {
      const stripe = await getStripe();
      setStripePromise(stripe);
    } catch (err) {
      console.error('Failed to initialize Stripe:', err);
      setError(err.message || 'Failed to load payment form. Please refresh and try again.');
    }
  };

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      if (!userId || !userEmail) {
        throw new Error('User information not available');
      }

      const paymentData = await createPaymentIntentForPlan(selectedPlan, userEmail, userId);
      const nextIntentType = paymentData.intentType || (paymentData.setupIntentId ? 'setup' : 'payment');

      if (!paymentData.clientSecret) {
        throw new Error('Payment setup did not return a client secret.');
      }
      if (nextIntentType === 'payment' && !paymentData.subscriptionId) {
        throw new Error('Payment setup did not return a subscription ID.');
      }
      if (nextIntentType === 'setup' && (!paymentData.setupIntentId || !paymentData.customerId)) {
        throw new Error('Payment setup did not return setup details.');
      }

      setClientSecret(paymentData.clientSecret || '');
      setSubscriptionId(paymentData.subscriptionId || '');
      setSetupIntentId(paymentData.setupIntentId || '');
      setCustomerId(paymentData.customerId || '');
      setIntentType(nextIntentType);
      setIsDeferred(paymentData.isDeferred || false);
      setDeferredActivationDate(paymentData.activationDate || null);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-blue-200">
          <h2 className="text-2xl font-bold text-blue-700">Upgrade Your Plan</h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold">
            ✓ {successMessage}
          </div>
        )}

        {/* Volume Plan Message */}
        {isOnVolume && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm flex items-center font-semibold">
              <span className="mr-2">✓</span>
              You're on our highest tier! Enjoy your Volume plan.
            </p>
          </div>
        )}

        {/* Pending Tier Message */}
        {hasPendingTier && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm font-semibold">
              ⏳ Pending Upgrade: {pendingTier} Plan
            </p>
            <p className="text-blue-600 text-xs mt-2">
              Activation scheduled for {pendingActivationDate ? new Date(pendingActivationDate).toLocaleDateString() : 'pending'}. You cannot upgrade while a tier change is pending.
            </p>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-3">
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
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : selectedPlan === planName
                      ? 'border-blue-500 bg-blue-50 cursor-pointer'
                      : 'border-gray-200 hover:border-blue-400 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={planName}
                    checked={selectedPlan === planName}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-4 h-4 accent-blue-600 mt-1"
                    disabled={getButtonDisabledState(planName)}
                  />
                  <div className="ml-3 flex-1">
                    <p className={`font-semibold ${!canPurchase ? 'text-gray-500' : 'text-gray-900'}`}>
                      {planName} Plan {isCurrentPlan && '(Current)'}
                    </p>
                    <p className={`text-sm ${!canPurchase ? 'text-gray-500' : 'text-gray-600'}`}>
                      ${(plan.amount / 100).toFixed(2)}/month • {plan.monthlyLimit} documents/mo
                    </p>
                    {isOnVolume && (
                      <p className="text-xs text-blue-600 mt-1 font-semibold">✓ Highest tier</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-gray-900 font-semibold text-sm mb-3">Included:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center">
              <span className="text-blue-600 mr-2 font-bold">✓</span>
              {planDetails.monthlyLimit} documents/month
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2 font-bold">✓</span>
              Up to {planDetails.maxPages} pages per document
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2 font-bold">✓</span>
              {planDetails.retentionDays} days document retention
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2 font-bold">✓</span>
              Priority support
            </li>
          </ul>
        </div>

        {/* Payment Form or Status */}
        {successMessage ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-gray-900 font-semibold mb-2">Payment Successful!</p>
            <p className="text-gray-600 text-sm">
              {isDeferred 
                ? `Your ${selectedPlan} plan has been scheduled. It will activate on ${new Date(deferredActivationDate).toLocaleDateString()}.`
                : 'Your plan has been upgraded.'
              }
            </p>
          </div>
        ) : isOnVolume ? (
          <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-gray-900 font-semibold mb-2">Maximum Plan Reached</p>
            <p className="text-gray-600 text-sm">You're already on our highest tier. Enjoy your Volume plan!</p>
          </div>
        ) : hasPendingTier ? (
          <div className="text-center py-8 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-blue-600 text-4xl mb-4">⏳</div>
            <p className="text-gray-900 font-semibold mb-2">Pending Tier Activation</p>
            <p className="text-gray-600 text-sm mb-3">You have a tier change pending and cannot upgrade while it's active.</p>
            <p className="text-blue-600 text-xs font-semibold">
              Your {pendingTier} plan will activate on {pendingActivationDate ? new Date(pendingActivationDate).toLocaleDateString() : 'pending'}
            </p>
          </div>
        ) : canProceed && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              userId={userId}
              selectedPlan={selectedPlan}
              intentType={intentType}
              subscriptionId={subscriptionId}
              setupIntentId={setupIntentId}
              customerId={customerId}
              onSuccess={handlePaymentSuccess}
              onCancel={() => onClose(false)}
              onError={handlePaymentError}
              isDeferred={isDeferred}
              deferredActivationDate={deferredActivationDate}
            />
          </Elements>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => {
                createPaymentIntent();
                initializeStripe();
              }}
              className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        ) : canProceed ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaymentModalEmbedded;
