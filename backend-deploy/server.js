// Backend server for Stripe payments + Firebase + S3 operations
// Handles payment intents, user management, file operations
// Install: npm install express cors dotenv stripe firebase-admin @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// Run: node server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
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

// ===== FIREBASE USER ENDPOINTS =====

/**
 * GET /api/user/:uid - Get user from Firebase
 */
app.get('/api/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userDoc.data());
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user - Create new user in Firebase
 */
app.post('/api/user', async (req, res) => {
  try {
    const { username, email, uid } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing required fields: uid, email' });
    }

    const userData = {
      UserID: uid,
      Username: username || '',
      Email: email.toLowerCase(),
      Tier: 'Sandbox',
      SubscriptionStatus: 'active',
      CreatedDate: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(userData);
    res.status(201).json(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/check-user-availability - Check if username and email are available
 */
app.post('/api/check-user-availability', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: 'username and email are required' });
    }

    // Check username
    const usernameSnapshot = await db.collection('users')
      .where('Username', '==', username)
      .limit(1)
      .get();
    
    const usernameExists = !usernameSnapshot.empty;

    // Check email
    const emailSnapshot = await db.collection('users')
      .where('Email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    const emailExists = !emailSnapshot.empty;
    
    res.json({
      username: {
        exists: usernameExists,
        message: usernameExists ? 'Username is already taken' : 'Username is available'
      },
      email: {
        exists: emailExists,
        message: emailExists ? 'Email is already registered' : 'Email is available'
      },
      available: !usernameExists && !emailExists
    });
  } catch (error) {
    console.error('Error checking user availability:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// ===== FIREBASE FILES ENDPOINTS =====

/**
 * GET /api/user/:uid/files - Get all files for a user (optimized for fast rendering)
 * Query params: ?limit=50 (default 100, max 500)
 */
app.get('/api/user/:uid/files', async (req, res) => {
  try {
    const { uid } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500); // Cap at 500
    
    console.log(`[FILES API] Fetching files for user: ${uid} (limit: ${limit})`);
    
    // Query files by UserID with limit
    const filesSnapshot = await db.collection('files')
      .where('UserID', '==', uid)
      .limit(limit)
      .get();
    
    // Helper to normalize dates to ISO format
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null; // Return null instead of current time
      
      // Handle Firestore Timestamp objects
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        try {
          return dateValue.toDate().toISOString();
        } catch (e) {
          console.warn('[DATE] Firestore Timestamp conversion failed:', e.message);
        }
      }
      
      // Handle _seconds property (alternative Timestamp format)
      if (dateValue._seconds) {
        try {
          return new Date(dateValue._seconds * 1000).toISOString();
        } catch (e) {
          console.warn('[DATE] _seconds conversion failed:', e.message);
        }
      }
      
      // If already a Date object
      if (dateValue instanceof Date) {
        try {
          return dateValue.toISOString();
        } catch (e) {
          console.warn('[DATE] Date conversion failed:', e.message);
        }
      }
      
      // If ISO string, return as-is
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue;
      }
      
      // Parse custom format like "2026-05-09 1:08am"
      if (typeof dateValue === 'string') {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) return date.toISOString();
        } catch (e) {
          console.warn('[DATE] Custom format parsing failed:', e.message);
        }
      }
      
      // If all parsing fails, log and return null
      console.warn('[DATE] Unable to parse date:', dateValue);
      return null;
    };
    
    // Map and sort files - returns only needed fields for faster rendering
    const files = filesSnapshot.docs.map(doc => {
      const data = doc.data();
      const uploadDate = normalizeDate(data.UploadedAt) || new Date().toISOString();
      return {
        id: doc.id,
        originalName: data.FileName || '',
        newName: data.FileName || '',
        size: data.FileSize || 0,
        uploadDate: uploadDate,
        url: data.URL || '',
        status: data.Status || 'Pending'
      };
    })
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    
    // Set cache headers to disable caching for real-time updates
    // Use no-cache to require revalidation on each request
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    console.log(`[FILES API] Found ${files.length} files for user ${uid}`);
    res.json(files);
  } catch (error) {
    console.error('[FILES API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/file - Create file record in Firebase (after S3 upload)
 */
app.post('/api/file', async (req, res) => {
  try {
    const { userId, originalName, newName, size, url, userTier, pageCount } = req.body;
    
    if (!userId || !originalName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileData = {
      UserID: userId,
      FileName: newName || originalName,
      FileSize: size,
      UploadedAt: new Date().toISOString(),
      URL: url,
      Status: 'Pending',
      PageCount: pageCount || null,
      UpdatedAt: new Date().toISOString()
    };

    const fileRef = await db.collection('files').add(fileData);
    res.status(201).json({ id: fileRef.id, ...fileData });
  } catch (error) {
    console.error('Error creating file record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/:uid/monthly-usage - Get monthly usage stats
 */
app.get('/api/user/:uid/monthly-usage', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const filesSnapshot = await db.collection('files')
      .where('UserID', '==', uid)
      .where('UploadedAt', '>=', monthStart.toISOString())
      .where('UploadedAt', '<=', monthEnd.toISOString())
      .get();
    
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    res.json({
      monthKey: currentMonth,
      filesThisMonth: filesSnapshot.size,
      records: filesSnapshot.docs.map(doc => doc.data()),
      tierInfo: filesSnapshot.size > 0 ? filesSnapshot.docs[0].data().UserTier : null
    });
  } catch (error) {
    console.error('Error getting monthly usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FIREBASE TOPUP & CONTACT ENDPOINTS =====

/**
 * GET /api/user/:uid/topup-credits - Get user's top-up credits
 */
app.get('/api/user/:uid/topup-credits', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ credits: userDoc.data().TopUpCredits || 0 });
  } catch (error) {
    console.error('Error getting top-up credits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/user/:uid/topup-credits - Update top-up credits
 */
app.patch('/api/user/:uid/topup-credits', async (req, res) => {
  try {
    const { uid } = req.params;
    const { creditsToAdd } = req.body;
    
    if (creditsToAdd === undefined) {
      return res.status(400).json({ error: 'Missing required field: creditsToAdd' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const currentCredits = userDoc.exists ? (userDoc.data().TopUpCredits || 0) : 0;
    const newCredits = Math.max(0, currentCredits + creditsToAdd);
    
    await db.collection('users').doc(uid).update({
      TopUpCredits: newCredits,
      UpdatedAt: new Date().toISOString()
    });

    const updated = await db.collection('users').doc(uid).get();
    res.json({ credits: updated.data().TopUpCredits });
  } catch (error) {
    console.error('Error updating top-up credits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contact - Submit contact form (stores in Firebase)
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const contactData = {
      Name: name,
      Email: email.toLowerCase(),
      Subject: subject,
      Message: message,
      SubmittedAt: new Date().toISOString(),
      Status: 'New'
    };

    const contactRef = await db.collection('contacts').add(contactData);
    res.status(201).json({ id: contactRef.id, ...contactData });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== S3 FILE UPLOAD/DOWNLOAD ENDPOINTS =====

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

/**
 * POST /api/file/list - List files in S3 (for debugging)
 */
app.post('/api/file/list', async (req, res) => {
  try {
    const { prefix = 'clients/' } = req.body;
    
    const command = new ListObjectsV2Command({
      Bucket: S3_CONFIG.bucketName,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);
    
    res.json({
      objects: response.Contents || [],
      count: response.Contents?.length || 0
    });
  } catch (error) {
    console.error('Error listing S3 objects:', error);
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

// ===== START SERVER =====

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔥 Firebase Firestore connected`);
  console.log(`💳 Stripe integration active`);
  console.log(`📦 AWS S3 connected`);
});
