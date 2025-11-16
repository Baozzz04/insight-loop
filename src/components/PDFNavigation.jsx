/**
 * PDFNavigation Component
 * Navigation controls for PDF pages (previous, next, page input)
 */
const PDFNavigation = ({
  currentPage,
  numPages,
  isRendering,
  onPrevious,
  onNext,
  onPageInput,
  onPageInputBlur
}) => {
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {/* Navigation Buttons and Page Counter */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrevious}
          disabled={currentPage <= 1 || isRendering}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        
        {/* Page Counter */}
        <div className="flex items-center gap-3 px-4">
          <span className="text-sm text-gray-600">Page</span>
          <input
            type="number"
            min="1"
            max={numPages || 1}
            value={currentPage}
            onChange={onPageInput}
            onBlur={onPageInputBlur}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-600">of {numPages || '...'}</span>
        </div>
        
        <button
          onClick={onNext}
          disabled={currentPage >= numPages || isRendering}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
        >
          Next
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <p className="text-xs text-gray-500 text-center">
        💡 Use arrow keys (← →) or (↑ ↓) to navigate between pages
      </p>
    </div>
  );
};

export default PDFNavigation;

