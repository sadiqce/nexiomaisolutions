// Airtable Configuration
const AIRTABLE_CONFIG = {
    baseId: import.meta.env.VITE_AIRTABLE_BASE_ID ,
    apiKey: import.meta.env.VITE_AIRTABLE_API_KEY,
    usersTable: 'Users',
    filesTable: 'Files'
};

const headers = {
    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
    'Content-Type': 'application/json'
};

// Debug: Log config on load (remove in production)
if (!AIRTABLE_CONFIG.baseId || !AIRTABLE_CONFIG.apiKey) {
    console.error('Missing Airtable credentials. Check VITE_AIRTABLE_BASE_ID and VITE_AIRTABLE_API_KEY env vars');
}

// --- USER FUNCTIONS ---

export const checkUserExists = async (field, value) => {
    // Filter formula: ({Field} = 'value')
    const formula = `({${field}} = '${value}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.error?.message || 'Unknown error';
            console.error(
                `Airtable API Error (${response.status}): ${errorMsg}\n` +
                `Table: ${AIRTABLE_CONFIG.usersTable}\n` +
                `Field: ${field}\n` +
                `Value: ${value}`
            );
            throw new Error(`Airtable API error: ${response.status} - ${errorMsg}`);
        }
        
        return data.records.length > 0;
    } catch (error) {
        console.error("Error checking user existence:", error);
        throw error;
    }
};

export const createAirtableUser = async (userData) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}`;
    
    const record = {
        fields: {
            Username: userData.username,
            Email: userData.email,
            UserID: userData.uid, // Firebase Auth ID
            CreatedDate: new Date().toISOString(),
            Tier: 'Free'
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
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error("Failed to create Airtable user:", error);
        throw error;
    }
};

export const getUser = async (uid) => {
    const formula = `({UserID} = '${uid}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        if (data.records.length === 0) {
            return null;
        }
        
        return data.records[0].fields;
    } catch (error) {
        console.error("Failed to get user:", error);
        throw error;
    }
}

// --- FILE FUNCTIONS ---

export const fetchUserFiles = async (userId) => {
    try {
       
        // Filter files by the user's Airtable Record ID
        const formula = `({UserID} = '${userId}')`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}?filterByFormula=${encodeURIComponent(formula)}`;

        const response = await fetch(url, { headers });
        const data = await response.json();
        console.log('Airtable API response:', data);
        
        if (!response.ok) {
            console.error(
                `Airtable API Error (${response.status}):\n` +
                `Table: ${AIRTABLE_CONFIG.filesTable}\n` +
                `Error: ${data.error?.message || 'Unknown error'}`
            );
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        // Map Airtable records to a cleaner format for our UI
        return data.records.map(record => ({
            id: record.id,
            originalName: record.fields['OriginalFileName'],
            newName: record.fields['NewFileName'],
            size: record.fields['FileSize'],
            uploadDate: record.fields['UploadTimestamp'], // Use UploadTimestamp from Airtable
            url: record.fields['DownloadLink'], // Changed from downloadLink to url
            status: 'Uploaded', // Default status since it's in the DB
            pageCount: record.fields['PageCount'] || null // Include page count if available
        }));
    } catch (error) {
        console.error("Failed to fetch files:", error);
        return [];
    }
};

// Helper function to get Airtable User record ID by Firebase UID
export const getUserRecordId = async (firebaseUid) => {
    const formula = `({UserID} = '${firebaseUid}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}?filterByFormula=${encodeURIComponent(formula)}`;

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to get user record: ${data.error?.message}`);
        }
        
        if (data.records.length === 0) {
            throw new Error(`User with UID ${firebaseUid} not found in Airtable`);
        }
        
        return data.records[0].id; // Return the Airtable record ID
    } catch (error) {
        console.error("Error getting user record ID:", error);
        throw error;
    }
};

export const createFileRecord = async (fileData) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}`;
    
    try {
        // Get the Airtable User record ID first
        const userRecordId = await getUserRecordId(fileData.userId);
         console.log('User Record ID:', userRecordId);
         
        const uploadTimestamp = fileData.uploadTimestamp || new Date().toISOString();
        
        const record = {
            fields: {
                "OriginalFileName": fileData.originalName,
                "NewFileName": fileData.newName,
                "FileSize": fileData.size,
                "UploadTimestamp": uploadTimestamp,
                "DownloadLink": fileData.url,
                "UserID": [userRecordId], // Pass as array of record IDs for linked field
                "UserTier": fileData.userTier || 'Sandbox', // Add tier tracking
                "PageCount": fileData.pageCount || null, // Store PDF page count if extracted
                "Status": "Pending" // Initial status
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ records: [record] })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Airtable API Error:', response.status, data.error?.message);
            throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
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
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Get user record first
        const userRecordId = await getUserRecordId(userId);
        
        // Filter formula to get files uploaded this month
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        const formula = `AND({UserID} = '${userRecordId}', IS_AFTER({UploadTimestamp}, '${monthStart}'), IS_BEFORE({UploadTimestamp}, '${monthEnd}'))`;
        
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.filesTable}?filterByFormula=${encodeURIComponent(formula)}`;
        
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        return {
            monthKey: currentMonth,
            filesThisMonth: data.records.length,
            records: data.records,
            tierInfo: data.records.length > 0 ? data.records[0].fields.UserTier : null
        };
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
 * Track top-up pack usage for a user
 * @param {string} userId - The user's Firebase ID
 * @returns {Promise<number>} Available top-up credits
 */
export const getTopUpCredits = async (userId) => {
    try {
        // Get user record
        const user = await getUser(userId);
        
        if (!user || !user.TopUpCredits) {
            return 0;
        }
        
        return user.TopUpCredits;
    } catch (error) {
        console.error("Failed to get top-up credits:", error);
        return 0;
    }
};

/**
 * Update top-up credits for a user
 * @param {string} userId - The user's Firebase ID
 * @param {number} creditsToAdd - Number of credits to add (can be negative to subtract)
 * @returns {Promise<object>} Updated user record
 */
export const updateTopUpCredits = async (userId, creditsToAdd) => {
    try {
        const userRecordId = await getUserRecordId(userId);
        const currentCredits = await getTopUpCredits(userId);
        const newCredits = Math.max(0, currentCredits + creditsToAdd);
        
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.usersTable}/${userRecordId}`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                fields: {
                    'TopUpCredits': newCredits
                }
            })
        });
        
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