// Payment Service for Stripe Integration - Embedded Checkout
// Uses Stripe Payment Element for embedded checkout (no page redirect)
// Requires backend server to create payment intents

import { getUser, updateUserSubscription } from './airtableService';
import { loadStripe } from '@stripe/stripe-js';

// Get Stripe configuration from environment
const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
};

let stripePromise = null;

/**
 * Get Stripe instance (lazy load)
 * @returns {Promise<Stripe>} Stripe instance
 */
export const getStripe = async () => {
  if (!stripePromise && STRIPE_CONFIG.publishableKey) {
    stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);
  }
  return stripePromise;
};

/**
 * Check and activate pending tier if activation date is reached
 * This is called server-side via backend endpoint to ensure activation
 * happens even if user doesn't log in to the portal
 * @param {string} userId - User ID
 * @returns {Promise<object>} Status of pending activation check
 */
export const checkAndActivatePendingTier = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/check-pending-activation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn(`⚠ Check pending activation failed: ${error.error}`);
      return { activated: false, error: error.error };
    }

    const result = await response.json();
    
    if (result.activated) {
      console.log(`✓ Pending tier activated: ${result.newTier}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error checking pending activation:', error);
    return { activated: false, error: error.message };
  }
};

/**
 * Retry helper function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delayMs - Initial delay in milliseconds (default: 1000)
 * @returns {Promise<any>} Result of the function
 */
const retryWithBackoff = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(
          `Attempt ${attempt} failed: ${error.message}. ` +
          `Retrying in ${delay}ms... (${maxRetries - attempt} retries left)`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries exhausted
  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Create Stripe Subscription for a plan
 * @param {string} planTier - Plan tier (Standard, Volume)
 * @param {string} userEmail - User email
 * @param {string} userId - User ID (client ID)
 * @param {string} stripePriceId - Stripe price ID for the plan
 * @param {string} paymentMethodId - Payment method ID (optional, from confirmed payment intent)
 * @param {Date} activationDate - For deferred billing, when to activate the subscription (optional)
 * @returns {Promise<object>} Subscription details with client secret if needed
 */
export const createStripeSubscription = async (planTier, userEmail, userId, stripePriceId, paymentMethodId = null, activationDate = null) => {
  return retryWithBackoff(async () => {
    if (!userId || !userEmail || !stripePriceId) {
      throw new Error('User ID, email, and Stripe price ID are required');
    }

    const isDeferred = activationDate !== null;
    const activationDateString = activationDate ? new Date(activationDate).toISOString() : null;

    // Call backend to create subscription
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userEmail,
        planTier,
        priceId: stripePriceId,
        clientId: userId, // Pass client ID for metadata
        paymentMethodId, // Pass payment method from confirmed payment intent
        activationDate: activationDateString, // For deferred billing
        isDeferred, // Flag to enable deferred billing
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create subscription');
    }

    return await response.json();
  }, 3, 1000); // 3 retries with 1s initial delay, exponentially backing off
};

/**
 * Cancel Stripe Subscription with retry
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>} Cancellation result
 */
export const cancelStripeSubscription = async (subscriptionId) => {
  return retryWithBackoff(async () => {
    if (!subscriptionId) {
      console.error('cancelStripeSubscription: subscriptionId is required');
      throw new Error('Subscription ID is required');
    }

    console.log(`Calling backend to cancel subscription ${subscriptionId}...`);
    
    // Call backend to cancel subscription
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Backend error: ${error.error}`);
      throw new Error(error.error || 'Failed to cancel subscription');
    }

    const result = await response.json();
    console.log(`✓ Backend cancelled subscription: ${result.status}`);
    return result;
  }, 3, 1000); // 3 retries with 1s initial delay, exponentially backing off
};

/**
 * Finalize subscription after payment succeeds
 * This applies the successful payment to the subscription's invoice
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<object>} Finalization result
 */
