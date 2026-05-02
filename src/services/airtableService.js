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