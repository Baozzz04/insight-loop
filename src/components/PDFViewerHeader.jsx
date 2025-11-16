/**
 * PDFViewerHeader Component
 * Header with branding, file info, back button, and zoom controls
 */
const PDFViewerHeader = ({ pdfFileName, scale, isRendering, onBack, onZoomIn, onZoomOut, onZoomReset }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
      {/* Left: Branding and File Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-blue-600">InsightLoop</span>
            <span className="text-gray-400">•</span>
            <h1 className="text-xl font-bold text-gray-800">{pdfFileName}</h1>
          </div>
        </div>
      </div>

      {/* Right: Back Button and Zoom Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors duration-200 text-sm whitespace-nowrap"
        >
          ← Back
        </button>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            disabled={scale <= 0.5 || isRendering}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            title="Zoom Out"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          
          <span className="text-sm text-gray-600 font-medium min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={onZoomIn}
            disabled={scale >= 3 || isRendering}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            title="Zoom In"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          
          <button
            onClick={onZoomReset}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-gray-700 font-medium"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerHeader;

