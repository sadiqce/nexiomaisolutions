/**
 * Extract page count from a PDF file
 * Uses PDF.js for client-side parsing
 */

let pdfjsLib = null;

/**
 * Initialize PDF.js library
 * @returns {Promise<void>}
 */
const initPdfJs = async () => {
  if (pdfjsLib) return;
  
  try {
    // Dynamically import pdfjs-dist
    const pdfjsModule = await import('pdfjs-dist');
    pdfjsLib = pdfjsModule;
    
    // Set up worker
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker?worker');
    pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker.default();
  } catch (error) {
    console.warn('PDF.js library not available for page count detection:', error);
    return null;
  }
};

/**
 * Get page count from a PDF file
 * @param {File} file - The PDF file object
 * @returns {Promise<number|null>} Page count or null if unable to extract
 */
export const getPdfPageCount = async (file) => {
  // Only process PDF files
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return null;
  }

  try {
    // Initialize PDF.js if not already done
    await initPdfJs();
    
    if (!pdfjsLib) {
      return null;
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Return page count
    return pdf.numPages;
  } catch (error) {
    console.warn('Failed to extract PDF page count:', error);
    return null;
  }
};

/**
 * Check if a PDF exceeds page limit
 * @param {File} file - The PDF file object
 * @param {number} maxPages - Maximum allowed pages
 * @returns {Promise<{valid: boolean, pageCount: number|null, message: string}>}
 */
export const validatePdfPageCount = async (file, maxPages) => {
  const pageCount = await getPdfPageCount(file);
  
  if (pageCount === null) {
    // If we can't extract page count, allow the upload
    return { valid: true, pageCount: null, message: '' };
  }
  
  if (pageCount > maxPages) {
    return {
      valid: false,
      pageCount,
      message: `PDF has ${pageCount} pages but your plan limit is ${maxPages} pages. Please upload a document with fewer pages.`
    };
  }
  
  return { valid: true, pageCount, message: '' };
};