export const finalizeSubscription = async (subscriptionId, paymentIntentId) => {
  try {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    console.log(`Finalizing subscription ${subscriptionId} with payment intent ${paymentIntentId}`);

    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/finalize-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        paymentIntentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Failed to finalize subscription: ${error.error}`);
      throw new Error(error.error || 'Failed to finalize subscription');
    }

    const result = await response.json();
    console.log(`✓ Subscription finalized:`, result);
    return result;
  } catch (error) {
    console.error('Error finalizing subscription:', error);
    throw error;
  }
};

/**
 * Attach payment method to subscription
 * This changes subscription status from 'incomplete' to 'active' after payment succeeds
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} paymentMethodId - Payment method ID from confirmed payment intent
 * @returns {Promise<object>} Result with updated subscription status
 */
export const attachPaymentMethodToSubscription = async (subscriptionId, paymentMethodId) => {
  try {
    if (!subscriptionId || !paymentMethodId) {
      throw new Error('Subscription ID and payment method ID are required');
    }

    console.log(`Attaching payment method ${paymentMethodId} to subscription ${subscriptionId}...`);

    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/attach-payment-method-to-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        paymentMethodId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Failed to attach payment method: ${error.error}`);
      throw new Error(error.error || 'Failed to attach payment method');
    }

    const result = await response.json();
    console.log(`✓ Payment method attached. Subscription status: ${result.status}`);
    return result;
  } catch (error) {
    console.error('Error attaching payment method to subscription:', error);
    throw error;
  }
};

// Plan pricing configuration
export const PAYMENT_PLANS = {
  Standard: {
    name: 'Standard',
    amount: 4900, // $49.00 in cents
    currency: 'usd',
    interval: 'month',
    monthlyLimit: 100,
    maxFileSize: 10 * 1024 * 1024,
    maxPages: 10,
    retentionDays: 7,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STANDARD || '', // Stripe price ID from env
  },
  Volume: {
    name: 'Volume',
    amount: 14900, // $149.00 in cents
    currency: 'usd',
    interval: 'month',
    monthlyLimit: 500,
    maxFileSize: 25 * 1024 * 1024,
    maxPages: 25,
    retentionDays: 14,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_VOLUME || '', // Stripe price ID from env
  },
};

export const TOPUP_PACKS = {
  'topup-50': {
    label: '50 documents',
    amount: 2000, // $20.00 in cents
    documents: 50,
  },
  'topup-100': {
    label: '100 documents',
    amount: 3500, // $35.00 in cents
    documents: 100,
  },
  'topup-250': {
    label: '250 documents',
    amount: 8000, // $80.00 in cents
    documents: 250,
  },
};

/**
 * Prepare for plan upgrade payment
 * This creates the subscription first and returns its payment intent's client secret
 * The frontend uses this client_secret with stripe.confirmPayment()
 * 
 * For PAID users upgrading: Uses deferred billing (charges at end of current billing cycle)
 * For FREE users upgrading: Charges immediately
 * 
 * @param {string} planTier - Plan tier (Standard, Volume)
 * @param {string} userEmail - User email
 * @param {string} userId - User ID
 * @returns {Promise<object>} Subscription details with client secret for payment
 */
export const createPaymentIntentForPlan = async (planTier, userEmail, userId) => {
  try {
    if (!userId || !userEmail || !planTier) {
      throw new Error('User ID, email, and plan tier are required');
    }

    const plan = PAYMENT_PLANS[planTier];
    if (!plan) throw new Error('Invalid plan tier');
    
    if (!plan.stripePriceId) {
      throw new Error(`Stripe price ID not configured for ${planTier} plan. Set VITE_STRIPE_PRICE_${planTier.toUpperCase()} in .env`);
    }

    console.log(`Creating subscription for ${planTier} plan (userId: ${userId})`);

    // Determine if this should be deferred billing
    // Get current user tier to check if they're a paid user
    let isDeferred = false;
    let activationDate = null;
    
    try {
      const user = await getUser(userId);
      const currentTier = user?.Tier || 'Sandbox';
      const isUpgradingFromPaid = currentTier === 'Standard' || currentTier === 'Volume';
      
      if (isUpgradingFromPaid) {
        // Calculate billing end date
        activationDate = getBillingEndDate(user?.LastPaymentDate, user?.SubscriptionEndDate);
        isDeferred = true;
        console.log(`✓ Deferred billing detected. Subscription will charge on ${activationDate.toISOString()}`);
      }
    } catch (userFetchError) {
      console.warn(`⚠ Could not fetch user tier, proceeding without deferred billing: ${userFetchError.message}`);
    }

    // Call backend to create subscription
    // Backend will return the subscription with its payment_intent's client_secret
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userEmail,
        planTier,
        priceId: plan.stripePriceId,
        clientId: userId,
        activationDate: activationDate ? activationDate.toISOString() : null,
        isDeferred,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to prepare payment');
    }

    const result = await response.json();
    console.log(`✓ Subscription created: ${result.subscriptionId}`);
    
    if (isDeferred) {
      console.log(`✓ Deferred subscription: No immediate payment required. Charges on ${activationDate?.toLocaleDateString()}`);
    } else {
      console.log(`✓ Client secret ready for payment confirmation`);
    }
    
    return result; // Contains: clientSecret (if immediate), subscriptionId, status, isDeferred, etc.
  } catch (error) {
    console.error('Error preparing payment:', error);
    throw error;
  }
};

