// Backend server for Stripe payments, AWS S3, Airtable contact submissions, and Firebase Firestore
// Handles: Stripe payment intents & subscriptions, S3 signed URLs for file upload/download, Contact form submissions to Airtable
// Data operations (users, files) are handled directly by frontend using Firestore
// Install: npm install express cors dotenv stripe firebase-admin @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// Run: node server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
      console.warn('[FIREBASE] Credentials not fully configured');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
      console.log('[FIREBASE] Admin SDK initialized');
      console.log(`[FIREBASE] Project ID: ${firebaseConfig.projectId}`);
      console.log(`[FIREBASE] Client Email: ${firebaseConfig.clientEmail}`);
      console.log(`[FIREBASE] Private Key Length: ${firebaseConfig.privateKey?.length || 0} chars`);
    }
  } catch (error) {
    console.error('[FIREBASE] Initialization error:', error.message);
  }
}

const db = admin.firestore();

// Validate required environment variables
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'VITE_AWS_ACCESS_KEY_ID', 'VITE_AWS_SECRET_ACCESS_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('[ERROR] Missing required environment variables:', missingVars);
  console.error('Server will start but some endpoints will fail');
}

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const PORT = process.env.PORT || 3001;

// Determine allowed origins (support both dev and production)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://nexiomaisolutions.com',
  'https://www.nexiomaisolutions.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(null, true); // Allow anyway to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));
app.use(express.json());

// AWS S3 Configuration
const S3_CONFIG = {
  bucketName: 'certificate-bot-vault-v1',
  region: 'us-east-2',
  accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
};

const s3Client = new S3Client({
  region: S3_CONFIG.region,
  credentials: {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  },
});

const getSubscriptionPaymentIntent = async (subscription) => {
  let invoice = typeof subscription.latest_invoice === 'string'
    ? await stripe.invoices.retrieve(subscription.latest_invoice, { expand: ['confirmation_secret', 'payment_intent'] })
    : subscription.latest_invoice;

  if (invoice?.id && !invoice.confirmation_secret && !invoice.payment_intent) {
    invoice = await stripe.invoices.retrieve(invoice.id, { expand: ['confirmation_secret', 'payment_intent'] });
  }

  const paymentIntent = typeof invoice?.payment_intent === 'string'
    ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
    : invoice?.payment_intent;

  return { invoice, paymentIntent };
};

const buildSubscriptionPaymentResponse = async (subscription, customerId, message = 'Ready for subscription payment') => {
  const { invoice, paymentIntent } = await getSubscriptionPaymentIntent(subscription);
  const confirmationSecret = invoice?.confirmation_secret?.client_secret || null;

  if (confirmationSecret || paymentIntent?.client_secret) {
    return {
      success: true,
      intentType: 'payment',
      clientSecret: confirmationSecret || paymentIntent.client_secret,
      paymentIntentId: paymentIntent?.id || null,
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      invoiceStatus: invoice?.status || null,
      message,
    };
  }

  if (['active', 'trialing'].includes(subscription.status) || invoice?.status === 'paid') {
    return {
      success: true,
      intentType: 'complete',
      clientSecret: null,
      paymentIntentId: paymentIntent?.id || null,
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      invoiceStatus: invoice?.status || null,
      message: 'Subscription is already active',
    };
  }

  throw new Error(
    `Stripe did not return a payment client secret for this subscription. ` +
    `Subscription status: ${subscription.status}; invoice status: ${invoice?.status || 'none'}; ` +
    `payment intent status: ${paymentIntent?.status || 'none'}; ` +
    `confirmation secret: ${confirmationSecret ? 'present' : 'none'}`
  );
};

// ===== HEALTH & ROOT ENDPOINTS =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Nexiom AI Backend API', version: '1.0.0', status: 'running' });
});

// ===== SUBSCRIPTION MANAGEMENT ENDPOINTS (used by payment operations) =====

/**
 * PATCH /api/user/:uid/tier - Update user tier
 */
