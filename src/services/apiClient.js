/**
 * API Client for Backend Services
 * All Airtable and S3 operations go through the backend
 * Backend URL from environment or localhost for development
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Get the backend URL
 * @returns {string} Backend URL
 */
export const getBackendUrl = () => BACKEND_URL;

/**
 * Make authenticated API request to backend
 * @param {string} endpoint - API endpoint path (e.g., '/api/user/123')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} Response data
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// ===== USER OPERATIONS =====

export const getUser = async (uid) => {
  return apiRequest(`/api/user/${uid}`);
};

export const createAirtableUser = async (userData) => {
  return apiRequest('/api/user', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUserTier = async (userId, newTier) => {
  return apiRequest(`/api/user/${userId}/tier`, {
    method: 'PATCH',
    body: JSON.stringify({ newTier }),
  });
};

export const updateUserSubscription = async (userId, subscriptionData) => {
  return apiRequest(`/api/user/${userId}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify(subscriptionData),
  });
};

// ===== FILE OPERATIONS =====

export const fetchUserFiles = async (userId) => {
  return apiRequest(`/api/user/${userId}/files`);
};

export const createFileRecord = async (fileData) => {
  return apiRequest('/api/file', {
    method: 'POST',
    body: JSON.stringify(fileData),
  });
};

export const getMonthlyUsage = async (userId) => {
  return apiRequest(`/api/user/${userId}/monthly-usage`);
};

// ===== S3 FILE UPLOAD/DOWNLOAD =====

/**
 * Get signed URL for uploading file to S3
 * Frontend will use this URL to upload directly to S3
 */
export const getS3UploadUrl = async (userId, fileName) => {
  return apiRequest('/api/file/upload-url', {
    method: 'POST',
    body: JSON.stringify({ userId, fileName }),
  });
};

/**
 * Upload file directly to S3 using signed URL
 * This bypasses the backend - frontend uploads directly to S3
 */
export const uploadFileToS3 = async (file, signedUrl) => {
  try {
    console.log(`[S3 UPLOAD] Starting upload for: ${file.name}`);
    
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    console.log(`[S3] Successfully uploaded ${file.name}`);
    return {
      success: true,
      url: signedUrl.split('?')[0], // Return the URL without query params
    };
  } catch (error) {
    console.error(`[S3] Failed to upload ${file.name}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get signed URL for downloading file from S3
 */
export const getDownloadUrl = async (fileKey) => {
  try {
    const result = await apiRequest(`/api/file/download-url/${encodeURIComponent(fileKey)}`);
    return { success: true, url: result.url };
  } catch (error) {
    console.error(`[S3] File not found:`, error);
    return { 
      success: false, 
      error: error.message,
      details: {
        requestedKey: fileKey,
        suggestion: 'The file may have been deleted or the filename contains special characters.'
      }
    };
  }
};

// ===== TOP-UP CREDITS =====

export const getTopUpCredits = async (userId) => {
  const result = await apiRequest(`/api/user/${userId}/topup-credits`);
  return result.credits;
};

export const updateTopUpCredits = async (userId, creditsToAdd) => {
  const result = await apiRequest(`/api/user/${userId}/topup-credits`, {
    method: 'PATCH',
    body: JSON.stringify({ creditsToAdd }),
  });
  return result.credits;
};

// ===== CONTACT FORM =====

export const submitContactForm = async (formData) => {
  return apiRequest('/api/contact', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
};

// ===== HELPER: Check user existence =====

export const checkUserExists = async (field, value) => {
  // This would need a new backend endpoint if required
  // For now, try to get user and catch 404
  try {
    if (field === 'UserID') {
      await getUser(value);
      return true;
    }
    return false;
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return false;
    }
    throw error;
  }
};

export default {
  getUser,
  createAirtableUser,
  updateUserTier,
  updateUserSubscription,
  fetchUserFiles,
  createFileRecord,
  getMonthlyUsage,
  getS3UploadUrl,
  uploadFileToS3,
  getDownloadUrl,
  getTopUpCredits,
  updateTopUpCredits,
  submitContactForm,
  checkUserExists,
};
