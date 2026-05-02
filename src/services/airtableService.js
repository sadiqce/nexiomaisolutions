// Airtable Service - Routes through Backend
// DO NOT call Airtable directly from frontend - all requests go through backend
// Backend handles credentials securely on server-side

import { getBackendUrl } from './apiClient.js';

const BACKEND_URL = getBackendUrl();

// --- USER FUNCTIONS ---

export const checkUserExists = async (field, value) => {
    try {
        // Firebase UID check
        if (field === 'UserID') {
            const response = await fetch(`${BACKEND_URL}/api/user/${value}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.ok;
        }
        
        // For other fields, call backend to check
        const response = await fetch(`${BACKEND_URL}/api/user-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value })
        });
        
        const data = await response.json();
        return response.ok && data.exists;
    } catch (error) {
        console.error("Error checking user existence:", error);
        throw error;
    }
};

export const createAirtableUser = async (userData) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userData.username,
                email: userData.email,
                uid: userData.uid
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to create user: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to create Airtable user:", error);
        throw error;
    }
};

export const getUser = async (uid) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${uid}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Failed to get user: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to get user:", error);
        throw error;
    }
}

// --- FILE FUNCTIONS ---

export const fetchUserFiles = async (userId) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${userId}/files`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to fetch files:", error);
        return [];
    }
};

// Helper function - no longer needed since backend handles record ID internally
export const getUserRecordId = async (firebaseUid) => {
    // This is now handled on the backend
    // Return the UID itself as it's used by the backend
    return firebaseUid;
};

export const createFileRecord = async (fileData) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: fileData.userId,
                originalName: fileData.originalName,
                newName: fileData.newName,
                size: fileData.size,
                url: fileData.url,
                userTier: fileData.userTier || 'Sandbox',
                pageCount: fileData.pageCount || null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to create file record: ${data.error}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to create file record:", error);
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
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to update top-up credits:", error);
        throw error;
    }
};

/**
 * Submit a contact form to Airtable
 * @param {object} formData - Contact form data { name, email, message }
 * @returns {Promise<object>} Created record
 */
export const submitContactForm = async (formData) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/ContactSubmissions`;
    
    const record = {
        fields: {
            Name: formData.name,
            Email: formData.email,
            Message: formData.message,
            SubmittedDate: new Date().toISOString(),
            Status: 'New'
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ records: [record] })
        });
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.error?.message || 'Unknown error';
            console.error(`Airtable API Error (${response.status}): ${errorMsg}`);
            throw new Error(`Airtable API error: ${response.status} - ${errorMsg}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to submit contact form:", error);
        throw error;
    }
};

/**
 * Update user tier in Airtable
 * @param {string} userId - The user's Firebase ID
 * @param {string} newTier - New tier (Sandbox, Standard, Volume)
 * @returns {Promise<object>} Updated user record
 */
export const updateUserTier = async (userId, newTier) => {
    try {
        const userRecordId = await getUserRecordId(userId);
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                fields: {
                    'Tier': newTier,
                    'TierUpdatedDate': new Date().toISOString()
                }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to update user tier:", error);
        throw error;
    }
};

/**
 * Update user subscription details in Airtable
 * @param {string} userId - The user's Firebase ID
 * @param {object} subscriptionData - Subscription details to update
 * @returns {Promise<object>} Updated user record
 */
export const updateUserSubscription = async (userId, subscriptionData) => {
    try {
        const userRecordId = await getUserRecordId(userId);
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
        
        const fields = {};
        
        // Map subscription data to Airtable fields
        if (subscriptionData.subscriptionTier) {
            fields['Tier'] = subscriptionData.subscriptionTier;
        }
        if (subscriptionData.subscriptionStatus !== undefined) {
            fields['SubscriptionStatus'] = subscriptionData.subscriptionStatus;
        }
        if (subscriptionData.lastPaymentDate) {
            fields['LastPaymentDate'] = subscriptionData.lastPaymentDate;
        }
        if (subscriptionData.stripePaymentIntentId) {
            fields['StripePaymentIntentId'] = subscriptionData.stripePaymentIntentId;
        }
        if (subscriptionData.stripeSubscriptionId) {
            fields['StripeSubscriptionId'] = subscriptionData.stripeSubscriptionId;
        }
        if (subscriptionData.stripeSubscriptionStatus) {
            fields['StripeSubscriptionStatus'] = subscriptionData.stripeSubscriptionStatus;
        }
        if (subscriptionData.autoRenewal !== undefined) {
            fields['AutoRenewal'] = subscriptionData.autoRenewal;
        }
        if ('subscriptionEndDate' in subscriptionData) {
            fields['SubscriptionEndDate'] = subscriptionData.subscriptionEndDate;
        }
        if ('pendingTier' in subscriptionData) {
            fields['PendingTier'] = subscriptionData.pendingTier;
        }
        if ('pendingActivationDate' in subscriptionData) {
            fields['PendingActivationDate'] = subscriptionData.pendingActivationDate;
        }
        if (subscriptionData.topupCreditsAdded) {
            // Get current credits and add the new ones
            const currentUser = await getUser(userId);
            const currentCredits = currentUser?.TopUpCredits || 0;
            fields['TopUpCredits'] = currentCredits + subscriptionData.topupCreditsAdded;
        }
        if (subscriptionData.lastTopupDate) {
            fields['LastTopupDate'] = subscriptionData.lastTopupDate;
        }
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to update user subscription:", error);
        throw error;
    }
};