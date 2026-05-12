/**
 * Firestore Real-time Service
 * Direct Firebase Firestore listeners for real-time updates
 * No backend polling needed - instant updates as data changes
 */

import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

/**
 * Listen to real-time file updates for a user
 * @param {string} userId - User ID to listen for
 * @param {function} onUpdate - Callback when files change (receives array of files)
 * @param {function} onError - Callback for errors
 * @returns {function} Unsubscribe function to stop listening
 */
export const subscribeToUserFiles = (userId, onUpdate, onError) => {
  try {
    console.log('[FIRESTORE] Setting up real-time listener for user:', userId);
    
    // Create query for files by UserID
    const filesQuery = query(
      collection(db, 'files'),
      where('UserID', '==', userId)
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      filesQuery,
      (snapshot) => {
        console.log('[FIRESTORE] Real-time update received');
        
        // Map Firestore documents to file objects
        const files = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Handle Firestore Timestamps
          let uploadDate = new Date().toISOString();
          if (data.UploadedAt) {
            if (data.UploadedAt.toDate) {
              // Firestore Timestamp object
              uploadDate = data.UploadedAt.toDate().toISOString();
            } else if (typeof data.UploadedAt === 'string') {
              // Already ISO string
              uploadDate = data.UploadedAt;
            }
          }
          
          return {
            id: doc.id,
            originalName: data.FileName || '',
            newName: data.FileName || '',
            size: data.FileSize || 0,
            uploadDate: uploadDate,
            url: data.URL || '',
            status: data.Status || 'Pending'
          };
        });
        
        // Sort by date descending (newest first)
        files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        console.log(`[FIRESTORE] ${files.length} files received for user ${userId}`);
        console.log('[FIRESTORE] File names:', files.map(f => f.newName).join(', '));
        
        // Callback with updated files
        onUpdate(files);
      },
      (error) => {
        console.error('[FIRESTORE] Real-time listener error:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('[FIRESTORE] Failed to setup real-time listener:', error);
    if (onError) onError(error);
    return () => {}; // Return no-op unsubscribe
  }
};

/**
 * Listen to real-time user data updates
 * @param {string} userId - User ID to listen for
 * @param {function} onUpdate - Callback when user data changes
 * @param {function} onError - Callback for errors
 * @returns {function} Unsubscribe function
 */
export const subscribeToUser = (userId, onUpdate, onError) => {
  try {
    console.log('[FIRESTORE] Setting up real-time listener for user data:', userId);
    
    const unsubscribe = onSnapshot(
      doc(collection(db, 'users'), userId),
      (doc) => {
        if (doc.exists()) {
          console.log('[FIRESTORE] User data received:', doc.data());
          onUpdate(doc.data());
        } else {
          console.log('[FIRESTORE] User document not found');
          onUpdate(null);
        }
      },
      (error) => {
        console.error('[FIRESTORE] Real-time user listener error:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('[FIRESTORE] Failed to setup user listener:', error);
    if (onError) onError(error);
    return () => {};
  }
};
