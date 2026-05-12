/**
 * Airtable Service - Direct Firestore Operations
 * Data pulling operations now use Firestore directly instead of backend endpoints
 * Payment operations still use backend (see paymentService.js)
 */

import {
  isUsernameAvailable,
  isEmailAvailable,
  userExists,
  createUser,
  getUserData,
  getUserFiles,
  createFileRecord as createFirestoreFileRecord,
  submitContactForm as submitFirestoreContactForm,
  getTopUpCredits as getFirestoreTopUpCredits,
} from './firestoreService';

// --- USER FUNCTIONS ---

/**
 * Batch check if username and email are available (pulls directly from Firestore)
 */
export const checkUserAvailability = async (username, email) => {
  try {
    const [usernameAvailable, emailAvailable] = await Promise.all([
      isUsernameAvailable(username),
      isEmailAvailable(email),
    ]);

    return {
      usernameAvailable,
      emailAvailable,
      available: usernameAvailable && emailAvailable,
    };
  } catch (error) {
    console.error('[AIRTABLE] Error checking user availability:', error);
    throw error;
  }
};

/**
 * Check if user exists by field (pulls from Firestore)
 */
export const checkUserExists = async (field, value) => {
  try {
    // Handle field name mapping
    let firestoreField = field;
    if (field === 'UserID' || field === 'uid') firestoreField = 'uid';
    if (field === 'email') firestoreField = 'email';
    if (field === 'username') firestoreField = 'username';

    const exists = await userExists(firestoreField, value);
    return exists;
  } catch (error) {
    console.error('[AIRTABLE] Error checking user existence:', error);
    throw error;
  }
};

/**
 * Create a new user in Firestore
 */
export const createAirtableUser = async (userData) => {
  try {
    const user = await createUser(userData.uid, {
      username: userData.username,
      email: userData.email,
      tier: userData.tier || 'Free',
    });

    return user;
  } catch (error) {
    console.error('[AIRTABLE] Failed to create user:', error);
    throw error;
  }
};

/**
 * Get user from Firestore
 */
export const getUser = async (uid) => {
  try {
    const user = await getUserData(uid);
    return user;
  } catch (error) {
    console.error('[AIRTABLE] Failed to get user:', error);
    throw error;
  }
};

// --- FILE FUNCTIONS ---

/**
 * Fetch all user files from Firestore
 */
export const fetchUserFiles = async (userId) => {
  try {
    const files = await getUserFiles(userId);
    return files;
  } catch (error) {
    console.error('[AIRTABLE] Failed to fetch files:', error);
    return [];
  }
};

/**
 * Helper function to get user record ID
 */
export const getUserRecordId = async (firebaseUid) => {
  return firebaseUid;
};

/**
 * Create file record in Firestore
 */
export const createFileRecord = async (fileData) => {
  try {
    const file = await createFirestoreFileRecord({
      userId: fileData.userId,
      originalName: fileData.originalName,
      newName: fileData.newName,
      size: fileData.size,
      url: fileData.url,
      userTier: fileData.userTier || 'Sandbox',
      pageCount: fileData.pageCount || 1,
    });

    return file;
  } catch (error) {
    console.error('[AIRTABLE] Failed to create file record:', error);
    throw error;
  }
};

/**
 * Get monthly usage for a user (for tier limit enforcement)
 * @param {string} userId - The user's Firebase ID
 * @returns {Promise<object>} Monthly usage stats
 */
export const getMonthlyUsage = async (userId) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${userId}/monthly-usage`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to get monthly usage: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to get monthly usage:", error);
        // Return default values on error to avoid breaking the app
        return {
            monthKey: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            filesThisMonth: 0,
            records: [],
            tierInfo: null
        };
    }
};

/**
 * Get user's top-up credits
 * @param {string} userId - The user's Firebase ID
 * @returns {Promise<number>} Available top-up credits
 */
export const getTopUpCredits = async (userId) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${userId}/topup-credits`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to get top-up credits: ${data.error}`);
        }
        
        return data.credits || 0;
    } catch (error) {
        console.error("Failed to get top-up credits:", error);
        return 0;
    }
};

/**
 * Update top-up credits for a user
 * @param {string} userId - The user's Firebase ID
 * @param {number} creditsToAdd - Number of credits to add (can be negative to subtract)
 * @returns {Promise<object>} Updated credits
 */
export const updateTopUpCredits = async (userId, creditsToAdd) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${userId}/topup-credits`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creditsToAdd })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to update top-up credits: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to update top-up credits:", error);
        throw error;
    }
};