import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import usePdfStore from '../store/pdfStore';

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

  /**
   * Handle file selection from input
   * @param {Event} event - The file input change event
   */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && validatePdfFile(file)) {
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
  const handleStartLearning = () => {
    if (pdfFile) {
      navigate('/slides');
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
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
                browse files
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
            <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
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
                <span className="text-sm font-medium text-gray-700 truncate">
                  {pdfFile.name}
                </span>
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
            disabled={!pdfFile || !!error}
            className={`mt-8 w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
              pdfFile && !error
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Learning →
          </button>

          {/* Additional Info */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Supported format: PDF • Maximum file size: 50MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

