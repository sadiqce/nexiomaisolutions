// Backend server for Stripe payments + Airtable + S3 operations
// Handles payment intents, user management, file operations
// Install: npm install express cors dotenv stripe @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// Run: node server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// ===== AIRTABLE HELPER FUNCTIONS (Server-side) =====
// These use process.env instead of import.meta.env
// Only use these on the server - frontend should use airtableService.js

const AIRTABLE_CONFIG = {
  baseId: process.env.VITE_AIRTABLE_BASE_ID,
  apiKey: process.env.VITE_AIRTABLE_API_KEY,
  usersTable: 'Users',
  filesTable: 'Files'
};

const getAirtableHeaders = () => ({
  'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
  'Content-Type': 'application/json'
});

/**
 * Server-side helper: Get user from Airtable
 */
const getServerUser = async (uid) => {
  try {
    if (!AIRTABLE_CONFIG.baseId || !AIRTABLE_CONFIG.apiKey) {
      throw new Error('Airtable credentials not configured');
    }

    const formula = `({UserID} = '${uid}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    const response = await fetch(url, { headers: getAirtableHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }
    
    if (data.records.length === 0) {
      return null;
    }
    
    return data.records[0].fields;
  } catch (error) {
    console.error("Server: Failed to get user from Airtable:", error);
    throw error;
  }
};

/**
 * Server-side helper: Get Airtable record ID for a user
 */
const getServerUserRecordId = async (uid) => {
  try {
    if (!AIRTABLE_CONFIG.baseId || !AIRTABLE_CONFIG.apiKey) {
      throw new Error('Airtable credentials not configured');
    }

    const formula = `({UserID} = '${uid}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    const response = await fetch(url, { headers: getAirtableHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Failed to get user record: ${data.error?.message}`);
    }
    
    if (data.records.length === 0) {
      throw new Error(`User with UID ${uid} not found in Airtable`);
    }
    
    return data.records[0].id;
  } catch (error) {
    console.error("Server: Failed to get user record ID:", error);
    throw error;
  }
};

/**
 * Server-side helper: Update user subscription in Airtable
 */
