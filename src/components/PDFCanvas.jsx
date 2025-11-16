/**
 * PDFCanvas Component
 * Displays the PDF canvas with loading states
 */
const PDFCanvas = ({ canvasRef, pdfDoc, isRendering, showExplanationPopup }) => {
  return (
    <div className="relative flex justify-center items-start min-h-[600px] max-h-[calc(100vh-300px)] bg-gray-50 rounded-lg p-4 overflow-auto">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 text-sm">Loading page...</p>
          </div>
        </div>
      )}
      
      {pdfDoc && (
        <div className={`relative transition-all duration-300 ${showExplanationPopup ? 'blur-md' : ''}`}>
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto shadow-lg rounded border border-gray-200"
          />
        </div>
      )}

      {!pdfDoc && !isRendering && (
        <div className="text-center py-12">
          <div className="inline-block p-6 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-16 h-16 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      )}
    </div>
  );
};

export default PDFCanvas;

