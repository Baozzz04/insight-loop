import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import usePdfStore from '../store/pdfStore';
import PDFViewerHeader from '../components/PDFViewerHeader';
import PDFCanvas from '../components/PDFCanvas';
import PDFNavigation from '../components/PDFNavigation';
import TutorPanel from '../components/TutorPanel';
import ExplanationPopup from '../components/ExplanationPopup';
import { convertToWav, detectSilenceInWav, detectPitch, analyzePitchContour } from '../utils/audioUtils';
import { getMessages, saveMessage, getProgress, saveProgress } from '../utils/db';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * SlidesPage Component
 * 
 * PDF viewer with page-by-page navigation and interactive controls.
 * Displays the uploaded PDF file with navigation, zoom, and keyboard controls.
 */
const SlidesPage = () => {
  const navigate = useNavigate();
  const { pdfFile, pdfFileName, documentId, clearPdfFile } = usePdfStore();
  const canvasRef = useRef(null);
  
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [scale, setScale] = useState(2.0);
  const [isRendering, setIsRendering] = useState(false);
  const [messages, setMessages] = useState([]);
  const [visitedPages, setVisitedPages] = useState(new Set([1])); // Track visited pages, start with page 1
  const [showExplanationPopup, setShowExplanationPopup] = useState(false);
  const [pageToExplain, setPageToExplain] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isConfused, setIsConfused] = useState(false); // Track if user is confused (silence > 40%)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true); // Track if messages are being loaded
  const recordingIntervalRef = useRef(null);
  const waveformIntervalRef = useRef(null);
  const [waveformHeights, setWaveformHeights] = useState(Array(20).fill(20));
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const dataArrayRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordedAudioRef = useRef(null); // Store the final audio blob
  const pitchDataRef = useRef([]); // Store pitch data for confusion detection
  const extractedTextRef = useRef({}); // Store extracted text per page: { pageNumber: text }

  // Redirect to upload page if no PDF is loaded
  useEffect(() => {
    if (!pdfFile) {
      navigate('/');
    }
  }, [pdfFile, navigate]);

  // Load PDF document, progress, and chat messages
  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfFile) return;

      try {
        setIsRendering(true);
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        // Load saved progress and messages if documentId exists
        if (documentId) {
          try {
            setIsLoadingMessages(true);
            // Load progress
            const savedProgress = await getProgress(documentId);
            if (savedProgress) {
              setCurrentPage(savedProgress.currentPage);
              setVisitedPages(savedProgress.visitedPages);
            } else {
              setCurrentPage(1);
              setVisitedPages(new Set([1]));
            }

            // Load messages (filter out typing indicators)
            const savedMessages = await getMessages(documentId);
            if (savedMessages && savedMessages.length > 0) {
              setMessages(savedMessages
                .filter(msg => msg.text !== '...') // Remove typing indicators
                .map(msg => ({
                  text: msg.text,
                  type: msg.type
                })));
            }
            // Note: Welcome message is handled by the useEffect below to avoid duplicates
          } catch (error) {
            console.error('Error loading saved data:', error);
            // Continue with default values if loading fails
            setCurrentPage(1);
            setVisitedPages(new Set([1]));
          } finally {
            setIsLoadingMessages(false);
          }
        } else {
          setCurrentPage(1);
          setVisitedPages(new Set([1]));
          setIsLoadingMessages(false);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        setPdfDoc(null);
        setNumPages(null);
      } finally {
        setIsRendering(false);
      }
    };

    loadPdf();
  }, [pdfFile, documentId]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Get page rotation (0, 90, 180, or 270 degrees)
        const rotation = page.rotate || 0;
        
        // Create viewport with rotation and scale
        const viewport = page.getViewport({ scale, rotation });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, numPages]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      // Clear confused state when going back
      setIsConfused(false);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const nextPage = currentPage + 1;
      
      // Check if user is confused about current page OR if next page hasn't been visited
      if (isConfused || !visitedPages.has(nextPage)) {
        // Show popup - either for confused current page or new page
        setPageToExplain(nextPage);
        setShowExplanationPopup(true);
      } else {
        // Page already visited and not confused, just navigate
        setCurrentPage(nextPage);
      }
    }
  };

  const handlePageNavigation = (newPage) => {
    // Clear confused state if going backwards
    if (newPage < currentPage) {
      setIsConfused(false);
    }
    
    // Check if user is confused about current page OR if the new page hasn't been visited
    if (isConfused && newPage > currentPage) {
      // User is confused and trying to move forward - show popup
      setPageToExplain(newPage);
      setShowExplanationPopup(true);
    } else if (!visitedPages.has(newPage)) {
      // Show popup for new page
      setPageToExplain(newPage);
      setShowExplanationPopup(true);
    } else {
      // Page already visited and not confused, just navigate
      setCurrentPage(newPage);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentPage > 1) {
          // Clear confused state when going back
          setIsConfused(false);
          setCurrentPage(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentPage < numPages) {
          const nextPage = currentPage + 1;
          // Check if user is confused about current page OR if next page hasn't been visited
          if (isConfused || !visitedPages.has(nextPage)) {
            // Show popup - either for confused current page or new page
            setPageToExplain(nextPage);
            setShowExplanationPopup(true);
          } else {
            // Page already visited and not confused, just navigate
            setCurrentPage(nextPage);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, numPages, visitedPages, isConfused]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleZoomReset = () => {
    setScale(2.0);
  };

  const handlePageInput = (e) => {
    const value = e.target.value;
    if (value === '') return; // Allow empty input while typing
    
    const pageNum = parseInt(value);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      handlePageNavigation(pageNum);
    }
  };

  const handlePageInputBlur = (e) => {
    const value = e.target.value;
    const pageNum = parseInt(value);
    if (value === '' || isNaN(pageNum) || pageNum < 1 || pageNum > numPages) {
      // Value will be reset by the controlled input's value prop
      return;
    }
  };

  // Helper function to add messages (can be called from voice transcription or tutor responses)
  const addMessage = async (text, type = 'tutor') => {
    const newMessage = {
      text,
      type, // 'tutor' or 'user'
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);

    // Save message to IndexedDB if documentId exists
    // Don't save typing indicators ("...")
    if (documentId && text !== '...') {
      try {
        await saveMessage(documentId, text, type);
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  };

  // Extract text content from a PDF page
  const extractTextFromPage = async (pageNumber) => {
    if (!pdfDoc || pageNumber < 1 || pageNumber > numPages) {
      return null;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      // Combine all text items into a single string
      const textItems = textContent.items.map(item => item.str);
      const extractedText = textItems.join(' ').trim();
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from page:', error);
      return null;
    }
  };


  // Handle starting voice recording
  const handleStartRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context for visualization
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Higher resolution for better visualization
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Create microphone input
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      
      // Connect microphone to analyser
      microphone.connect(analyser);
      
      // Create data array for frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;
      
      // Create separate array for time-domain data (for pitch detection)
      const timeDomainArray = new Uint8Array(analyser.fftSize);
      const timeDomainArrayRef = { current: timeDomainArray };
      
      // Initialize MediaRecorder for actual audio recording
      // Determine the best supported MIME type
      let mimeType = 'audio/webm'; // Default format
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = []; // Reset chunks array
      pitchDataRef.current = []; // Reset pitch data for confusion detection
      
      // Collect audio data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at 2 minutes (120 seconds)
          if (newTime >= 120) {
            handleStopRecording();
            return 120;
          }
          return newTime;
        });
      }, 1000);
      
      // Animate waveform based on real audio data and collect pitch for confusion detection
      const updateWaveform = () => {
        if (analyserRef.current && dataArrayRef.current && waveformIntervalRef.current) {
          // Get frequency data for waveform visualization
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Get time-domain data for pitch detection
          analyserRef.current.getByteTimeDomainData(timeDomainArrayRef.current);
          
          // Detect pitch for confusion analysis using time-domain data
          const pitch = detectPitch(timeDomainArrayRef.current, audioContextRef.current.sampleRate);
          if (pitch > 0) {
            pitchDataRef.current.push(pitch);
          }
          
          // Map frequency data to waveform heights
          // We have 20 bars, so we'll sample from the frequency data
          const barCount = 20;
          const sampleSize = Math.floor(dataArrayRef.current.length / barCount);
          const newHeights = [];
          
          for (let i = 0; i < barCount; i++) {
            const start = i * sampleSize;
            let sum = 0;
            for (let j = 0; j < sampleSize; j++) {
              sum += dataArrayRef.current[start + j] || 0;
            }
            const average = sum / sampleSize;
            // Normalize to 20-60px height range
            const height = (average / 255) * 40 + 20;
            newHeights.push(height);
          }
          
          setWaveformHeights(newHeights);
          
          // Continue animation loop
          waveformIntervalRef.current = requestAnimationFrame(updateWaveform);
        }
      };
      
      // Start waveform animation
      waveformIntervalRef.current = requestAnimationFrame(updateWaveform);
      
      // Store stream for cleanup
      microphoneRef.current.stream = stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addMessage('Unable to access microphone. Please check your permissions.', 'tutor');
      setIsRecording(false);
    }
  };

  // Handle stopping voice recording
  const handleStopRecording = () => {
    setIsRecording(false);
    // Ensure the explanation popup is hidden immediately when recording stops
    setShowExplanationPopup(false);
    setPageToExplain(null);
    
    // Stop MediaRecorder and create audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Store mimeType before stopping (to avoid null reference issues)
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      const currentRecordingTime = recordingTime; // Store current recording time
      
      // Set up onstop handler before stopping
      mediaRecorderRef.current.onstop = async () => {
        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mimeType
        });
        
        // Convert to WAV format for WebRTC VAD processing
        let wavBlob = null;
        try {
          wavBlob = await convertToWav(audioBlob, 16000); // 16kHz sample rate for VAD
        } catch (error) {
          console.error('Error converting to WAV:', error);
        }
        
        // Store the recorded audio (both original and WAV)
        recordedAudioRef.current = {
          blob: audioBlob, // Original WebM blob
          wavBlob: wavBlob, // WAV blob for VAD processing
          mimeType: mimeType,
          size: audioBlob.size,
          wavSize: wavBlob?.size || 0,
          duration: currentRecordingTime, // Duration in seconds
          url: URL.createObjectURL(audioBlob), // Create object URL for playback/download
          wavUrl: wavBlob ? URL.createObjectURL(wavBlob) : null, // WAV URL for VAD
          timestamp: new Date()
        };
        
        // Send audio to transcription API
        if (wavBlob) {
          try {
            // Convert blobs to base64 for API transmission
            const blobToBase64 = (blob) => {
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  // Remove the data:audio/...;base64, prefix
                  const base64String = reader.result.split(',')[1];
                  resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            };
            
            const wavBase64 = await blobToBase64(wavBlob);
            const originalBase64 = await blobToBase64(audioBlob);
            
            // Prepare data for transcription API (matches AudioBlobData structure)
            const transcriptionRequest = {
              blob: originalBase64,
              wavBlob: wavBase64,
              mimeType: mimeType,
              size: audioBlob.size,
              wavSize: wavBlob.size,
              duration: currentRecordingTime,
              timestamp: recordedAudioRef.current.timestamp.toISOString()
            };
            
            // Send to transcription API
            const transcriptionResponse = await fetch('http://localhost:8000/transcribe-blob', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(transcriptionRequest)
            });
            
            if (!transcriptionResponse.ok) {
              throw new Error(`Transcription failed: ${transcriptionResponse.status}`);
            }
            
            const transcriptionData = await transcriptionResponse.json();
            const transcribedText = transcriptionData.transcription;
            
            // Display transcription to user
            addMessage(transcribedText, 'user');
            
            // Process the recorded audio with WebRTC VAD for silence detection
            const vadResults = await detectSilenceInWav(wavBlob);
            
            if (vadResults) {
              // Get silence rate (0-1)
              const silenceRate = parseFloat(vadResults.silencePercentage) / 100;
              
              // Analyze pitch contour for confusion
              const pitchStats = analyzePitchContour(pitchDataRef.current);
              
              // Calculate transcription rate (characters per second)
              // Lower rate = more confused (not explaining much)
              const transcriptionRate = transcribedText.length / currentRecordingTime;
              
              // Normalize transcription confusion score
              // Good explanation: ~10-15 chars/sec (150-225 chars in 15 sec)
              // Poor explanation: <5 chars/sec (less than 75 chars in 15 sec)
              // Formula: Invert the rate so low speaking = high confusion
              const normalizedTranscriptionRate = Math.min(transcriptionRate / 12, 1); // 12 chars/sec as baseline
              const transcriptionConfusion = 1 - normalizedTranscriptionRate; // Invert: low rate = high confusion
              
              // Calculate combined confusion rate with new weights
              // 0.6 silence + 0.25 pitch + 0.15 transcription = 1.0 total
              const confusionRate = (0.1 * silenceRate) + (0.12 * pitchStats.upshiftScore) + (0.18 * transcriptionConfusion);
              
              // Debug logging
              console.log('Confusion Analysis:', {
                silenceRate: silenceRate.toFixed(3),
                pitchRange: `${pitchStats.minPitch} - ${pitchStats.maxPitch} Hz (range: ${pitchStats.pitchRange} Hz)`,
                pitchVariation: pitchStats.upshiftScore.toFixed(3),
                transcriptionRate: transcriptionRate.toFixed(2),
                transcriptionConfusion: transcriptionConfusion.toFixed(3),
                finalConfusionRate: confusionRate.toFixed(3)
              });
              
              // Display confusion analysis in chat
              const analysisMessage = `[ANALYSIS]\n` +
                `- Silence: ${(silenceRate * 100).toFixed(1)}%\n` +
                `- Pitch Range: ${pitchStats.minPitch}-${pitchStats.maxPitch} Hz (${pitchStats.pitchRange} Hz)\n` +
                `- Speaking Rate: ${transcriptionRate.toFixed(1)} chars/sec\n` +
                `- Confusion Score: ${(confusionRate * 100).toFixed(1)}%`;
              addMessage(analysisMessage, 'tutor');
              
              // Check if user is confused (confusion rate > 0.2)
              if (confusionRate > 0.25) {
                // User seems confused - ask for clarification
                setIsConfused(true);
                addMessage(`I detected some uncertainty in your explanation. What specific concept would you like me to clarify or explain again in this slide?`, 'tutor');
                
                // Don't navigate - stay on current page
                // Close popup
                setShowExplanationPopup(false);
                setPageToExplain(null);
              } else {
                // Normal response - user understood the concept (low confusion)
                setIsConfused(false);
                
                // Extract text content from the current slide (the one they just explained)
                const slideText = await extractTextFromPage(currentPage);
                if (slideText) {
                  // Store the extracted text for this page
                  extractedTextRef.current[currentPage] = slideText;
                  // Output extracted text to console
                  console.log(`Extracted text from page ${currentPage}:`, slideText);
                  console.log(`User transcription: "${transcribedText}"`);
                  
                  // Send transcribed text + slide text to AI tutor for TWO-LAYER evaluation
                  try {
                    addMessage('...', 'tutor'); // Show typing indicator
                    
                    console.log('=== SENDING TO LLM FOR EVALUATION ===');
                    console.log('Student Transcription:', transcribedText);
                    console.log('Slide Content:', slideText);
                    console.log('====================================');
                    
                    // LAYER 1: Semantic Correctness Check
                    const evaluationResponse = await fetch('http://localhost:8001/chat', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        question: `Evaluate how well the student's explanation matches the meaning of the slide content.
                            Slide Content: "${slideText}"
                            Student Explanation: "${transcribedText}"

                            TASK:
                            Compare the two texts based on meaning, not keyword overlap. Determine whether the student shows correct understanding, partial understanding, or incorrect understanding.

                            CLASSIFY the student's understanding as one of:
                            Correct understanding
                            Partially correct
                            Incorrect

                            NOTE:
                            If the student's explanation is missing any details that are present in the slide content, it cannot be correct.
                            If the student's explanation is correct, but does not include all the details that are present in the slide content, it should be classified as partially correct.  
                            If the student's explanation is incorrect, it should be classified as incorrect.
                            The output cannot contain any emojis or special characters or asterisks.
                            Between all points below, you must use doubleline breaks to make the output more readable.
                            
                            OUTPUT FORMAT (use exactly this):
                            Understanding rating: [Correct or Partially correct or Incorrect]
                            What the student explained correctly
                            What the student missed or needs improvement
                            Feedback`,
                        slideContent: slideText
                      })
                    });

                    console.log('=== EVALUATION RESPONSE ===');
                    console.log(evaluationResponse);
                    console.log('======================');
                    
                    if (evaluationResponse.ok) {
                      const evaluationData = await evaluationResponse.json();
                      
                      // ===== DEBUG OUTPUT =====
                      console.log('=== EVALUATION DEBUG ===');
                      console.log('Full Response Object:', evaluationData);
                      console.log('Response Keys:', Object.keys(evaluationData));
                      console.log('Raw Response:', JSON.stringify(evaluationData, null, 2));
                      console.log('======================');
                      
                      const evaluation = evaluationData.response;
                      
                      console.log('Extracted Evaluation Text:');
                      console.log(evaluation);
                      console.log('======================');
                      
                      // Remove typing indicator
                      setMessages(prev => prev.slice(0, -1));
                      
                      // Format evaluation text to ensure clear section breaks
                      const formatEvaluationText = (text) => {
                        if (!text) return text;
                        const headings = [
                          'Understanding rating',
                          'What the student explained correctly',
                          'What the student missed or needs improvement',
                          'Feedback'
                        ];
                        let out = text;
                        headings.forEach((h, idx) => {
                          const re = new RegExp(`\\s*${h}\\s*:?`, 'gi');
                          out = out.replace(re, (match) => (idx === 0 ? `${h}:` : `\n\n${h}:`));
                        });
                        // Collapse 3+ newlines to double for readability
                        out = out.replace(/\n{3,}/g, '\n\n').trim();
                        return out;
                      };
                      
                      // Add evaluation feedback (formatted with section line breaks)
                      const formattedEvaluation = formatEvaluationText(evaluation);
                      addMessage(formattedEvaluation, 'tutor');
                      
                      // Parse the evaluation to determine if student can proceed
                      // NEW RULE: Proceed ONLY if classification is "Correct understanding"
                      console.log('=== PARSING EVALUATION ===');
                      const classificationMatch =
                        evaluation.match(/CLASSIFICATION:\s*(.*?)(?:\n|$)/i) ||
                        evaluation.match(/UNDERSTANDING(?:\s*RATING)?:\s*(.*?)(?:\n|$)/i);
                      
                      console.log('Classification Match:', classificationMatch);
                      
                      // Default: do not proceed unless explicitly Correct
                      let canProceed = false;
                      
                      if (classificationMatch) {
                        const classification = classificationMatch[1].trim().toLowerCase();
                        console.log('✓ Extracted Classification:', classification);
                        
                        if (classification.startsWith('correct')) {
                          canProceed = true;
                          console.log('→ Classification is CORRECT - canProceed = true');
                        } else {
                          console.log('→ Classification not correct - canProceed = false');
                        }
                      } else {
                        console.log('No classification/understanding rating found in response - canProceed = false');
                      }
                      
                      console.log('=== FINAL DECISION (Correct only): canProceed =', canProceed, '===');
                      
                      if (!canProceed) {
                        // Student did not demonstrate sufficient understanding
                        setIsConfused(true);
                        addMessage(`[NEEDS IMPROVEMENT] Your explanation needs improvement. Please review the slide and try explaining again, or ask me specific questions about the concepts you're unsure about.`, 'tutor');
                        
                        // Don't navigate - stay on current page
                        setShowExplanationPopup(false);
                        setPageToExplain(null);
                      } else {
                        // Student demonstrated sufficient understanding - allow navigation
                        setIsConfused(false);
                        
                        // Navigate to next page
                        setVisitedPages(prev => new Set([...prev, pageToExplain]));
                        setCurrentPage(pageToExplain);
                        
                        // Close popup
                        setShowExplanationPopup(false);
                        setPageToExplain(null);
                      }
                    } else {
                      console.error('=== EVALUATION API ERROR ===');
                      console.error('Status:', evaluationResponse.status);
                      console.error('Status Text:', evaluationResponse.statusText);
                      const errorText = await evaluationResponse.text();
                      console.error('Error Response:', errorText);
                      throw new Error('Failed to get evaluation');
                    }
                  } catch (evalError) {
                    console.error('=== EVALUATION EXCEPTION ===');
                    console.error('Error getting AI evaluation:', evalError);
                    console.error('Error stack:', evalError.stack);
                    // Remove typing indicator
                    setMessages(prev => prev.slice(0, -1));
                    // Fallback message - allow navigation on error
                    addMessage(`Great explanation! You demonstrated good understanding of the concept.`, 'tutor');
                    
                    // On error, allow navigation (benefit of the doubt)
                    setIsConfused(false);
                    setVisitedPages(prev => new Set([...prev, pageToExplain]));
                    setCurrentPage(pageToExplain);
                    setShowExplanationPopup(false);
                    setPageToExplain(null);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error transcribing audio:', error);
            addMessage('[ERROR] Failed to transcribe audio. Please try again.', 'tutor');
          }
        }
      };
      
      // Now stop the recorder
      mediaRecorderRef.current.stop();
    }
    
    // Clear timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    // Cancel waveform animation
    if (waveformIntervalRef.current) {
      cancelAnimationFrame(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
    
    // Stop microphone stream
    if (microphoneRef.current && microphoneRef.current.stream) {
      microphoneRef.current.stream.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    mediaRecorderRef.current = null;
    
    // Reset recording time and waveform
    setRecordingTime(0);
    setWaveformHeights(Array(20).fill(20));
  };

  // Cleanup intervals and audio on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (waveformIntervalRef.current) {
        cancelAnimationFrame(waveformIntervalRef.current);
      }
      if (microphoneRef.current && microphoneRef.current.stream) {
        microphoneRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
      // Cleanup object URLs to prevent memory leaks
      if (recordedAudioRef.current) {
        if (recordedAudioRef.current.url) {
          URL.revokeObjectURL(recordedAudioRef.current.url);
        }
        if (recordedAudioRef.current.wavUrl) {
          URL.revokeObjectURL(recordedAudioRef.current.wavUrl);
        }
      }
    };
  }, []);

  // Handle ignoring the explanation prompt
  const handleIgnoreExplanation = () => {
    // User chose to skip explanation - mark as not confused
    setIsConfused(false);
    // Mark page as visited (so we don't ask again)
    setVisitedPages(prev => new Set([...prev, pageToExplain]));
    // Navigate to the page
    setCurrentPage(pageToExplain);
    // Close popup
    setShowExplanationPopup(false);
    setPageToExplain(null);
  };

  // Handle re-reading - just close popup without marking as visited or navigating
  const handleReRead = () => {
    // Just close the popup, allow student to re-read current page
    setShowExplanationPopup(false);
    setPageToExplain(null);
    // Don't mark as visited, don't navigate - student stays on current page
  };

  // Handle sending chat message
  const handleSendMessage = async () => {
    if (chatInput.trim() === '') return;
    
    const userQuestion = chatInput.trim();
    
    // Add user message
    addMessage(userQuestion, 'user');
    
    // Clear input
    setChatInput('');
    
    // Show loading message
    addMessage('...', 'tutor');
    
    try {
      // Extract current slide content
      const slideText = await extractTextFromPage(currentPage);
      const slideContent = slideText || 'No text content available on this slide.';
      
      // For debugging: Display question and slide content
      console.log('=== CHAT DEBUG ===');
      console.log('Question:', userQuestion);
      console.log('Slide Content:', slideContent);
      console.log('================');
      
      // Call Chat API (proxy to Nexa LLM)
      const response = await fetch('http://localhost:8001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userQuestion,
          slideContent: slideContent
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Chat API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.response;
      
      // Debug: Log the AI response
      console.log('AI Response:', aiResponse);
      
      // Remove the "Thinking..." message
      setMessages(prev => prev.slice(0, -1));
      
      // Add the actual AI response
      addMessage(aiResponse, 'tutor');
      
      // Add debug info in chat (for debugging purposes)
      const debugInfo = `\n[DEBUG]\n📝 Question: ${userQuestion}\n📄 Slide: "${slideContent.substring(0, 100)}${slideContent.length > 100 ? '...' : ''}"\n💡 Response: ${aiResponse}`;
      console.log(debugInfo);
      
    } catch (error) {
      console.error('Error communicating with AI tutor:', error);
      
      // Remove the "Thinking..." message
      setMessages(prev => prev.slice(0, -1));
      
      // Add error message
      addMessage('⚠️ Failed to get response from AI tutor. Please make sure both the Nexa server (port 18181) and Chat API server (port 8001) are running.', 'tutor');
    }
  };

  // Handle Enter key in chat input
  const handleChatInputKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Save progress whenever currentPage or visitedPages changes
  useEffect(() => {
    if (documentId && currentPage && visitedPages.size > 0) {
      const saveProgressData = async () => {
        try {
          await saveProgress(documentId, {
            currentPage,
            visitedPages
          });
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      };
      saveProgressData();
    }
  }, [documentId, currentPage, visitedPages]);

  // Add a welcome message when PDF loads (only if no messages exist yet and loading is complete)
  useEffect(() => {
    if (pdfDoc && messages.length === 0 && !isLoadingMessages) {
      // Check if welcome message doesn't already exist to prevent duplicates
      const hasWelcomeMessage = messages.some(msg => 
        msg.text && msg.text.includes('Welcome! I\'m here to help you learn')
      );
      
      if (!hasWelcomeMessage) {
        // Add welcome message if no messages exist and we've finished loading
        addMessage(`Welcome! I'm here to help you learn from ${pdfFileName}. I will help you to study this content as fast as possible.`, 'tutor');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, isLoadingMessages, messages.length]);

  if (!pdfFile) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pt-3 md:pt-4 pr-3 md:pr-4 pl-3 md:pl-4 pb-3 md:pb-4">
      <div className="max-w-[98vw] mx-auto">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <PDFViewerHeader
                pdfFileName={pdfFileName}
                scale={scale}
                isRendering={isRendering}
                onBack={() => {
                  clearPdfFile();
                  navigate('/');
                }}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomReset={handleZoomReset}
              />

              <PDFCanvas
                canvasRef={canvasRef}
                pdfDoc={pdfDoc}
                isRendering={isRendering}
                showExplanationPopup={showExplanationPopup}
              />

              <PDFNavigation
                currentPage={currentPage}
                numPages={numPages}
                isRendering={isRendering}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                onPageInput={handlePageInput}
                onPageInputBlur={handlePageInputBlur}
              />
            </div>
          </div>

          {/* Right: Tutor Panel */}
          <div className="lg:col-span-1">
            <TutorPanel
              messages={messages}
              chatInput={chatInput}
              onChatInputChange={(e) => setChatInput(e.target.value)}
              onSendMessage={handleSendMessage}
              onChatInputKeyPress={handleChatInputKeyPress}
            />
          </div>
        </div>
      </div>

      {/* Explanation Popup Modal */}
      <ExplanationPopup
        show={showExplanationPopup}
        isRecording={isRecording}
        recordingTime={recordingTime}
        currentPage={currentPage}
        pageToExplain={pageToExplain}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onIgnore={handleIgnoreExplanation}
        onReRead={handleReRead}
      />
    </div>
  );
};

export default SlidesPage;

