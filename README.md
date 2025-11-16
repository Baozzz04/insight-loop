# InsightLoop

InsightLoop is an interactive PDF learning platform that combines intelligent voice analysis with an AI-powered tutor to help students learn more effectively from educational materials. The platform provides real-time confusion detection, personalized explanations, and interactive learning sessions through voice-based interaction.

## 🎯 Application Description

InsightLoop is a modern web application designed to revolutionize how students learn from PDF documents. Key features include:

- **Interactive PDF Viewer**: Upload and view PDF documents with page-by-page navigation, zoom controls, and keyboard shortcuts
- **Voice-Based Learning**: Record voice explanations of concepts with real-time waveform visualization
- **Intelligent Confusion Detection**: Advanced algorithms analyze voice patterns (silence detection and pitch contour analysis) to detect when users are confused or uncertain
- **AI Tutor Panel**: Interactive chat interface for asking questions and receiving guidance
- **Smart Learning Flow**: Automatically prompts for explanations on new pages and when confusion is detected
- **Text Extraction**: Extracts text content from PDF pages for contextual learning support

The platform uses WebRTC Voice Activity Detection (VAD) and pitch analysis to understand user comprehension levels, enabling personalized learning experiences that adapt to individual needs.

## 👥 Team Members

**Eligible Individuals on the Team:**

- **Bao Nguyen** - Email: nnbao04@gmail.com
- **Giap Nguyen** - Email: giapnguyen@gmail.com

## 🚀 Setup Instructions from Scratch

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v16.0.0 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** package manager

To verify your installation, run:
```bash
node --version
npm --version
```

### Installation Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd /path/to/insight-loop
   ```

2. **Install all project dependencies:**
   ```bash
   npm install
   ```
   
   This will install all required packages including:
   - React 18.2.0
   - React Router DOM 6.20.0
   - Zustand (state management)
   - PDF.js (PDF rendering)
   - WebRTC VAD (voice activity detection)
   - Tailwind CSS (styling)
   - Vite (build tool)

3. **Verify installation:**
   Ensure that the `node_modules` directory has been created and all dependencies are installed without errors.

### Dependencies

The project includes the following key dependencies:

**Runtime Dependencies:**
- `react` (^18.2.0) - React library for building user interfaces
- `react-dom` (^18.2.0) - React DOM rendering
- `react-router-dom` (^6.20.0) - Client-side routing
- `zustand` (^4.4.7) - Lightweight state management
- `pdfjs-dist` (^3.11.174) - PDF.js library for PDF rendering
- `@ricky0123/vad-web` (^0.0.29) - WebRTC Voice Activity Detection

**Development Dependencies:**
- `vite` (^5.0.8) - Fast build tool and development server
- `@vitejs/plugin-react` (^4.2.1) - Vite plugin for React
- `tailwindcss` (^3.3.6) - Utility-first CSS framework
- `postcss` (^8.4.32) - CSS post-processor
- `autoprefixer` (^10.4.16) - CSS vendor prefixing
- `@types/react` & `@types/react-dom` - TypeScript type definitions

## 💻 Run and Usage Instructions

### Running the Development Server

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   - The application will automatically open in your default browser
   - If not, navigate to the URL shown in the terminal (typically `http://localhost:5173`)
   - The port may vary if 5173 is already in use

3. **Development server features:**
   - Hot module replacement (HMR) - changes reflect instantly
   - Automatic browser refresh on file changes
   - Source maps for debugging

### Building for Production

To create an optimized production build:

```bash
npm run build
```

This creates a `dist/` directory with optimized and minified files ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

### Usage Instructions

#### 1. **Upload a PDF Document**

- On the home page, either:
  - **Drag and drop** a PDF file into the upload area, or
  - Click **"browse files"** to select a PDF from your computer
- Supported files: PDF format only
- Maximum file size: 50MB
- Once uploaded, a preview of the first page will appear
- Click **"Start Learning →"** to begin your session

#### 2. **Navigate Through PDF Pages**

**Navigation Methods:**
- **Page Controls**: Use the Previous/Next buttons at the bottom
- **Keyboard Shortcuts**:
  - `←` or `↑` - Previous page
  - `→` or `↓` - Next page
- **Direct Page Input**: Type the page number in the input field and press Enter

**Zoom Controls:**
- Click the `+` button to zoom in
- Click the `-` button to zoom out
- Click the reset icon to return to default zoom (2.0x)

#### 3. **Learning Session Workflow**

**For New Pages:**
- When navigating to a page you haven't visited, a popup will appear
- You'll be prompted to explain the concept on that page
- Click **"Start Recording"** to begin your voice explanation
- Speak clearly while explaining the concept
- Click **"Stop Recording"** when finished (or it will auto-stop after 2 minutes)
- The system analyzes your explanation for comprehension
- If you demonstrate good understanding, you'll automatically move to the next page
- If confusion is detected, you'll stay on the current page and receive clarification prompts

**Confusion Detection:**
- The system monitors your voice for:
  - Silence percentage (pauses in speech)
  - Pitch contour patterns (vocal uncertainty)
- If confusion is detected, the AI tutor will ask specific clarifying questions
- You can choose to:
  - Ask questions via the chat panel
  - Try explaining again
  - Navigate away manually

#### 4. **AI Tutor Panel**

**Located on the right side of the screen:**
- **Chat Interface**: Type questions in the input field and press Enter
- **Message History**: View your conversation with the AI tutor
- **Voice Waveform**: Visual feedback when recording (animated bars)

**Tips for Best Results:**
- Speak clearly and at a moderate pace
- Minimize background noise when recording
- Provide complete explanations rather than single words
- Use the chat feature for specific questions about concepts

#### 5. **Keyboard Shortcuts Summary**

- `←` / `↑` - Navigate to previous page
- `→` / `↓` - Navigate to next page
- `Enter` (in chat) - Send message

### Troubleshooting

**Microphone Access Issues:**
- Ensure your browser has microphone permissions
- Chrome/Edge recommended for best compatibility
- Check browser settings: Settings → Privacy → Microphone

**PDF Not Rendering:**
- Ensure the PDF file is not corrupted
- Try a different PDF file
- Check browser console for error messages

**Port Already in Use:**
- Vite will automatically try the next available port
- Or specify a port: `npm run dev -- --port 3000`

**Dependencies Installation Issues:**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure you're using Node.js v16 or higher

## 🛠️ Technology Stack

- **Frontend Framework**: React 18
- **Routing**: React Router v6
- **State Management**: Zustand
- **PDF Rendering**: PDF.js
- **Voice Processing**: WebRTC VAD, Web Audio API
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.