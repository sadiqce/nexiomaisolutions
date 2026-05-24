/**
 * Firestore Data Service
 * Direct Firestore queries for data pulling operations
 * Replaces backend API endpoints for user, file, and contact data
 */

import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

// ===== USER OPERATIONS =====

/**
 * Get user by UID from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User document data or null
 */
export const getUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        uid: userDoc.id,
        ...userDoc.data(),
      };
    }
    return null;
  } catch (error) {
    console.error('[FIRESTORE] Error fetching user:', error);
    throw error;
  }
};

/**
 * Create a new user in Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @param {Object} userData - User data {username, email, tier, etc.}
 * @returns {Promise<Object>} Created user document
 */
export const createUser = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    const defaultUserData = {
      uid,
      username: userData.username || '',
      email: userData.email || '',
      tier: userData.tier || 'Free',
      subscriptionStatus: userData.subscriptionStatus || 'inactive',
      topUpCredits: userData.topUpCredits || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...userData,
    };

    await setDoc(userRef, defaultUserData);
    return defaultUserData;
  } catch (error) {
    console.error('[FIRESTORE] Error creating user:', error);
    throw error;
  }
};

/**
 * Check username availability
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if available, false if taken
 */
export const isUsernameAvailable = async (username) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('[FIRESTORE] Error checking username availability:', error);
    throw error;
  }
};

/**
 * Check email availability
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if available, false if taken
 */
export const isEmailAvailable = async (email) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('[FIRESTORE] Error checking email availability:', error);
    throw error;
  }
};

/**
 * Check if user exists by field
 * @param {string} field - 'username' or 'email'
 * @param {string} value - Value to check
 * @returns {Promise<boolean>} True if exists
 */
export const userExists = async (field, value) => {
  try {
    const q = query(
      collection(db, 'users'),
      where(field, '==', value.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('[FIRESTORE] Error checking user existence:', error);
    throw error;
  }
};

/**
 * Update user subscription information
 * @param {string} uid - User ID
 * @param {Object} subscriptionData - Subscription data to update
 * @returns {Promise<void>}
 */
export const updateUserSubscription = async (uid, subscriptionData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...subscriptionData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[FIRESTORE] Error updating subscription:', error);
    throw error;
  }
};

// ===== FILE OPERATIONS =====

/**
 * Get all files for a user from Firestore
 * @param {string} userId - User ID
 * @param {number} limit - Max results (default 50)
 * @returns {Promise<Array>} Array of file documents
 */
export const getUserFiles = async (userId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'files'),
      where('UserID', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const files = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      let uploadDate = new Date().toISOString();
      
      // Handle UploadedAt - can be Timestamp object or string
      if (data.UploadedAt) {
        if (typeof data.UploadedAt.toDate === 'function') {
          uploadDate = data.UploadedAt.toDate().toISOString();
        } else if (typeof data.UploadedAt === 'string') {
          uploadDate = data.UploadedAt;
        }
      } else if (data.UploadTimestamp) {
        // Fallback to UploadTimestamp
        if (typeof data.UploadTimestamp.toDate === 'function') {
          uploadDate = data.UploadTimestamp.toDate().toISOString();
        } else if (typeof data.UploadTimestamp === 'string') {
          uploadDate = data.UploadTimestamp;
        }
      }
      
      // Extract file names
      // originalFileName is the uploaded filename (never changes)
      const originalFileName = data.OriginalFileName || '';
      
      // fileName is the processed name from make.com (empty until processed)
      const fileName = data.FileName || '';
      
      // Extract file size with fallback
      const fileSize = data.FileSize || data.Size || 0;
      
      // Extract URL with fallback
      const fileUrl = data.URL || data.DownloadLink || '';
      
      return {
        id: doc.id,
        originalName: originalFileName,
        newName: fileName,
        size: fileSize,
        uploadDate,
        url: fileUrl,
        status: data.Status || 'Pending',
        pageCount: data.PageCount || data.Pages || 0,
      };
    });
    
    // Sort by date descending
    files.sort((a, b) => {
      const getTime = (dateStr) => {
        if (!dateStr) return 0;
        try {
          return new Date(dateStr).getTime();
        } catch (e) {
          return 0;
        }
      };
      return getTime(b.uploadDate) - getTime(a.uploadDate);
    });
    
    return files.slice(0, limit);
  } catch (error) {
    console.error('[FIRESTORE] Error fetching user files:', error);
    throw error;
  }
};

/**
 * Create a file record in Firestore
 * @param {Object} fileData - File data to store
 * @returns {Promise<Object>} Created file document
 */
export const createFileRecord = async (fileData) => {
  try {
    const fileRecord = {
      UserID: fileData.userId,
      OriginalFileName: fileData.originalName,
      FileName: '',
      FileSize: fileData.size,
      URL: fileData.url,
      PageCount: fileData.pageCount || 1,
      Status: 'Completed',
      UploadedAt: Timestamp.now(),
      UserTier: fileData.userTier,
      createdAt: Timestamp.now(),
    };

    const newDocRef = doc(collection(db, 'files'));
    await setDoc(newDocRef, fileRecord);

    return {
      id: newDocRef.id,
      ...fileRecord,
    };
  } catch (error) {
    console.error('[FIRESTORE] Error creating file record:', error);
    throw error;
  }
};

/**
 * Delete a file record
 * @param {string} fileId - File document ID
 * @returns {Promise<void>}
 */
export const deleteFileRecord = async (fileId) => {
  try {
    const fileRef = doc(db, 'files', fileId);
    await deleteDoc(fileRef);
  } catch (error) {
    console.error('[FIRESTORE] Error deleting file record:', error);
    throw error;
  }
};


// ===== TOP-UP CREDITS =====

/**
 * Get current top-up credits for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Top-up credits balance
 */
export const getTopUpCredits = async (userId) => {
  try {
    const userDoc = await getUserData(userId);
    return userDoc?.topUpCredits || 0;
  } catch (error) {
    console.error('[FIRESTORE] Error fetching top-up credits:', error);
    throw error;
  }
};

// ===== CONTACT FORM =====

/**
 * Submit contact form - stores in Firestore
 * @param {Object} formData - Contact form data
 * @returns {Promise<Object>} Submitted form record
 */
export const submitContactForm = async (formData) => {
  try {
    const contactRecord = {
      name: formData.name || '',
      email: formData.email || '',
      subject: formData.subject || '',
      message: formData.message || '',
      submittedAt: Timestamp.now(),
      ip: formData.ip || '',
      userAgent: formData.userAgent || '',
      status: 'new',
    };

    const contactRef = await doc(collection(db, 'contact-forms'));
    await setDoc(contactRef, contactRecord);

    return {
      id: contactRef.id,
      ...contactRecord,
    };
  } catch (error) {
    console.error('[FIRESTORE] Error submitting contact form:', error);
    throw error;
  }
};
