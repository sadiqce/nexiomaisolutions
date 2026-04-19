/**
 * Extract metadata from Word documents (.docx files)
 * DOCX files are ZIP archives containing XML files
 */

/**
 * Get page count from a DOCX file
 * @param {File} file - The DOCX file object
 * @returns {Promise<number|null>} Page count or null if unable to extract
 */
export const getDocxPageCount = async (file) => {
  // Only process DOCX files
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return null;
  }

  try {
    // Import JSZip for reading DOCX structure
    const { default: JSZip } = await import('jszip');
    
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);

    // Try to read the document properties
    // DOCX files contain document properties in docProps/core.xml or document.xml.rels
    let pageCount = null;

    // Method 1: Check docProps/core.xml for page count metadata
    try {
      const corePropsFile = zip.file('docProps/core.xml');
      if (corePropsFile) {
        const corePropsXml = await corePropsFile.async('text');
        // Try to find pages element in XML
        const pagesMatch = corePropsXml.match(/<cp:pages>(\d+)<\/cp:pages>/);
        if (pagesMatch) {
          pageCount = parseInt(pagesMatch[1], 10);
        }
      }
    } catch (e) {
      console.warn('Could not read core properties from DOCX:', e);
    }

    // Method 2: If no page count found, try estimating from document.xml
    if (!pageCount) {
      try {
        const docFile = zip.file('word/document.xml');
        if (docFile) {
          const docXml = await docFile.async('text');
          // Count paragraph marks (rough estimation)
          // This is a fallback and may not be accurate
          const paragraphs = (docXml.match(/<w:p[\s>]/g) || []).length;
          // Rough heuristic: ~50-60 paragraphs per page
          pageCount = Math.max(1, Math.ceil(paragraphs / 55));
        }
      } catch (e) {
        console.warn('Could not estimate page count from document.xml:', e);
      }
    }

    return pageCount;
  } catch (error) {
    console.warn('Failed to extract DOCX page count:', error);
    return null;
  }
};

/**
 * Check if a DOCX file exceeds page limit
 * @param {File} file - The DOCX file object
 * @param {number} maxPages - Maximum allowed pages
 * @returns {Promise<{valid: boolean, pageCount: number|null, message: string}>}
 */
export const validateDocxPageCount = async (file, maxPages) => {
  const pageCount = await getDocxPageCount(file);

  if (pageCount === null) {
    // If we can't extract page count, allow the upload
    // (for older DOC format or compatibility)
    return { valid: true, pageCount: null, message: '' };
  }

  if (pageCount > maxPages) {
    return {
      valid: false,
      pageCount,
      message: `Word document has approximately ${pageCount} pages but your plan limit is ${maxPages} pages. Please upload a document with fewer pages.`
    };
  }

  return { valid: true, pageCount, message: '' };
};

/**
 * Check page count for any supported document format
 * @param {File} file - The file object
 * @param {number} maxPages - Maximum allowed pages
 * @returns {Promise<{valid: boolean, pageCount: number|null, message: string}>}
 */
export const validateDocumentPageCount = async (file, maxPages) => {
  const fileName = file.name.toLowerCase();

  // Check for PDF
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    const { validatePdfPageCount } = await import('./pdfUtils.js');
    return validatePdfPageCount(file, maxPages);
  }

  // Check for DOCX
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return validateDocxPageCount(file, maxPages);
  }

  // For other formats (DOC, images, etc.), we can't extract page count
  return { valid: true, pageCount: null, message: '' };
};
