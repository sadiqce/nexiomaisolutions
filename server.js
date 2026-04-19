// Backend server for Stripe payment processing
// Handles creating payment intents and processing webhook events
// Install: npm install express cors dotenv stripe
// Run: node server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Create Payment Intent for plan upgrade or topup
 * POST /api/create-payment-intent
 */
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', description, userId, userEmail, metadata } = req.body;

    // Validate required fields
    if (!amount || !userId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, userId, userEmail' 
      });
    }

    if (amount < 50) {
      return res.status(400).json({ 
        error: 'Amount must be at least $0.50' 
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects cents
      currency,
      description,
      metadata: {
        userId,
        userEmail,
        ...(metadata || {})
      },
      statement_descriptor_suffix: 'NEXIOM AI',
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
  }
});

/**
 * Verify Payment Intent status
 * GET /api/payment-intent/:id
 */
app.get('/api/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to retrieve payment intent' 
    });
  }
});

/**
 * Create Payment Link for redirects (Stripe hosted checkout)
 * POST /api/create-payment-link
 */
app.post('/api/create-payment-link', async (req, res) => {
  try {
    const { amount, currency = 'usd', description, userId, userEmail, type, planTier, topupId, documents } = req.body;

    // Validate required fields
    if (!amount || !userId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, userId, userEmail' 
      });
    }

    if (amount < 50) {
      return res.status(400).json({ 
        error: 'Amount must be at least $0.50' 
      });
    }

    // Build metadata
    const metadata = {
      userId,
      userEmail,
      type: type || 'unknown'
    };

    if (type === 'plan' && planTier) {
      metadata.planTier = planTier;
    }
    if (type === 'topup' && topupId) {
      metadata.topupId = topupId;
      if (documents) metadata.documents = documents.toString();
    }

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: description,
              metadata: metadata,
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      metadata: metadata,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?payment_success=true`,
        },
      },
    });

    res.json({
      url: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment link' 
    });
  }
});

/**
 * Create Stripe Subscription for plan
 * POST /api/create-subscription
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { userId, userEmail, planTier, priceId, clientId } = req.body;

    // Validate required fields
    if (!userId || !userEmail || !planTier || !priceId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, userEmail, planTier, priceId' 
      });
    }

    // First, get or create a customer in Stripe
    // Look for existing customer with this email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId,
          planTier,
        },
      });
      customerId = customer.id;
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      metadata: {
        userId,
        planTier,
        clientId: clientId || '', // Optional client ID
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
      status: subscription.status,
      customerId,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create subscription' 
    });
  }
});

/**
 * Cancel Stripe Subscription
 * POST /api/cancel-subscription
 */
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // Validate required fields
    if (!subscriptionId) {
      return res.status(400).json({ 
        error: 'Missing required field: subscriptionId' 
      });
    }

    // Cancel the subscription
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true, // Let the subscription continue until the end of the billing period
    });

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel subscription' 
    });
  }
});

/**
 * Webhook endpoint for Stripe events
 * POST /api/webhooks/stripe
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Webhook secret not configured - skipping verification');
    return res.json({ received: true });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error(`Webhook signature verification failed:`, error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle specific event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object.metadata);
      // Here you would update your database with payment success
      // For now, the frontend handles Airtable updates
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object.metadata);
      // Handle payment failure
      break;

    case 'charge.refunded':
      console.log('Charge refunded:', event.data.object.metadata);
      // Handle refund
      break;

    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object.metadata);
      break;

    case 'customer.subscription.deleted':
      console.log('Subscription deleted:', event.data.object.metadata);
      break;

    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object.metadata);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt
  res.json({ received: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment server running on http://localhost:${PORT}`);
  console.log(`Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});
