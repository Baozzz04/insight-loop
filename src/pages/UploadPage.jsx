import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePdfStore from '../store/pdfStore';
import { saveDocument, getAllDocuments, getDocument, deleteDocument } from '../utils/db';

/**
 * UploadPage Component
 * 
 * Allows users to upload a PDF file and navigate to the slides page to start learning.
 * 
 * Features:
 * - PDF file upload with validation
 * - Error handling for invalid files
 * - Integration with Zustand store for state management
 * - Navigation to slides page after upload
 * - File removal/cancel functionality
 */
const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Zustand store for PDF file management
  const { pdfFile, setPdfFile, clearPdfFile } = usePdfStore();

  // Local component state
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  /**
   * Validate if the uploaded file is a valid PDF
   * @param {File} file - The file to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  const validatePdfFile = (file) => {
    if (!file) {
      return false;
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return false;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return false;
    }

    setError('');
    return true;
  };

  /**
   * Handle file removal/cancel
   */
  const handleRemoveFile = () => {
    clearPdfFile();
    setError('');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load recent documents on mount
  useEffect(() => {
    loadRecentDocuments();
  }, []);

  // Reload recent documents when pdfFile changes (e.g., when coming back from slides page)
  useEffect(() => {
    if (pdfFile) {
      // File is already in store, make sure recent documents are up to date
      loadRecentDocuments();
    }
  }, [pdfFile]);

  /**
   * Load recent documents from IndexedDB
   */
  const loadRecentDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const documents = await getAllDocuments();
      setRecentDocuments(documents);
    } catch (error) {
      console.error('Error loading recent documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  /**
   * Handle loading a document from IndexedDB
   */
  const handleLoadDocument = async (documentId) => {
    // If this document is already loaded, just navigate to slides
    const { documentId: currentDocId } = usePdfStore.getState();
    if (currentDocId === documentId && pdfFile) {
      navigate('/slides');
      return;
    }

    try {
      setIsLoading(true);
      const file = await getDocument(documentId);
      setPdfFile(file, documentId);
      // Reload recent documents to update last accessed time
      await loadRecentDocuments();
      // Navigate to slides page after loading
      navigate('/slides');
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document');
      setIsLoading(false);
    }
  };

  /**
   * Handle deleting a document
   */
  const handleDeleteDocument = async (documentId, event) => {
    event.stopPropagation(); // Prevent loading the document when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this document? All progress and chat history will be lost.')) {
      return;
    }

    try {
      await deleteDocument(documentId);
      // Reload recent documents
      await loadRecentDocuments();
      
      // If the deleted document was currently selected, clear it
      const { documentId: currentDocId } = usePdfStore.getState();
      if (currentDocId === documentId) {
        clearPdfFile();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  /**
   * Handle file selection from input
   * @param {Event} event - The file input change event
   */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && validatePdfFile(file)) {
      // Just set the file in store, don't save to IndexedDB yet
      setPdfFile(file);
    } else {
      setPdfFile(null);
    }
  };

  /**
   * Handle drag over event
   * @param {DragEvent} event - The drag event
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  /**
   * Handle drag leave event
   * @param {DragEvent} event - The drag event
   */
  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  /**
   * Handle file drop
   * @param {DragEvent} event - The drop event
   */
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && validatePdfFile(file)) {
      // Just set the file in store, don't save to IndexedDB yet
      setPdfFile(file);
      // Update the file input to reflect the dropped file
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  /**
   * Handle navigation to slides page
   */
  const handleStartLearning = async () => {
    if (pdfFile) {
      try {
        setIsLoading(true);
        // Save to IndexedDB only when starting learning
        const documentId = await saveDocument(pdfFile);
        setPdfFile(pdfFile, documentId);
        // Reload recent documents to show the new one
        await loadRecentDocuments();
        // Navigate to slides page
        navigate('/slides');
      } catch (error) {
        console.error('Error saving document:', error);
        setError('Failed to save document. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="max-w-7xl w-full mx-auto">
        {/* Connected Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1px_1fr] items-start">
            {/* Main Upload Area */}
            <div className="flex items-center justify-center p-8 md:p-12 min-h-0">
              <div className="w-full max-w-2xl">
          {/* Brand Name */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-4xl md:text-5xl font-bold text-blue-600">
                InsightLoop
              </span>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-xl md:text-2xl font-semibold text-gray-700 text-center mb-2">
            Upload Your Learning Material
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Upload a PDF document to start your interactive learning session
          </p>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              {/* Upload Icon */}
              <svg
                className="w-16 h-16 text-indigo-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              {/* Upload Text */}
              <p className="text-gray-700 font-medium mb-2">
                Drag and drop your PDF here, or
              </p>
              <button
                onClick={handleBrowseClick}
                className="text-indigo-600 hover:text-indigo-700 font-semibold underline mb-4"
              >
                Browse File
              </button>

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Uploaded File Display */}
          {pdfFile && !error && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate block">
                    {pdfFile.name}
                  </span>
                  <span className="text-xs text-blue-600 font-medium">Currently loaded</span>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="ml-3 p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex-shrink-0"
                title="Remove file"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Start Learning Button */}
          <button
            onClick={handleStartLearning}
            disabled={!pdfFile || !!error || isLoading}
            className={`mt-8 w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
              pdfFile && !error && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </span>
            ) : (
              'Start Learning →'
            )}
          </button>

          {/* Additional Info */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Supported format: PDF • Maximum file size: 50MB
          </p>
              </div>
            </div>

            {/* Divider Line - Vertical for desktop, Horizontal for mobile */}
            <div className="hidden lg:block bg-gray-300 self-stretch"></div>
            <div className="lg:hidden w-full h-px bg-gray-300 my-4"></div>

            {/* Sidebar - Recent Documents */}
            <div className="p-8 md:p-12 flex flex-col h-full">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Documents
            </h2>

            {isLoadingDocuments ? (
              <div className="flex items-center justify-center flex-1 text-center py-8">
                <div className="flex flex-col items-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading...</p>
                </div>
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium text-gray-600 mb-2">No recent documents</p>
                <p className="text-sm text-gray-500">Upload a PDF to get started</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleLoadDocument(doc.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      usePdfStore.getState().documentId === doc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-gray-700 truncate" title={doc.fileName}>
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600">{formatFileSize(doc.fileSize)}</p>
                            <span className="text-gray-300">•</span>
                            <p className="text-sm text-gray-600">{formatDate(doc.lastAccessedAt)}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200 flex-shrink-0"
                        title="Delete document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

