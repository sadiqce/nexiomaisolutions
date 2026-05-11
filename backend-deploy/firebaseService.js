/**
 * Firebase Firestore Service Layer
 * Replaces Airtable with Firestore for data persistence
 * 
 * Setup:
 * 1. npm install firebase-admin
 * 2. Add to .env:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_PRIVATE_KEY (from service account JSON, escaped)
 *    - FIREBASE_CLIENT_EMAIL
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  try {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
      console.warn('[FIREBASE] Credentials not configured - some features will not work');
    }

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });

    console.log('[FIREBASE] Admin SDK initialized');
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize:', error.message);
  }
}

const db = admin.firestore();

// ===== USER OPERATIONS =====

/**
 * Get user by UID
 */
export const getUser = async (uid) => {
  try {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error(`[FIREBASE] Error getting user ${uid}:`, error);
    throw error;
  }
};

/**
 * Create new user
 */
export const createUser = async (uid, userData) => {
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      UserID: uid,
      Username: userData.username || '',
      Email: userData.email || '',
      Tier: 'Sandbox',
      SubscriptionStatus: 'active',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      ...userData
    });

    console.log(`[FIREBASE] User created: ${uid}`);
    const created = await userRef.get();
    return created.data();
  } catch (error) {
    console.error(`[FIREBASE] Error creating user ${uid}:`, error);
    throw error;
  }
};

/**
 * Update user data
 */
export const updateUser = async (uid, updateData) => {
  try {
    const userRef = db.collection('users').doc(uid);
    
    // Don't overwrite existing data - merge with it
    await userRef.update({
      ...updateData,
      UpdatedAt: new Date().toISOString()
    });

    console.log(`[FIREBASE] User updated: ${uid}`);
    const updated = await userRef.get();
    return updated.data();
  } catch (error) {
    console.error(`[FIREBASE] Error updating user ${uid}:`, error);
    throw error;
  }
};

/**
 * Check if username exists
 */
export const checkUsernameExists = async (username) => {
  try {
    const snapshot = await db.collection('users')
      .where('Username', '==', username)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error(`[FIREBASE] Error checking username:`, error);
    throw error;
  }
};

/**
 * Check if email exists
 */
export const checkEmailExists = async (email) => {
  try {
    const snapshot = await db.collection('users')
      .where('Email', '==', email.toLowerCase())
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error(`[FIREBASE] Error checking email:`, error);
    throw error;
  }
};

/**
 * Check user availability (both username and email)
 */
export const checkUserAvailability = async (username, email) => {
  try {
    const [usernameExists, emailExists] = await Promise.all([
      checkUsernameExists(username),
      checkEmailExists(email)
    ]);

    return {
      username: {
        exists: usernameExists,
        available: !usernameExists,
        message: usernameExists ? 'Username already taken' : 'Username available'
      },
      email: {
        exists: emailExists,
        available: !emailExists,
        message: emailExists ? 'Email already registered' : 'Email available'
      },
      available: !usernameExists && !emailExists
    };
  } catch (error) {
    console.error(`[FIREBASE] Error checking availability:`, error);
    throw error;
  }
};

// ===== FILE OPERATIONS =====

/**
 * Get all files for a user
 */
export const getUserFiles = async (uid) => {
  try {
    const snapshot = await db.collection('files')
      .where('UserID', '==', uid)
      .orderBy('UploadedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`[FIREBASE] Error getting files for user ${uid}:`, error);
    throw error;
  }
};

/**
 * Create file record
 */
export const createFileRecord = async (uid, fileData) => {
  try {
    const fileRef = db.collection('files').doc();
    
    await fileRef.set({
      UserID: uid,
      FileName: fileData.fileName || '',
      FileSize: fileData.fileSize || 0,
      S3Key: fileData.s3Key || '',
      URL: fileData.url || '',
      Status: 'uploaded',
      UploadedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      ...fileData
    });

    console.log(`[FIREBASE] File created for user ${uid}: ${fileData.fileName}`);
    const created = await fileRef.get();
    return {
      id: fileRef.id,
      ...created.data()
    };
  } catch (error) {
    console.error(`[FIREBASE] Error creating file record:`, error);
    throw error;
  }
};

/**
 * Delete file record
 */
export const deleteFileRecord = async (fileId) => {
  try {
    await db.collection('files').doc(fileId).delete();
    console.log(`[FIREBASE] File deleted: ${fileId}`);
    return { success: true };
  } catch (error) {
    console.error(`[FIREBASE] Error deleting file:`, error);
    throw error;
  }
};

// ===== USAGE TRACKING =====

/**
 * Get monthly usage for a user
 */
export const getMonthlyUsage = async (uid) => {
  try {
    const user = await getUser(uid);
    
    // Return monthly usage data from user record
    return {
      creditsUsed: user?.CreditsUsed || 0,
      creditsLimit: user?.CreditsLimit || 25,
      filesConverted: user?.FilesConverted || 0,
      filesLimit: user?.FilesLimit || 10,
      resetsOn: user?.BillingCycleResets || null
    };
  } catch (error) {
    console.error(`[FIREBASE] Error getting monthly usage:`, error);
    throw error;
  }
};

/**
 * Update monthly usage
 */
export const updateMonthlyUsage = async (uid, usageData) => {
  try {
    await updateUser(uid, {
      CreditsUsed: usageData.creditsUsed || 0,
      FilesConverted: usageData.filesConverted || 0,
      CreditsLimit: usageData.creditsLimit || 25,
      FilesLimit: usageData.filesLimit || 10,
      BillingCycleResets: usageData.resetsOn || null
    });

    return await getMonthlyUsage(uid);
  } catch (error) {
    console.error(`[FIREBASE] Error updating usage:`, error);
    throw error;
  }
};

// ===== TOP-UP CREDITS =====

/**
 * Get top-up credits for user
 */
export const getTopUpCredits = async (uid) => {
  try {
    const user = await getUser(uid);
    return user?.TopUpCredits || 0;
  } catch (error) {
    console.error(`[FIREBASE] Error getting top-up credits:`, error);
    throw error;
  }
};

/**
 * Update top-up credits
 */
export const updateTopUpCredits = async (uid, amount) => {
  try {
    await updateUser(uid, {
      TopUpCredits: amount
    });

    return await getTopUpCredits(uid);
  } catch (error) {
    console.error(`[FIREBASE] Error updating top-up credits:`, error);
    throw error;
  }
};

// ===== REAL-TIME LISTENERS =====

/**
 * Listen for user changes in real-time
 * Useful for syncing data across clients
 */
export const onUserChange = (uid, callback) => {
  try {
    const unsubscribe = db.collection('users').doc(uid)
      .onSnapshot(
        doc => {
          if (doc.exists) {
            console.log(`[FIREBASE] User updated (real-time): ${uid}`);
            callback(null, doc.data());
          }
        },
        error => {
          console.error(`[FIREBASE] Error listening to user changes:`, error);
          callback(error, null);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error(`[FIREBASE] Error setting up user listener:`, error);
    throw error;
  }
};

/**
 * Listen for file changes in real-time
 */
export const onFileChange = (uid, callback) => {
  try {
    const unsubscribe = db.collection('files')
      .where('UserID', '==', uid)
      .onSnapshot(
        snapshot => {
          const files = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`[FIREBASE] Files updated (real-time): ${uid} - ${files.length} files`);
          callback(null, files);
        },
        error => {
          console.error(`[FIREBASE] Error listening to file changes:`, error);
          callback(error, null);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error(`[FIREBASE] Error setting up file listener:`, error);
    throw error;
  }
};

export default db;