/**
 * Create Payment Intent for topup
 * @param {string} topupId - Top-up pack ID
 * @param {string} userEmail - User email
 * @param {string} userId - User ID
 * @returns {Promise<object>} Payment intent with client secret
 */
export const createPaymentIntentForTopup = async (topupId, userEmail, userId) => {
  try {
    if (!userId || !userEmail || !topupId) {
      throw new Error('User ID, email, and top-up ID are required');
    }

    const topup = TOPUP_PACKS[topupId];
    if (!topup) throw new Error('Invalid top-up pack');

    // Call backend to create payment intent
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: topup.amount,
        currency: 'usd',
        description: `Document Top-up - ${topup.label}`,
        userId,
        userEmail,
        metadata: {
          type: 'topup',
          topupId,
          documents: topup.documents,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating topup payment intent:', error);
    throw error;
  }
};

/**
 * Helper function to add days to a date
 */
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Calculate billing end date
 */
const getBillingEndDate = (lastPaymentDate, explicitEndDate) => {
  if (explicitEndDate) {
    return new Date(explicitEndDate);
  }
  if (!lastPaymentDate) {
    return null;
  }
  const date = new Date(lastPaymentDate);
  return addDays(date, 30);
};

/**
 * Process successful payment for plan upgrade
 * At this point, the subscription is already created by createPaymentIntentForPlan()
 * This function just needs to update Airtable with the subscription details
 * 
 * @param {string} userId - User ID
 * @param {string} planTier - Plan tier (Standard, Volume)
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} subscriptionStatus - Stripe subscription status (should be 'active')
 */
export const processPaymentSuccess = async (userId, planTier, subscriptionId, subscriptionStatus, paymentIntentId = null, paymentMethodId = null) => {
  try {
    if (!userId || !planTier || !subscriptionId) {
      throw new Error('User ID, plan tier, and subscription ID are required');
    }

    console.log(`Processing payment success for user ${userId}, subscription ${subscriptionId}`);

    // Attach payment method to subscription if provided
    // This changes the subscription status from 'incomplete' to 'active'
    if (paymentMethodId) {
      try {
        console.log(`Attaching payment method to subscription...`);
        const attachResult = await attachPaymentMethodToSubscription(subscriptionId, paymentMethodId);
        console.log(`✓ Payment method attached. Subscription status: ${attachResult.status}`);
      } catch (attachError) {
        console.error(`⚠ Failed to attach payment method: ${attachError.message}`);
        // Continue anyway - payment succeeded, we'll still update Airtable
      }
    }

    // Finalize the subscription to mark it as active
    // This applies the successful payment to the subscription's invoice
    if (paymentIntentId) {
      try {
        console.log(`Finalizing subscription in Stripe...`);
        const finalizeResult = await finalizeSubscription(subscriptionId, paymentIntentId);
        console.log(`Finalization result:`, finalizeResult);
      } catch (finalizeError) {
        console.error(`⚠ Failed to finalize subscription: ${finalizeError.message}`);
        // Continue anyway - payment succeeded, we'll still update Airtable
      }
    }

    const user = await getUser(userId);
    const now = new Date();
    const currentTier = user?.Tier || 'Sandbox';
    const isUpgradingFromFree = currentTier === 'Sandbox' || currentTier === 'Free';
    const isUpgradingFromPaid = currentTier === 'Standard' || currentTier === 'Volume';

    // Case 1: Free user upgrading to paid plan → Activate IMMEDIATELY
    if (isUpgradingFromFree) {
      console.log(`✓ Free user upgrading to ${planTier}. Activating immediately.`);
      
      const subscriptionData = {
        autoRenewal: true,
        subscriptionTier: planTier,
        subscriptionStatus: 'active',
        lastPaymentDate: now.toISOString(),
        subscriptionEndDate: addDays(now, 30).toISOString(),
        pendingTier: null,
        pendingActivationDate: null,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: subscriptionStatus || 'active',
      };

      await updateUserSubscription(userId, subscriptionData);
      console.log(`✓ Updated Airtable for active ${planTier} subscription`);

      return {
        success: true,
        message: `Successfully activated ${planTier} plan!`,
      };
    }

    // Case 2: Paid user upgrading to another paid plan → DEFER
    if (isUpgradingFromPaid) {
      const billingEndDate = getBillingEndDate(user?.LastPaymentDate, user?.SubscriptionEndDate);
      
      console.log(`✓ Paid user upgrading from ${currentTier} to ${planTier}. Deferring to ${billingEndDate.toISOString()}`);
      console.log(`Current subscription ID: ${user?.StripeSubscriptionId}`);
      console.log(`Pending subscription ID: ${subscriptionId}`);
      
      // Do NOT cancel the old Stripe subscription yet
      // Keep it active so user continues with current plan during trial period
      // Do NOT overwrite StripeSubscriptionId - keep the current subscription ID
      // Store pending subscription metadata on the backend side
      console.log(`✓ Keeping both subscriptions - current active, pending in trial until activation`);

      // Prepare subscription data for the PENDING (future) tier
      // NOTE: We do NOT update stripeSubscriptionId here - we keep the current active subscription ID
      // The backend will track which subscription is which via Stripe's metadata
      const subscriptionData = {
        autoRenewal: true,
        subscriptionStatus: 'active', // Current status stays active
        pendingTier: planTier,
        pendingActivationDate: billingEndDate.toISOString(),
        stripeSubscriptionStatus: subscriptionStatus || 'active',
        // stripeSubscriptionId remains unchanged (still points to current active subscription)
      };

      await updateUserSubscription(userId, subscriptionData);
      console.log(`✓ Updated Airtable with pending tier`);

      const daysLeft = Math.max(0, Math.ceil((billingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const daysText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;

      return {
        success: true,
        message: `Your ${planTier} plan is scheduled to activate in ${daysText}, on ${billingEndDate.toLocaleDateString()}. Your current plan remains active until then.`,
      };
    }

    throw new Error(`Unable to determine upgrade type for tier ${currentTier} to ${planTier}`);

  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
};

export const activateScheduledPlan = async (userId, user) => {
  if (!user || !user.PendingTier || !user.PendingActivationDate) {
    return null;
  }

  const now = new Date();
  const activationDate = new Date(user.PendingActivationDate);
  if (activationDate > now) {
    return null;
  }

  console.log(`✓ Activating scheduled plan for user ${userId}: ${user.PendingTier}`);

  try {
    // Cancel the old subscription (current active plan) if it still exists
    // The trial subscription should be transitioning to active automatically
    if (user.StripeSubscriptionId) {
      try {
        console.log(`Attempting to cancel old subscription ${user.StripeSubscriptionId} at activation`);
        await cancelStripeSubscription(user.StripeSubscriptionId);
        console.log(`✓ Cancelled old subscription at activation`);
      } catch (cancelError) {
        console.warn(`⚠ Warning: Could not cancel old subscription: ${cancelError.message}`);
        // Continue anyway - the important thing is updating Airtable
      }
    }

    // Call backend to find the trial subscription and mark it as the new active subscription in Airtable
    // Note: Stripe automatically transitions the trial subscription to 'active' when trial_end is reached
    const { getUser: getUpdatedUser } = await import('./airtableService');
    const updatedUser = await getUpdatedUser(userId);

    // Move pending tier to active tier
    const subscriptionData = {
      subscriptionTier: user.PendingTier,
      lastPaymentDate: now.toISOString(),
      subscriptionEndDate: addDays(now, 30).toISOString(),
      autoRenewal: true,
      pendingTier: null,
      pendingActivationDate: null,
      // stripeSubscriptionId remains the same - Stripe auto-activated the trial subscription
      // so it's now the active subscription for this customer
    };

    console.log(`Updating Airtable to activate ${user.PendingTier} plan`);
    return await updateUserSubscription(userId, subscriptionData);
  } catch (error) {
    console.error(`Error activating scheduled plan for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Process a successful top-up payment
 * Adds documents to user's account in Airtable
 * @param {string} userId - User ID
 * @param {string} topupId - Top-up pack ID
 */
export const processTopupSuccess = async (userId, topupId) => {
  try {
    const topup = TOPUP_PACKS[topupId];
    if (!topup) throw new Error('Invalid top-up pack');

    // Update top-up credits in Airtable
    await updateUserSubscription(userId, {
      topupCreditsAdded: topup.documents,
      lastTopupDate: new Date().toISOString(),
    });

    return { 
      success: true, 
      message: `Added ${topup.documents} documents to your account!` 
    };
  } catch (error) {
    console.error('Error processing top-up success:', error);
    throw error;
  }
};

/**
 * Get payment status for a user (from Airtable)
 * @param {string} userId - User ID
 * @returns {Promise<object>} User subscription info
 */
export const getUserPaymentStatus = async (userId) => {
  try {
    const { getUser } = await import('./airtableService');
    const user = await getUser(userId);
    return user ? {
      tier: user.Tier,
      subscriptionStatus: user.SubscriptionStatus || 'inactive',
      lastPaymentDate: user.LastPaymentDate,
      autoRenewal: user.AutoRenewal,
      topupCredits: user.TopUpCredits || 0,
    } : null;
  } catch (error) {
    console.error('Error fetching payment status:', error);
    throw error;
  }
};

/**
 * Cancel a user's subscription
 * Handles three cases:
 * 1. Pending upgrade (trial): Cancel the pending subscription, keep current tier active
 * 2. Active subscription: Cancel it and move user to Sandbox
 * 3. No active subscription: Return error
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object>} Cancellation result
 */
export const cancelSubscription = async (userId) => {
  try {
    const { getUser, updateUserSubscription } = await import('./airtableService');
    
    console.log(`Cancelling subscription for user ${userId}`);
    
    // Get user from Airtable
    const user = await getUser(userId);
    
    if (!user) {
      console.error(`User ${userId} not found in Airtable`);
      throw new Error('User not found');
    }

    console.log(`User tier: ${user.Tier}, subscription status: ${user.SubscriptionStatus}, pending tier: ${user.PendingTier}`);

    // Check if user has a PENDING upgrade (trial subscription)
    const hasPendingUpgrade = !!user.PendingTier && !!user.PendingActivationDate;
    
    if (hasPendingUpgrade) {
      // Case 1: Cancel pending upgrade - keep current subscription active
      console.log(`✓ User has pending upgrade to ${user.PendingTier}. Cancelling pending subscription only.`);
      
      if (!user.StripeSubscriptionId) {
        console.error(`User has pending tier but no current StripeSubscriptionId`);
        throw new Error('Current subscription not found');
      }

      // Call backend to find and cancel the pending subscription (the trial one)
      // The backend will look for subscriptions associated with this customer and pending tier
      const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/cancel-pending-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail: user.Email,
          currentSubscriptionId: user.StripeSubscriptionId,
          pendingTier: user.PendingTier,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel pending subscription');
      }

      const cancelResult = await response.json();
      console.log(`✓ Successfully cancelled pending subscription: ${cancelResult.status}`);

      // Update Airtable: Clear pending tier, keep current tier and subscription active
      const subscriptionData = {
        pendingTier: null,
        pendingActivationDate: null,
        stripeSubscriptionStatus: cancelResult.status,
        // Keep current subscription status as 'active'
      };

      console.log(`Updating Airtable to clear pending upgrade for user ${userId}`);
      await updateUserSubscription(userId, subscriptionData);
      console.log(`✓ Updated Airtable with cleared pending tier`);

      return {
        success: true,
        message: `Your upgrade to ${user.PendingTier} has been cancelled. Your ${user.Tier} plan remains active.`,
      };
    }

    // Case 2: Cancel active subscription (no pending upgrade)
    if (!user.SubscriptionStatus || user.SubscriptionStatus !== 'active') {
      console.error(`User ${userId} does not have active subscription. Current status: ${user.SubscriptionStatus}`);
      throw new Error('User does not have an active subscription');
    }

    if (!user.StripeSubscriptionId) {
      console.error(`User ${userId} has no StripeSubscriptionId stored`);
      throw new Error('No Stripe subscription found for this user');
    }

    // Cancel active Stripe subscription FIRST with retry logic
    console.log(`Cancelling active Stripe subscription ${user.StripeSubscriptionId} for user ${userId}`);
    const cancelResult = await cancelStripeSubscription(user.StripeSubscriptionId);
    console.log(`✓ Successfully cancelled Stripe subscription ${user.StripeSubscriptionId}: ${cancelResult.status}`);

    // Only update Airtable AFTER Stripe cancellation succeeds
    const billingEndDate = getBillingEndDate(user.LastPaymentDate, user.SubscriptionEndDate);
    const subscriptionData = {
      subscriptionStatus: 'inactive',
      subscriptionTier: 'Sandbox', // Move to Sandbox
      autoRenewal: false,
      stripeSubscriptionStatus: cancelResult.status,
      pendingTier: null,
      pendingActivationDate: null,
    };

    if (billingEndDate) {
      subscriptionData.subscriptionEndDate = billingEndDate.toISOString();
    }

    console.log(`Updating Airtable for user ${userId} with subscription data:`, subscriptionData);
    await updateUserSubscription(userId, subscriptionData);
    console.log(`✓ Updated Airtable with cancellation status for user ${userId}`);

    return {
      success: true,
      message: 'Your subscription has been cancelled. Your plan remains active until the end of your billing period.',
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error.message);
    console.error(`⚠ Airtable was NOT updated for user ${userId} due to error`);
    throw error;
  }
};

/**
 * Redirect to Stripe Payment Link for plan upgrade
 * @param {string} planTier - Plan tier (Standard, Volume)
 * @param {string} userEmail - User email
 * @param {string} userId - User ID
 */
export const redirectToCheckout = async (planTier, userEmail, userId) => {
  try {
    if (!userId || !userEmail || !planTier) {
      throw new Error('User ID, email, and plan tier are required');
    }

    const plan = PAYMENT_PLANS[planTier];
    if (!plan) throw new Error('Invalid plan tier');

    // Call backend to create/get payment link
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: plan.currency,
        description: `${planTier} Plan - Monthly Subscription`,
        userId,
        userEmail,
        type: 'plan',
        planTier,
        interval: plan.interval,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment link');
    }

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No payment link URL returned');
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
};

/**
 * Redirect to Stripe Payment Link for topup
 * @param {string} topupId - Top-up pack ID
 * @param {string} userEmail - User email
 * @param {string} userId - User ID
 */
export const redirectToTopupCheckout = async (topupId, userEmail, userId) => {
  try {
    if (!userId || !userEmail || !topupId) {
      throw new Error('User ID, email, and top-up ID are required');
    }

    const topup = TOPUP_PACKS[topupId];
    if (!topup) throw new Error('Invalid top-up pack');

    // Call backend to create/get payment link
    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: topup.amount,
        currency: 'usd',
        description: `Document Top-up - ${topup.label}`,
        userId,
        userEmail,
        type: 'topup',
        topupId,
        documents: topup.documents,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment link');
    }

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No payment link URL returned');
    }
  } catch (error) {
    console.error('Error redirecting to topup checkout:', error);
    throw error;
  }
};

