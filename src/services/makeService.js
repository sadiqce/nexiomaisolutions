// Make.com Configuration
const MAKE_CONFIG = {
    webhookUrl: 'https://hook.us2.make.com/r1kkqcj8rkfo22ofu82ist9kmwlvkrbw',
    apiKey: import.meta.env.VITE_AIRTABLE_BASE_ID,
};

const headers = {
    'Content-Type': 'application/json',
    'x-make-apikey': `${MAKE_CONFIG.apiKey}`
};

// --- TRIGGER FUNCTIONS ---

export const triggerMakeScenario = async (userId) => {
    const url = MAKE_CONFIG.webhookUrl;
    
    const payload = {
        userId: userId
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Make.com webhook failed with status: ${response.status} - ${errorText}`);
        }
        
        console.log('Successfully triggered Make.com scenario for userId:', userId);
        return await response;
    } catch (error) {
        console.error("Failed to trigger Make.com scenario:", error);
        throw error;
    }
};

export const triggerMakeScenarioForMultipleFiles = async (userId, files) => {
    const url = MAKE_CONFIG.webhookUrl;
    
    const payload = {
        userId: userId,
        fileNames: files.map(file => file.originalName)
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Make.com webhook failed with status: ${response.status} - ${errorText}`);
        }
        
        console.log(`Successfully triggered Make.com scenario for userId: ${userId} with ${files.length} file(s)`);
        return await response;
    } catch (error) {
        console.error("Failed to trigger Make.com scenario for multiple files:", error);
        throw error;
    }
};
