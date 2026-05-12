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
  allowedHeaders: ['Content-Type', 'Authorization']
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
    
    // Map fields
    if (subscriptionData.subscriptionTier) {
      updateData.Tier = subscriptionData.subscriptionTier;
    }
    if (subscriptionData.subscriptionStatus !== undefined) {
      updateData.SubscriptionStatus = subscriptionData.subscriptionStatus;
    }
    if ('pendingTier' in subscriptionData) {
      updateData.PendingTier = subscriptionData.pendingTier;
    }
    if ('pendingActivationDate' in subscriptionData) {
      updateData.PendingActivationDate = subscriptionData.pendingActivationDate;
    }
    if (subscriptionData.lastPaymentDate) {
      updateData.LastPaymentDate = subscriptionData.lastPaymentDate;
    }
    if (subscriptionData.stripeSubscriptionId) {
      updateData.StripeSubscriptionId = subscriptionData.stripeSubscriptionId;
    }
    if (subscriptionData.stripeSubscriptionStatus) {
      updateData.StripeSubscriptionStatus = subscriptionData.stripeSubscriptionStatus;
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
    } catch (error) {
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
              name: description || 'Nexiom AI Service',
            },
            unit_amount: Math.round(amount),
          },
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
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { userId, planType, paymentMethodId } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({ error: 'Missing required fields: userId, planType' });
    }

    // Get user from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();

    // Update user subscription in Firebase
    const updateData = {
      SubscriptionStatus: 'active',
      Tier: planType,
      SubscriptionStartDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    if (paymentMethodId) {
      updateData.PaymentMethodId = paymentMethodId;
    }

    await db.collection('users').doc(userId).update(updateData);

    const updated = await db.collection('users').doc(userId).get();

    res.json({
      success: true,
      message: `Subscription created for ${planType}`,
      user: updated.data()
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Finalize subscription after payment
 * POST /api/finalize-subscription
 */
app.post('/api/finalize-subscription', async (req, res) => {
  try {
    const { userId, paymentIntentId } = req.body;

    if (!userId || !paymentIntentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Get user from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();
    const planTier = paymentIntent.metadata?.planTier || user.Tier;

    // Update user subscription in Firebase
    await db.collection('users').doc(userId).update({
      SubscriptionStatus: 'active',
      Tier: planTier,
      LastPaymentDate: new Date().toISOString(),
      SubscriptionStartDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await db.collection('users').doc(userId).update({
      SubscriptionStatus: 'cancelled',
      PendingTier: null,
      PendingActivationDate: null,
      SubscriptionEndDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    });

    const updated = await db.collection('users').doc(userId).get();

    res.json({
      success: true,
      message: 'Subscription cancelled',
      user: updated.data()
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
    const { userId, paymentMethodId } = req.body;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({ error: 'Missing required fields: userId, paymentMethodId' });
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
