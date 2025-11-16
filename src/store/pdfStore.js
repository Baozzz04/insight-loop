import { create } from 'zustand';

/**
 * Zustand store for managing PDF file state across the application
 * 
 * @typedef {Object} PDFStore
 * @property {File|null} pdfFile - The uploaded PDF file object
 * @property {string|null} pdfFileName - Name of the uploaded PDF file
 * @property {Function} setPdfFile - Function to set the PDF file
 * @property {Function} clearPdfFile - Function to clear/reset the PDF file
 */
const usePdfStore = create((set) => ({
  // Current PDF file stored in state
  pdfFile: null,
  
  // PDF file name for display purposes
  pdfFileName: null,

  /**
   * Set the PDF file in the store
   * @param {File} file - The PDF file to store
   */
  setPdfFile: (file) => set({ 
    pdfFile: file,
    pdfFileName: file?.name || null
  }),

  /**
   * Clear the PDF file from the store
   */
  clearPdfFile: () => set({ 
    pdfFile: null,
    pdfFileName: null
  }),
}));

export default usePdfStore;

