/**
 * Firestore Real-time Service
 * Direct Firebase Firestore listeners for real-time updates
 * No backend polling needed - instant updates as data changes
 */

import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';

/**
 * Listen to real-time file updates for a user
 * Fires whenever data changes, instantly reflects in UI
 */
export const subscribeToUserFiles = (userId, onUpdate, onError) => {
  try {
    const filesQuery = query(
      collection(db, 'files'),
      where('UserID', '==', userId)
    );
    
    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      console.log('[FIRESTORE] Listener fired - snapshot docs:', snapshot.docs.length);
      
      const files = snapshot.docs.map(doc => {
        const data = doc.data();
        
        console.log('[FIRESTORE] Raw doc data:', {
          id: doc.id,
          keys: Object.keys(data),
          FileName: data.FileName,
          OriginalFileName: data.OriginalFileName,
          UploadedAt: data.UploadedAt,
          data: data
        });
        
        // Extract file name with fallback chain
        const fileName = data.FileName || 
                        data.NewFileName || 
                        data.OriginalFileName || 
                        'Unnamed File';
        
        const originalFileName = data.OriginalFileName || 
                                 data.FileName || 
                                 'Unnamed File';
        
        // Handle date parsing - UploadedAt can be Timestamp OR string
        let uploadDate = new Date().toISOString();
        if (data.UploadedAt) {
          if (typeof data.UploadedAt.toDate === 'function') {
            // Firestore Timestamp object
            uploadDate = data.UploadedAt.toDate().toISOString();
          } else if (typeof data.UploadedAt === 'string') {
            // Already a string - use as-is for display
            uploadDate = data.UploadedAt;
          }
        } else if (data.UploadTimestamp) {
          // Fallback to UploadTimestamp if UploadedAt doesn't exist
          if (typeof data.UploadTimestamp.toDate === 'function') {
            uploadDate = data.UploadTimestamp.toDate().toISOString();
          } else if (typeof data.UploadTimestamp === 'string') {
            uploadDate = data.UploadTimestamp;
          }
        }
        
        // Extract file size
        const fileSize = data.FileSize || data.Size || 0;
        
        // Extract URL with fallback
        const fileUrl = data.URL || data.DownloadLink || '';
        
        // Extract status
        const status = data.Status || 'Pending';
        
        // Extract page count
        const pageCount = data.PageCount || data.Pages || 0;
        
        const fileObj = {
          id: doc.id,
          originalName: originalFileName,
          newName: fileName,
          size: fileSize,
          uploadDate,
          url: fileUrl,
          status,
          pageCount,
        };
        
        console.log('[FIRESTORE] Mapped file object:', fileObj);
        return fileObj;
      });
      
      console.log('[FIRESTORE] Before sort - files:', files.length);
      files.sort((a, b) => {
        // Handle date comparison for both ISO strings and custom format
        const getTime = (dateStr) => {
          if (!dateStr) return 0;
          try {
            return new Date(dateStr).getTime();
          } catch (e) {
            console.error('Date parse error:', dateStr);
            return 0;
          }
        };
        return getTime(b.uploadDate) - getTime(a.uploadDate);
      });
      console.log('[FIRESTORE] After sort - files:', files);
      
      onUpdate(files);
    }, (error) => {
      console.error('[FIRESTORE] Listener error:', error);
      if (onError) onError(error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[FIRESTORE] Setup error:', error);
    if (onError) onError(error);
    return () => {};
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

/**
 * Diagnostic function to check what data exists in Firestore for a user
 * @param {string} userId - User ID to diagnose
 * @returns {Promise<Object>} Diagnostic information about user's files and data
 */
export const diagnoseFiestoreData = async (userId) => {
  try {
    console.log('[FIRESTORE] Running diagnostics for user:', userId);
    
    const filesQuery = query(
      collection(db, 'files'),
      where('UserID', '==', userId)
    );
    
    const snapshot = await getDocs(filesQuery);
    
    console.log('[FIRESTORE] DIAGNOSTIC: Total files found:', snapshot.docs.length);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[FIRESTORE] File ${index + 1}:`, {
        docId: doc.id,
        fields: Object.keys(data).sort(),
        FileName: data.FileName,
        OriginalFileName: data.OriginalFileName,
        FileSize: data.FileSize,
        UploadedAt: data.UploadedAt,
        UploadedAtType: typeof data.UploadedAt,
        URL: data.URL,
        Status: data.Status,
        PageCount: data.PageCount,
      });
    });
    
    return {
      userId,
      filesCount: snapshot.docs.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[FIRESTORE] Diagnostic error:', error);
    throw error;
  }
};