const updateServerUserSubscription = async (userId, subscriptionData) => {
  try {
    if (!AIRTABLE_CONFIG.baseId || !AIRTABLE_CONFIG.apiKey) {
      throw new Error('Airtable credentials not configured');
    }

    const userRecordId = await getServerUserRecordId(userId);
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
    
    const fields = {};
    
    // Map subscription data to Airtable fields
    if (subscriptionData.subscriptionTier) {
      fields['Tier'] = subscriptionData.subscriptionTier;
    }
    if (subscriptionData.subscriptionStatus !== undefined) {
      fields['SubscriptionStatus'] = subscriptionData.subscriptionStatus;
    }
    if ('pendingTier' in subscriptionData) {
      fields['PendingTier'] = subscriptionData.pendingTier;
    }
    if ('pendingActivationDate' in subscriptionData) {
      fields['PendingActivationDate'] = subscriptionData.pendingActivationDate;
    }
    if (subscriptionData.lastPaymentDate) {
      fields['LastPaymentDate'] = subscriptionData.lastPaymentDate;
    }
    if (subscriptionData.stripeSubscriptionId) {
      fields['StripeSubscriptionId'] = subscriptionData.stripeSubscriptionId;
    }
    if (subscriptionData.stripeSubscriptionStatus) {
      fields['StripeSubscriptionStatus'] = subscriptionData.stripeSubscriptionStatus;
    }
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAirtableHeaders(),
      body: JSON.stringify({ fields })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Failed to update subscription: ${data.error?.message}`);
    }
    
    return data.fields;
  } catch (error) {
    console.error("Server: Failed to update user subscription:", error);
    throw error;
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== AIRTABLE ENDPOINTS =====

/**
 * GET /api/user/:uid - Get user from Airtable
 */
app.get('/api/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const formula = `({UserID} = '${uid}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    const response = await fetch(url, { headers: getAirtableHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to get user' });
    }
    
    if (data.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(data.records[0].fields);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user - Create new user in Airtable
 */
app.post('/api/user', async (req, res) => {
  try {
    const { username, email, uid } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing required fields: uid, email' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}`;
    
    const record = {
      fields: {
        Username: username,
        Email: email,
        UserID: uid,
        CreatedDate: new Date().toISOString(),
        Tier: 'Sandbox'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getAirtableHeaders(),
      body: JSON.stringify({ records: [record] })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to create user' });
    }
    
    res.status(201).json(data.records[0].fields);
  } catch (error) {
    console.error('Error creating user:', error);
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

    const userRecordId = await getServerUserRecordId(uid);
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAirtableHeaders(),
      body: JSON.stringify({
        fields: {
          'Tier': newTier,
          'TierUpdatedDate': new Date().toISOString()
        }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to update tier' });
    }
    
    res.json(data.fields);
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
    
    const result = await updateServerUserSubscription(uid, subscriptionData);
    res.json(result);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/:uid/files - Get all files for a user
 */
app.get('/api/user/:uid/files', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // First get the user's Airtable record ID
    const userRecordId = await getServerUserRecordId(uid);
    
    // Filter files by user
    const formula = `({UserID} = '${userRecordId}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}?filterByFormula=${encodeURIComponent(formula)}`;

    const response = await fetch(url, { headers: getAirtableHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to fetch files' });
    }
    
    const files = data.records.map(record => ({
      id: record.id,
      originalName: record.fields['OriginalFileName'],
      newName: record.fields['NewFileName'],
      size: record.fields['FileSize'],
      uploadDate: record.fields['UploadTimestamp'],
      url: record.fields['DownloadLink'],
      status: 'Uploaded',
      pageCount: record.fields['PageCount'] || null
    }));
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/file - Create file record in Airtable (after S3 upload)
 */
app.post('/api/file', async (req, res) => {
  try {
    const { userId, originalName, newName, size, url, userTier, pageCount } = req.body;
    
    if (!userId || !originalName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRecordId = await getServerUserRecordId(userId);
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}`;
    
    const record = {
      fields: {
        "OriginalFileName": originalName,
        "NewFileName": newName || originalName,
        "FileSize": size,
        "UploadTimestamp": new Date().toISOString(),
        "DownloadLink": url,
        "UserID": [userRecordId],
        "UserTier": userTier || 'Sandbox',
        "PageCount": pageCount || null,
        "Status": "Pending"
      }
    };

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: getAirtableHeaders(),
      body: JSON.stringify({ records: [record] })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to create file record' });
    }
    
    res.status(201).json(data.records[0].fields);
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
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const userRecordId = await getServerUserRecordId(uid);
    
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const formula = `AND({UserID} = '${userRecordId}', IS_AFTER({UploadTimestamp}, '${monthStart}'), IS_BEFORE({UploadTimestamp}, '${monthEnd}'))`;
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}?filterByFormula=${encodeURIComponent(formula)}`;
    
    const response = await fetch(url, { headers: getAirtableHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to get usage' });
    }
    
    res.json({
      monthKey: currentMonth,
      filesThisMonth: data.records.length,
      records: data.records,
      tierInfo: data.records.length > 0 ? data.records[0].fields.UserTier : null
    });
  } catch (error) {
    console.error('Error getting monthly usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/:uid/topup-credits - Get user's top-up credits
 */
app.get('/api/user/:uid/topup-credits', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await getServerUser(uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ credits: user.TopUpCredits || 0 });
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

    const user = await getServerUser(uid);
    const currentCredits = user?.TopUpCredits || 0;
    const newCredits = Math.max(0, currentCredits + creditsToAdd);
    
    const userRecordId = await getServerUserRecordId(uid);
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAirtableHeaders(),
      body: JSON.stringify({
        fields: { 'TopUpCredits': newCredits }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to update credits' });
    }
    
    res.json({ credits: newCredits });
  } catch (error) {
    console.error('Error updating credits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contact - Submit contact form
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/ContactSubmissions`;
    
    const record = {
      fields: {
        Name: name,
        Email: email,
        Message: message,
        SubmittedDate: new Date().toISOString(),
        Status: 'New'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getAirtableHeaders(),
      body: JSON.stringify({ records: [record] })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Failed to submit form' });
    }
    
    res.status(201).json(data.records[0].fields);
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
 * Create Subscription and get Payment Intent for first payment
 * POST /api/create-subscription
 * 
 * IMPORTANT: This creates the subscription with payment_behavior: 'default_incomplete'
 * The subscription's FIRST INVOICE already has a payment_intent attached.
 * Frontend uses this payment_intent's client_secret to collect payment.
 * When payment succeeds, subscription automatically becomes 'active'.
 * 
 * For DEFERRED BILLING (paid user upgrading):
 * Pass activationDate and use billing_cycle_anchor to defer charging
 * until the end of the current billing cycle.
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { userId, userEmail, planTier, priceId, clientId, paymentMethodId, activationDate, isDeferred } = req.body;

    // Validate required fields
    if (!userId || !userEmail || !planTier || !priceId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, userEmail, planTier, priceId' 
      });
    }

    // First, get or create a customer in Stripe
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`✓ Using existing Stripe customer: ${customerId}`);
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
      console.log(`✓ Created new Stripe customer: ${customerId}`);
    }

    // Attach payment method to customer if provided
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        console.log(`✓ Attached payment method ${paymentMethodId} to customer ${customerId}`);

        // Set this payment method as the default for the customer
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        console.log(`✓ Set as default payment method for customer`);
      } catch (error) {
        console.warn(`⚠ Warning: Could not attach payment method: ${error.message}`);
        // Continue anyway - subscription creation might still work
      }
    }

    // Create subscription
    // Use 'error_if_incomplete' if we have a payment method, otherwise 'default_incomplete'
    const paymentBehavior = paymentMethodId ? 'error_if_incomplete' : 'default_incomplete';
    
    // Build subscription config
    const subscriptionConfig = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      metadata: {
        userId,
        planTier,
        clientId: clientId || '',
        // If deferred, mark this subscription as pending
        ...(isDeferred && activationDate && { pendingTier: planTier, activationDate: activationDate }),
      },
      payment_behavior: paymentBehavior,
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // For deferred billing (paid user upgrading to another paid plan):
    // Use trial_end to delay the first charge without prorating
    // This charges the FULL monthly amount after the trial period ends
    if (isDeferred && activationDate) {
      const trialEndDate = new Date(activationDate);
      const trialEndTimestamp = Math.floor(trialEndDate.getTime() / 1000);
      subscriptionConfig.trial_end = trialEndTimestamp;
      console.log(`✓ Deferred billing enabled (trial). First charge on: ${activationDate} for FULL monthly amount`);
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionConfig);

    // Get the payment intent from the subscription's invoice
    // For deferred billing, there will be NO invoice/payment intent yet (scheduled for future)
    let paymentIntent = null;
    
    if (!isDeferred || !activationDate) {
      // Normal billing: Try to get payment intent for immediate charging
      paymentIntent = subscription.latest_invoice?.payment_intent;
      
      // If payment intent is not in the expanded response, try to retrieve it
      if (!paymentIntent && subscription.latest_invoice) {
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id);
        paymentIntent = invoice.payment_intent;
        if (typeof paymentIntent === 'string') {
          // If it's just the ID string, retrieve the full payment intent object
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
        }
      }
      
      // FALLBACK: If still no payment intent, create a standalone one for this amount
      // This ensures frontend always has a client_secret to use for payment
      if (!paymentIntent || !paymentIntent.client_secret) {
        console.warn(`⚠ Payment intent not found on subscription, creating standalone payment intent as fallback`);
        
        // Get the price details to determine the amount
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        
        if (!amount) {
          throw new Error('Could not determine price amount for fallback payment intent');
        }

        paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: price.currency,
          customer: customerId,
          description: `Subscription payment for ${planTier} plan`,
          metadata: {
            userId,
            planTier,
            subscriptionId: subscription.id,
            subscriptionPayment: 'true',
          },
          setup_future_usage: 'off_session', // Save payment method for future charges
        });

        console.log(`✓ Created fallback payment intent ${paymentIntent.id}`);
      }
    } else {
      console.log(`✓ Deferred billing: No immediate payment required. First invoice scheduled for ${activationDate}`);
    }

    console.log(`✓ Created subscription ${subscription.id}`);
    console.log(`✓ Subscription status: ${subscription.status}`);
    
    // For deferred billing, no payment is collected now
    // For immediate billing, return client_secret for payment confirmation
    if (isDeferred && activationDate) {
      console.log(`✓ Deferred subscription created. No immediate payment needed.`);
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId,
        isDeferred: true,
        activationDate: activationDate,
        message: `Subscription scheduled to start on ${activationDate}. No payment required now.`,
      });
    } else {
      console.log(`✓ Payment intent status: ${paymentIntent?.status}`);
      console.log(`✓ Returning client_secret for frontend payment confirmation`);
      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
        paymentIntentId: paymentIntent?.id,
        status: subscription.status,
        customerId,
        isDeferred: false,
      });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create subscription' 
    });
  }
});

/**
 * Finalize Subscription After Payment Success
 * POST /api/finalize-subscription
 * Applies the successful payment to the subscription's invoice
 * This converts an incomplete subscription to active
 */
app.post('/api/finalize-subscription', async (req, res) => {
  try {
    const { subscriptionId, paymentIntentId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ 
        error: 'Missing required field: subscriptionId' 
      });
    }

    // Retrieve the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`Finalizing subscription ${subscriptionId}, current status: ${subscription.status}`);

    // If already active, nothing to do
    if (subscription.status === 'active') {
      console.log(`✓ Subscription ${subscriptionId} is already active`);
      return res.json({
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    }

    // Get the subscription's invoice
    if (!subscription.latest_invoice) {
      console.warn(`No invoice found for subscription ${subscriptionId}`);
      return res.json({
        success: false,
        error: 'No invoice found'
      });
    }

    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice.id;

    const invoice = await stripe.invoices.retrieve(invoiceId);
    console.log(`Invoice ${invoiceId} status: ${invoice.status}, paid: ${invoice.paid}, amount_due: ${invoice.amount_due}`);

    // If invoice is already paid, just return
    if (invoice.paid) {
      console.log(`Invoice ${invoiceId} is already paid`);
      const current = await stripe.subscriptions.retrieve(subscriptionId);
      return res.json({
        success: true,
        subscriptionId: current.id,
        status: current.status,
      });
    }

    // Try to get the charge from the payment intent
    let chargeId = null;
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log(`Payment intent ${paymentIntentId} status: ${paymentIntent.status}`);
        
        if (paymentIntent.status === 'succeeded' && paymentIntent.charges?.data?.length > 0) {
          chargeId = paymentIntent.charges.data[0].id;
          console.log(`Found charge ${chargeId} from payment intent`);
        }
      } catch (piError) {
        console.warn(`Could not retrieve payment intent: ${piError.message}`);
      }
    }

    // If invoice is still draft, finalize it
    if (invoice.status === 'draft') {
      try {
        console.log(`Finalizing invoice ${invoiceId}...`);
        await stripe.invoices.finalizeInvoice(invoiceId);
        console.log(`✓ Finalized invoice`);
      } catch (finalizeError) {
        console.warn(`Could not finalize invoice: ${finalizeError.message}`);
      }
    }

    // Mark invoice as paid
    console.log(`Attempting to mark invoice ${invoiceId} as paid...`);
    try {
      // Use the charge if we have it
      if (chargeId) {
        await stripe.invoices.pay(invoiceId, {
          paid_out_of_band: true,
          charge: chargeId,
        });
        console.log(`✓ Marked invoice as paid with charge ${chargeId}`);
      } else {
        // Mark as paid out of band
        await stripe.invoices.pay(invoiceId, {
          paid_out_of_band: true,
        });
        console.log(`✓ Marked invoice as paid (out of band)`);
      }
    } catch (payError) {
      console.error(`Error marking invoice as paid: ${payError.message}`);
      // Even if this fails, try to finalize the invoice one more time
      try {
        const currentInvoice = await stripe.invoices.retrieve(invoiceId);
        if (currentInvoice.status === 'draft') {
          await stripe.invoices.finalizeInvoice(invoiceId);
          console.log(`Finalized draft invoice as last resort`);
        }
      } catch (e) {
        console.warn(`Last resort finalize failed: ${e.message}`);
      }
    }

    // Retrieve fresh subscription state
    const finalSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`✓ Final subscription ${subscriptionId} status: ${finalSubscription.status}`);

    // Log the invoice status as well
    const finalInvoice = await stripe.invoices.retrieve(invoiceId);
    console.log(`Final invoice ${invoiceId} status: ${finalInvoice.status}, paid: ${finalInvoice.paid}`);

    res.json({
      success: true,
      subscriptionId: finalSubscription.id,
      status: finalSubscription.status,
      invoiceStatus: finalInvoice.status,
      invoicePaid: finalInvoice.paid,
    });
  } catch (error) {
    console.error('Error finalizing subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to finalize subscription' 
    });
  }
});

/**
 * Attach Payment Method to Subscription
 * POST /api/attach-payment-method-to-subscription
 * This attaches a payment method to an existing subscription and updates its status
 * Useful for marking an "incomplete" subscription as "active" after payment succeeds
 */
app.post('/api/attach-payment-method-to-subscription', async (req, res) => {
  try {
    const { subscriptionId, paymentMethodId } = req.body;

    if (!subscriptionId || !paymentMethodId) {
      return res.status(400).json({ 
        error: 'Missing required fields: subscriptionId, paymentMethodId' 
      });
    }

    // Retrieve the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;

    console.log(`Attaching payment method ${paymentMethodId} to subscription ${subscriptionId}`);

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      console.log(`✓ Attached payment method ${paymentMethodId} to customer ${customerId}`);
    } catch (attachError) {
      // Payment method might already be attached - continue
      if (attachError.code !== 'payment_method_already_attached') {
        throw attachError;
      }
      console.log(`ℹ Payment method already attached to customer`);
    }

    // Update subscription with the payment method
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
    });

    console.log(`✓ Updated subscription with default payment method`);
    console.log(`✓ Subscription status: ${updatedSubscription.status}`);

    res.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      message: `Payment method attached successfully. Subscription is now ${updatedSubscription.status}`,
    });
  } catch (error) {
    console.error('Error attaching payment method to subscription:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to attach payment method' 
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

    console.log(`Cancel subscription request for: ${subscriptionId}`);

    // Validate required fields
    if (!subscriptionId) {
      console.error('Missing subscriptionId in request body');
      return res.status(400).json({ 
        error: 'Missing required field: subscriptionId' 
      });
    }

    // Verify subscription exists first
    console.log(`Retrieving subscription ${subscriptionId} from Stripe...`);
    const existingSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`Found subscription with status: ${existingSubscription.status}`);

    // Cancel the subscription
    console.log(`Updating subscription to cancel_at_period_end...`);
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true, // Let the subscription continue until the end of the billing period
    });

    console.log(`✓ Subscription ${subscriptionId} cancelled successfully`);
    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error.message);
    console.error('Error details:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel subscription' 
    });
  }
});

/**
 * Cancel Pending Subscription
 * POST /api/cancel-pending-subscription
 * Cancels a pending (trial) subscription while keeping the current subscription active
 * Used when user cancels an upgrade before the trial ends
 */
app.post('/api/cancel-pending-subscription', async (req, res) => {
  try {
    const { userId, userEmail, currentSubscriptionId, pendingTier } = req.body;

    if (!userId || !userEmail || !currentSubscriptionId || !pendingTier) {
      return res.status(400).json({
        error: 'Missing required fields: userId, userEmail, currentSubscriptionId, pendingTier',
      });
    }

    console.log(`Cancel pending subscription request for user ${userId}: ${pendingTier} plan`);

    // Find the customer in Stripe
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'Customer not found in Stripe' });
    }

    const customerId = customers.data[0].id;
    console.log(`Found customer ${customerId} for ${userEmail}`);

    // List all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    console.log(`Found ${subscriptions.data.length} subscriptions for customer`);

    // Find the pending (trial) subscription
    // It should be in trial state (trial_end is set and in the future)
    let pendingSubscription = null;
    for (const sub of subscriptions.data) {
      // Skip the current subscription
      if (sub.id === currentSubscriptionId) {
        console.log(`Skipping current subscription ${currentSubscriptionId}`);
        continue;
      }

      // Check if this is a trial subscription
      if (sub.trial_end && new Date(sub.trial_end * 1000) > new Date()) {
        console.log(`Found trial subscription ${sub.id}: status=${sub.status}, trial_end=${new Date(sub.trial_end * 1000).toISOString()}`);
        pendingSubscription = sub;
        break;
      }
    }

    if (!pendingSubscription) {
      console.warn(`No pending trial subscription found for customer ${customerId}`);
      return res.status(404).json({ error: 'Pending subscription not found' });
    }

    // Cancel the pending subscription immediately
    console.log(`Cancelling pending subscription ${pendingSubscription.id}`);
    const cancelledSub = await stripe.subscriptions.del(pendingSubscription.id);

    console.log(`✓ Pending subscription cancelled: ${cancelledSub.id}`);

    res.json({
      success: true,
      subscriptionId: cancelledSub.id,
      status: cancelledSub.status,
      message: `Pending ${pendingTier} upgrade has been cancelled`,
    });
  } catch (error) {
    console.error('Error cancelling pending subscription:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to cancel pending subscription',
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

/**
 * Check and Activate Pending Tier if Date is Reached
 * POST /api/check-pending-activation
 * This endpoint checks if a user has a pending tier scheduled for activation
 * and activates it if the activation date has been reached.
 */
app.post('/api/check-pending-activation', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Fetch user from Airtable using server-side helper
    const user = await getServerUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    console.log(`✓ Activating pending tier: ${user.PendingTier} for user ${userId}`);
    
    const updated = await updateServerUserSubscription(userId, {
      subscriptionTier: user.PendingTier,
      subscriptionStatus: 'active',
      pendingTier: null, // Clear pending tier
      pendingActivationDate: null, // Clear pending date
      lastPaymentDate: new Date().toISOString().split('T')[0], // Today's date
    });

    res.json({
      activated: true,
      newTier: user.PendingTier,
      message: `Tier upgraded to ${user.PendingTier}`,
      user: updated
    });
  } catch (error) {
    console.error('Error checking pending activation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check pending activation' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