app.patch('/api/user/:uid/tier', async (req, res) => {
  try {
    const { uid } = req.params;
    const { newTier } = req.body;
    
    if (!newTier) {
      return res.status(400).json({ error: 'Missing required field: newTier' });
    }

    const updateData = {
      Tier: newTier,
      TierUpdatedDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).update(updateData);
    const updated = await db.collection('users').doc(uid).get();
    res.json(updated.data());
  } catch (error) {
    console.error('Error updating tier:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/user/:uid/subscription - Update user subscription
 */
app.patch('/api/user/:uid/subscription', async (req, res) => {
  try {
    const { uid } = req.params;
    const subscriptionData = req.body;
    
    const updateData = {
      UpdatedAt: new Date().toISOString()
    };
    
    // Map fields - handles both camelCase (from backend) and PascalCase (from frontend)
    if (subscriptionData.subscriptionTier || subscriptionData.Tier) {
      updateData.Tier = subscriptionData.subscriptionTier || subscriptionData.Tier;
    }
    if (subscriptionData.subscriptionStatus !== undefined || subscriptionData.SubscriptionStatus !== undefined) {
      updateData.SubscriptionStatus = subscriptionData.subscriptionStatus || subscriptionData.SubscriptionStatus;
    }
    if ('pendingTier' in subscriptionData || 'PendingTier' in subscriptionData) {
      updateData.PendingTier = subscriptionData.pendingTier !== undefined ? subscriptionData.pendingTier : subscriptionData.PendingTier;
    }
    if ('pendingActivationDate' in subscriptionData || 'PendingActivationDate' in subscriptionData) {
      updateData.PendingActivationDate = subscriptionData.pendingActivationDate !== undefined ? subscriptionData.pendingActivationDate : subscriptionData.PendingActivationDate;
    }
    if (subscriptionData.lastPaymentDate || subscriptionData.LastPaymentDate) {
      updateData.LastPaymentDate = subscriptionData.lastPaymentDate || subscriptionData.LastPaymentDate;
    }
    if (subscriptionData.subscriptionEndDate || subscriptionData.SubscriptionEndDate) {
      updateData.SubscriptionEndDate = subscriptionData.subscriptionEndDate || subscriptionData.SubscriptionEndDate;
    }
    if (subscriptionData.subscriptionStartDate || subscriptionData.SubscriptionStartDate) {
      updateData.SubscriptionStartDate = subscriptionData.subscriptionStartDate || subscriptionData.SubscriptionStartDate;
    }
    if (subscriptionData.stripeSubscriptionId || subscriptionData.StripeSubscriptionId) {
      updateData.StripeSubscriptionId = subscriptionData.stripeSubscriptionId || subscriptionData.StripeSubscriptionId;
    }
    if (subscriptionData.stripeSubscriptionStatus || subscriptionData.StripeSubscriptionStatus) {
      updateData.StripeSubscriptionStatus = subscriptionData.stripeSubscriptionStatus || subscriptionData.StripeSubscriptionStatus;
    }
    if (subscriptionData.autoRenewal !== undefined || subscriptionData.AutoRenewal !== undefined) {
      updateData.AutoRenewal = subscriptionData.autoRenewal !== undefined ? subscriptionData.autoRenewal : subscriptionData.AutoRenewal;
    }
    if (subscriptionData.topupCreditsAdded || subscriptionData.TopUpCredits) {
      updateData.TopUpCredits = subscriptionData.topupCreditsAdded || subscriptionData.TopUpCredits;
    }
    if (subscriptionData.lastTopupDate || subscriptionData.LastTopupDate) {
      updateData.LastTopupDate = subscriptionData.lastTopupDate || subscriptionData.LastTopupDate;
    }

    await db.collection('users').doc(uid).update(updateData);
    const updated = await db.collection('users').doc(uid).get();
    res.json(updated.data());
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/check-pending-activation - Check and activate pending tier
 */
app.post('/api/check-pending-activation', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();

    // Check if user has a pending tier
    if (!user.PendingTier || !user.PendingActivationDate) {
      return res.json({ 
        activated: false, 
        message: 'No pending tier scheduled' 
      });
    }

    // Check if activation date has been reached
    const now = new Date();
    const activationDate = new Date(user.PendingActivationDate);
    
    if (activationDate > now) {
      const daysLeft = Math.ceil((activationDate - now) / (1000 * 60 * 60 * 24));
      return res.json({ 
        activated: false, 
        message: `Pending tier activation scheduled in ${daysLeft} days`,
        daysRemaining: daysLeft
      });
    }

    // Activation date reached! Update user tier
    await db.collection('users').doc(userId).update({
      Tier: user.PendingTier,
      SubscriptionStatus: 'active',
      PendingTier: null,
      PendingActivationDate: null,
      TierActivatedDate: now.toISOString(),
      UpdatedAt: now.toISOString()
    });

    const updated = await db.collection('users').doc(userId).get();

    return res.json({
      activated: true,
      message: `Tier upgraded to ${user.PendingTier}`,
      user: updated.data()
    });
  } catch (error) {
    console.error('Error checking pending activation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FILE UPLOAD/DOWNLOAD ENDPOINTS (S3 operations) =====



/**
 * POST /api/file/upload-url - Get signed URL for file upload
 */
app.post('/api/file/upload-url', async (req, res) => {
  try {
    const { userId, fileName } = req.body;
    
    if (!userId || !fileName) {
      return res.status(400).json({ error: 'Missing required fields: userId, fileName' });
    }

    const fileKey = `clients/${userId}/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucketName,
      Key: fileKey,
      ContentType: 'application/octet-stream',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      uploadUrl: signedUrl,
      fileKey: fileKey,
      bucket: S3_CONFIG.bucketName,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/file/download-url/:fileKey - Get signed URL for file download
 */
app.get('/api/file/download-url/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const decodedKey = decodeURIComponent(fileKey);
    
    const command = new GetObjectCommand({
      Bucket: S3_CONFIG.bucketName,
      Key: decodedKey,
    });

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ url: signedUrl });
    } catch {
      console.error(`File not found: ${decodedKey}`);
      return res.status(404).json({ 
        error: 'File not found in S3',
        requestedKey: decodedKey
      });
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== STRIPE PAYMENT ENDPOINTS =====

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
    const { amount, currency = 'usd', description, userId, userEmail, type, planTier, topupId, documents, interval = 'month' } = req.body;

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

    const priceData = {
      currency,
      product_data: {
        name: description || 'Nexiom AI Service',
      },
      unit_amount: Math.round(amount),
    };

    if (type === 'plan') {
      priceData.recurring = { interval };
    }

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      metadata,
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
 * Create or update a subscription
 * POST /api/create-subscription
 * This creates a SetupIntent for payment method collection and returns the client secret
 * Database is NOT updated at this stage - only after payment succeeds
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { userId, planType, userEmail, priceId, isDeferred = false, activationDate = null } = req.body;

    if (!userId || !planType || !userEmail || !priceId) {
      return res.status(400).json({ error: 'Missing required fields: userId, planType, userEmail, priceId' });
    }

    // Get or create Stripe customer
    let stripeCustomer = null;
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
        console.log(`✓ Found existing Stripe customer: ${stripeCustomer.id}`);
      } else {
        stripeCustomer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        console.log(`✓ Created new Stripe customer: ${stripeCustomer.id}`);
      }
    } catch (error) {
      console.error('Error managing Stripe customer:', error);
      throw new Error(`Failed to create/find Stripe customer: ${error.message}`);
    }

    if (!isDeferred) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomer.id,
        status: 'all',
        limit: 100,
        expand: ['data.latest_invoice.confirmation_secret', 'data.latest_invoice.payment_intent'],
      });

      const reusableSubscription = existingSubscriptions.data.find((subscription) => {
        const hasMatchingPrice = subscription.items.data.some((item) => item.price?.id === priceId);
        const isUsableStatus = ['active', 'trialing', 'incomplete', 'past_due'].includes(subscription.status);
        const isSameFlow = subscription.metadata?.userId === userId || subscription.metadata?.planType === planType;
        return hasMatchingPrice && isUsableStatus && isSameFlow;
      });

      if (reusableSubscription) {
        console.log(`Reusing existing Stripe subscription: ${reusableSubscription.id}`);
        const responseData = await buildSubscriptionPaymentResponse(
          reusableSubscription,
          stripeCustomer.id,
          'Existing subscription payment is ready'
        );
        return res.json(responseData);
      }

      let subscription = null;
      try {
        subscription = await stripe.subscriptions.create({
          customer: stripeCustomer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
          metadata: {
            userId,
            planType,
            userEmail,
          },
        });
        console.log(`Created Stripe subscription: ${subscription.id}`);
      } catch (error) {
        console.error('Error creating Stripe subscription:', error);
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      const responseData = await buildSubscriptionPaymentResponse(subscription, stripeCustomer.id);
      return res.json(responseData);
    }

    const deferredActivationDate = new Date(activationDate);
    if (Number.isNaN(deferredActivationDate.getTime()) || deferredActivationDate <= new Date()) {
      return res.status(400).json({ error: 'A future activationDate is required for deferred subscriptions' });
    }

    // Create SetupIntent to collect payment method
    let setupIntent = null;
    try {
      setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomer.id,
        payment_method_types: ['card'],
        metadata: {
          userId,
          planType,
          priceId,
          userEmail,
          subscriptionFlow: 'true',
        },
      });
      console.log(`✓ Created SetupIntent: ${setupIntent.id}`);
    } catch (error) {
      console.error('Error creating SetupIntent:', error);
      throw new Error(`Failed to create payment setup: ${error.message}`);
    }

    res.json({
      success: true,
      intentType: 'setup',
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: stripeCustomer.id,
      status: 'setup_pending',
      isDeferred: true,
      activationDate: deferredActivationDate.toISOString(),
      message: 'Ready for payment method collection',
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Activate pending subscription after payment succeeds
 * POST /api/activate-subscription
 */
app.post('/api/activate-subscription', async (req, res) => {
  try {
    const { userId, planTier, subscriptionId, stripeSubscriptionStatus = 'active' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Get user from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();
    const targetTier = planTier || user.PendingTier;
    const targetSubscriptionId = subscriptionId || user.PendingSubscriptionId;
    if (!targetTier || !targetSubscriptionId) {
      return res.status(400).json({ error: 'No subscription details to activate' });
    }

    // Activate the pending tier
    const now = new Date();
    const updateData = {
      Tier: targetTier,
      SubscriptionStatus: 'active',
      SubscriptionStartDate: now.toISOString(),
      LastPaymentDate: now.toISOString(),
      SubscriptionEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      StripeSubscriptionId: targetSubscriptionId,
      StripeSubscriptionStatus: stripeSubscriptionStatus,
      AutoRenewal: true,
      PendingTier: null,
      PendingActivationDate: null,
      PendingSubscriptionId: null,
      PendingSubscriptionStatus: null,
      UpdatedAt: now.toISOString()
    };

    await db.collection('users').doc(userId).update(updateData);

    const updated = await db.collection('users').doc(userId).get();

    res.json({
      success: true,
      message: `Subscription activated for ${targetTier} plan`,
      user: updated.data()
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm payment method and create subscription after SetupIntent succeeds
 * POST /api/confirm-subscription-payment
 * Called after user confirms payment via SetupIntent
 */
app.post('/api/confirm-subscription-payment', async (req, res) => {
  try {
    const { setupIntentId, customerId, userId, planType, priceId, isDeferred = false, activationDate = null } = req.body;

    if (!setupIntentId || !customerId || !userId || !planType || !priceId) {
      return res.status(400).json({ error: 'Missing required fields: setupIntentId, customerId, userId, planType, priceId' });
    }

    console.log(`Processing subscription payment for user ${userId}...`);

    // Verify SetupIntent succeeded
    let setupIntent = null;
    try {
      setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      console.log(`✓ Retrieved SetupIntent: ${setupIntent.id}, status: ${setupIntent.status}`);

      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({ error: `SetupIntent not succeeded. Status: ${setupIntent.status}` });
      }
    } catch (error) {
      console.error('Error retrieving SetupIntent:', error);
      throw new Error(`Failed to verify payment setup: ${error.message}`);
    }

    // Get the payment method from the SetupIntent
    const paymentMethodId = setupIntent.payment_method;
    if (!paymentMethodId) {
      throw new Error('No payment method found in SetupIntent');
    }

    console.log(`✓ Payment method confirmed: ${paymentMethodId}`);

    // Set it as the default payment method for the customer
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      console.log(`✓ Set default payment method for customer`);
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw new Error(`Failed to set payment method: ${error.message}`);
    }

    // Now create the subscription with the payment method
    let subscription = null;
    try {
      const subscriptionParams = {
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: {
          userId,
          planType,
          setupIntentId,
        },
      };

      if (isDeferred) {
        const deferredActivationDate = new Date(activationDate);
        if (Number.isNaN(deferredActivationDate.getTime()) || deferredActivationDate <= new Date()) {
          return res.status(400).json({ error: 'A future activationDate is required for deferred subscriptions' });
        }
        subscriptionParams.trial_end = Math.floor(deferredActivationDate.getTime() / 1000);
        subscriptionParams.metadata.activationDate = deferredActivationDate.toISOString();
      } else {
        subscriptionParams.payment_behavior = 'default_incomplete';
        subscriptionParams.expand = ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'];
      }

      subscription = await stripe.subscriptions.create({
        ...subscriptionParams,
      });
      console.log(`✓ Created Stripe subscription: ${subscription.id}`);
      console.log(`  Status: ${subscription.status}`);
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }

    // Get the payment intent client secret from the subscription
    let clientSecret = null;
    try {
      if (subscription.latest_invoice) {
        const invoice = typeof subscription.latest_invoice === 'string'
          ? await stripe.invoices.retrieve(subscription.latest_invoice)
          : subscription.latest_invoice;
        if (invoice.payment_intent) {
          const paymentIntent = typeof invoice.payment_intent === 'string'
            ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
            : invoice.payment_intent;
          clientSecret = paymentIntent.client_secret;
          console.log(`✓ Got clientSecret from subscription invoice`);
        }
      }
    } catch (error) {
      console.error('Error getting clientSecret:', error);
      // Continue anyway - subscription is created
    }

    res.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
      isDeferred,
      activationDate: isDeferred ? new Date(activationDate).toISOString() : null,
      message: 'Subscription created and ready for payment confirmation',
    });
  } catch (error) {
    console.error('Error confirming subscription payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Store a deferred subscription that will activate later
 * POST /api/store-pending-subscription
 */
app.post('/api/store-pending-subscription', async (req, res) => {
  try {
    const { userId, planTier, subscriptionId, activationDate, stripeSubscriptionStatus } = req.body;

    if (!userId || !planTier || !subscriptionId || !activationDate) {
      return res.status(400).json({ error: 'Missing required fields: userId, planTier, subscriptionId, activationDate' });
    }

    // Get user from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pendingActivationDate = new Date(activationDate);
    if (Number.isNaN(pendingActivationDate.getTime()) || pendingActivationDate <= new Date()) {
      return res.status(400).json({ error: 'activationDate must be a future date' });
    }

    console.log(`✓ Storing pending subscription for user ${userId}: ${planTier} activating ${activationDate}`);

    // Store the pending tier information
    // Keep current tier active, set new tier as pending
    const updateData = {
      PendingTier: planTier,
      PendingActivationDate: activationDate,
      PendingSubscriptionId: subscriptionId,
      PendingSubscriptionStatus: stripeSubscriptionStatus || 'active',
      UpdatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(userId).update(updateData);

    const updated = await db.collection('users').doc(userId).get();

    console.log(`✓ Pending subscription stored successfully`);
    res.json({
      success: true,
      message: `Pending subscription scheduled for ${new Date(activationDate).toLocaleDateString()}`,
      user: updated.data()
    });
  } catch (error) {
    console.error('Error storing pending subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Finalize subscription after payment
 */
app.post('/api/finalize-subscription', async (req, res) => {
  try {
    const { userId: requestUserId, subscriptionId, paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing required field: paymentIntentId' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    let subscription = null;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    }

    const userId = requestUserId || paymentIntent.metadata?.userId || subscription?.metadata?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId and unable to derive it from Stripe metadata' });
    }

    // Get user from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();
    const planTier = paymentIntent.metadata?.planTier || subscription?.metadata?.planType || user.Tier;
    const now = new Date();

    // Update user subscription in Firebase
    await db.collection('users').doc(userId).update({
      SubscriptionStatus: 'active',
      Tier: planTier,
      LastPaymentDate: now.toISOString(),
      SubscriptionStartDate: now.toISOString(),
      SubscriptionEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      StripeSubscriptionId: subscriptionId || null,
      StripeSubscriptionStatus: subscription?.status || 'active',
      AutoRenewal: true,
      UpdatedAt: now.toISOString()
    });

    const updated = await db.collection('users').doc(userId).get();

    res.json({
      success: true,
      message: 'Subscription finalized',
      user: updated.data()
    });
  } catch (error) {
    console.error('Error finalizing subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 * POST /api/cancel-subscription
 */
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { userId, subscriptionId } = req.body;

    if (!userId && !subscriptionId) {
      return res.status(400).json({ error: 'userId or subscriptionId is required' });
    }

    let user = null;
    if (userId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      user = userDoc.data();
    }

    const targetSubscriptionId = subscriptionId || user?.PendingSubscriptionId || user?.StripeSubscriptionId;
    let stripeSubscription = null;
    if (targetSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.cancel(targetSubscriptionId);
      } catch (stripeError) {
        if (stripeError.code !== 'resource_missing') {
          throw stripeError;
        }
        console.warn(`Stripe subscription not found while cancelling: ${targetSubscriptionId}`);
      }
    }

    let updated = null;
    if (userId) {
      await db.collection('users').doc(userId).update({
        SubscriptionStatus: 'cancelled',
        PendingTier: null,
        PendingActivationDate: null,
        PendingSubscriptionId: null,
        PendingSubscriptionStatus: null,
        SubscriptionEndDate: new Date().toISOString(),
        StripeSubscriptionStatus: stripeSubscription?.status || 'cancelled',
        UpdatedAt: new Date().toISOString()
      });

      updated = await db.collection('users').doc(userId).get();
    }

    res.json({
      success: true,
      message: 'Subscription cancelled',
      status: stripeSubscription?.status || 'cancelled',
      user: updated?.data() || null
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Attach payment method to subscription
 * POST /api/attach-payment-method-to-subscription
 */
app.post('/api/attach-payment-method-to-subscription', async (req, res) => {
  try {
    let { userId, subscriptionId, paymentMethodId } = req.body;

    if (!paymentMethodId || (!userId && !subscriptionId)) {
      return res.status(400).json({ error: 'Missing required fields: paymentMethodId and either userId or subscriptionId' });
    }

    if (!userId && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.userId;
      if (!userId) {
        return res.status(400).json({ error: 'Unable to derive userId from subscription metadata' });
      }
    }

    await db.collection('users').doc(userId).update({
      PaymentMethodId: paymentMethodId,
      UpdatedAt: new Date().toISOString()
    });

    const updated = await db.collection('users').doc(userId).get();

    res.json({
      success: true,
      message: 'Payment method attached',
      user: updated.data()
    });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== CONTACT FORM SUBMISSION (Airtable) =====
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: name, email, message' });
    }

    // Submit to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Contact%20Submissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Name': name,
                'Email': email,
                'Message': message,
                'Submitted': new Date().toISOString(),
              },
            },
          ],
        }),
      }
    );

    if (!airtableResponse.ok) {
      const error = await airtableResponse.json();
      console.error('[AIRTABLE] Error:', error);
      return res.status(500).json({ error: 'Failed to submit contact form to Airtable' });
    }

    const result = await airtableResponse.json();
    console.log('[AIRTABLE] Contact form submitted:', result.records[0].id);

    res.json({ success: true, message: 'Contact form submitted successfully' });
  } catch (error) {
    console.error('[CONTACT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== START SERVER =====

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔥 Firebase Firestore connected`);
  console.log(`💳 Stripe integration active`);
  console.log(`📦 AWS S3 connected`);
});
