// Tier configuration with hard limits
export const TIER_CONFIG = {
  'Sandbox': {
    monthlyLimit: 5,
    maxFileSize: 2 * 1024 * 1024, // 2 MB
    maxPages: 2,
    retentionDays: 1, // 24 hours
    priorityProcessing: false,
    supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'],
    price: 0,
  },
  'Standard': {
    monthlyLimit: 100,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxPages: 10,
    retentionDays: 7,
    priorityProcessing: false,
    supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'],
    price: 49,
  },
  'Volume': {
    monthlyLimit: 500,
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    maxPages: 25,
    retentionDays: 14,
    priorityProcessing: true,
    supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'],
    price: 149,
  },
};

// Calculate current month key for usage tracking
const getMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Get the tier configuration for a user
 * @param {string} userTier - The user's plan tier (Sandbox, Standard, Volume)
 * @returns {object} Tier configuration object
 */
export const getTierConfig = (userTier) => {
  return TIER_CONFIG[userTier] || TIER_CONFIG['Sandbox'];
};

/**
 * Check if a file is within the size limit for the user's tier
 * @param {number} fileSize - File size in bytes
 * @param {string} userTier - User's tier
 * @returns {object} { isValid, message }
 */
export const validateFileSize = (fileSize, userTier) => {
  const config = getTierConfig(userTier);
  
  if (fileSize > config.maxFileSize) {
    const maxSizeMB = (config.maxFileSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      message: `File size (${fileSizeMB}MB) exceeds your plan limit of ${maxSizeMB}MB`
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Check if file format is supported
 * @param {string} fileName - The file name
 * @param {string} userTier - User's tier
 * @returns {object} { isValid, message }
 */
export const validateFileFormat = (fileName, userTier) => {
  const config = getTierConfig(userTier);
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (!config.supportedFormats.includes(extension)) {
    return {
      isValid: false,
      message: `File format (.${extension}) is not supported. Supported formats: ${config.supportedFormats.join(', ')}`
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Check current monthly usage and limits
 * @param {number} currentMonthlyUsage - Current usage for the month
 * @param {number} topUpCredits - Available top-up credits
 * @param {string} userTier - User's tier
 * @returns {object} { canUpload, remainingCapacity, totalCapacity, message }
 */
export const checkMonthlyLimit = (currentMonthlyUsage, topUpCredits, userTier) => {
  const config = getTierConfig(userTier);
  const monthlyCapacity = config.monthlyLimit + topUpCredits;
  const remainingCapacity = monthlyCapacity - currentMonthlyUsage;
  
  return {
    canUpload: remainingCapacity > 0,
    remainingCapacity,
    totalCapacity: monthlyCapacity,
    usedCapacity: currentMonthlyUsage,
    tierLimit: config.monthlyLimit,
    topUpCredits,
    message: remainingCapacity > 0 
      ? `You have ${remainingCapacity} document(s) remaining this month`
      : `Monthly limit of ${monthlyCapacity} documents reached. Upgrade your plan or purchase top-ups to continue.`
  };
};

/**
 * Check page count (if available)
 * @param {number} pageCount - Number of pages in document
 * @param {string} userTier - User's tier
 * @returns {object} { isValid, message }
 */
export const validatePageCount = (pageCount, userTier) => {
  const config = getTierConfig(userTier);
  
  if (pageCount && pageCount > config.maxPages) {
    return {
      isValid: false,
      message: `Document exceeds ${config.maxPages} page limit for ${userTier} plan`
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Comprehensive validation before upload
 * @param {object} file - File object with name and size
 * @param {number} currentMonthlyUsage - Current usage for the month
 * @param {number} topUpCredits - Available top-up credits
 * @param {string} userTier - User's tier
 * @param {number} pageCount - Page count (optional)
 * @returns {object} { isValid, errors, warnings }
 */
export const validateUpload = (
  file,
  currentMonthlyUsage,
  topUpCredits,
  userTier,
  pageCount = null
) => {
  const errors = [];
  const warnings = [];

  // Check file format
  const formatCheck = validateFileFormat(file.name, userTier);
  if (!formatCheck.isValid) {
    errors.push(formatCheck.message);
  }

  // Check file size
  const sizeCheck = validateFileSize(file.size, userTier);
  if (!sizeCheck.isValid) {
    errors.push(sizeCheck.message);
  }

  // Check monthly limit
  const limitCheck = checkMonthlyLimit(currentMonthlyUsage, topUpCredits, userTier);
  if (!limitCheck.canUpload) {
    errors.push(limitCheck.message);
  } else {
    // Warning if getting close to limit
    if (limitCheck.remainingCapacity <= 10) {
      warnings.push(
        `⚠️ Warning: You have only ${limitCheck.remainingCapacity} document(s) remaining this month`
      );
    }
  }

  // Check page count if provided
  if (pageCount) {
    const pageCheck = validatePageCount(pageCount, userTier);
    if (!pageCheck.isValid) {
      errors.push(pageCheck.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      monthlyUsage: limitCheck.usedCapacity,
      monthlyCapacity: limitCheck.totalCapacity,
      remainingCapacity: limitCheck.remainingCapacity,
      userTier,
      timestamp: new Date().toISOString(),
    }
  };
};

/**
 * Get top-up pack options
 * @returns {array} Array of top-up pack options
 */
export const getTopUpPacks = () => {
  return [
    {
      id: 'topup-20',
      documents: 50,
      price: 20,
      effectiveRate: 0.40,
      popular: true
    },
    {
      id: 'topup-35',
      documents: 100,
      price: 35,
      effectiveRate: 0.35,
      savings: 'Save $5'
    }
  ];
};

/**
 * Calculate billing for a plan
 * @param {string} userTier - User's tier
 * @returns {object} Billing information
 */
export const getPlanBilling = (userTier) => {
  const config = TIER_CONFIG[userTier] || TIER_CONFIG['Sandbox'];
  
  if (config.price === 0) {
    return {
      monthlyPrice: 0,
      monthlyLimit: config.monthlyLimit,
      effectiveRate: 'Free',
      billing: 'No payment required'
    };
  }

  const effectiveRate = (config.price / config.monthlyLimit).toFixed(2);
  
  return {
    monthlyPrice: config.price,
    monthlyLimit: config.monthlyLimit,
    effectiveRate: `$${effectiveRate}/file`,
    billing: `$${config.price}/month`
  };
};
