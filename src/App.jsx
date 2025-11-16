import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SlidesPage from './pages/SlidesPage';

/**
 * Main App Component
 * 
 * Sets up routing for the PDF learning application.
 * 
 * Routes:
 * - / : Upload page where users can upload PDF files
 * - /slides : Slides page where users view and interact with uploaded content
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/slides" element={<SlidesPage />} />
      </Routes>
    </Router>
  );
}

export default App;

