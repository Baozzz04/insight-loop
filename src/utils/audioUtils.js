/**
 * Audio Utility Functions
 * Functions for audio processing, pitch detection, and silence analysis
 */

// Helper function to convert AudioBuffer to WAV format
export const audioBufferToWav = (buffer, sampleRate) => {
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  const channels = buffer.numberOfChannels;
  const data = buffer.getChannelData(0);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, channels, true); // number of channels
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * channels * 2, true); // byte rate
  view.setUint16(32, channels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float32 to int16 PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
};

// Convert audio blob to WAV format (required for WebRTC VAD)
// WebRTC VAD requires: 16-bit mono PCM, 8/16/32/48 kHz sample rate
export const convertToWav = async (audioBlob, targetSampleRate = 16000) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Decode the audio file
        const audioBuffer = await audioContext.decodeAudioData(e.target.result);
        
        // Get the original sample rate
        const originalSampleRate = audioBuffer.sampleRate;
        
        // Convert to mono if stereo
        const numberOfChannels = 1; // VAD requires mono
        let monoData;
        
        if (audioBuffer.numberOfChannels > 1) {
          // Mix down to mono (average left and right channels)
          const leftChannel = audioBuffer.getChannelData(0);
          const rightChannel = audioBuffer.getChannelData(1);
          const length = audioBuffer.length;
          monoData = new Float32Array(length);
          
          for (let i = 0; i < length; i++) {
            monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
          }
        } else {
          monoData = audioBuffer.getChannelData(0);
        }
        
        // Resample if needed (WebRTC VAD supports 8/16/32/48 kHz)
        let finalData = monoData;
        let finalSampleRate = originalSampleRate;
        
        // If sample rate doesn't match VAD requirements, resample to nearest supported rate
        const supportedRates = [8000, 16000, 32000, 48000];
        let closestRate = supportedRates.reduce((prev, curr) => 
          Math.abs(curr - originalSampleRate) < Math.abs(prev - originalSampleRate) ? curr : prev
        );
        
        if (closestRate !== originalSampleRate) {
          // Simple linear resampling (for production, use a proper resampling library)
          const ratio = closestRate / originalSampleRate;
          const newLength = Math.round(monoData.length * ratio);
          finalData = new Float32Array(newLength);
          
          for (let i = 0; i < newLength; i++) {
            const srcIndex = i / ratio;
            const index = Math.floor(srcIndex);
            const fraction = srcIndex - index;
            
            if (index + 1 < monoData.length) {
              finalData[i] = monoData[index] * (1 - fraction) + monoData[index + 1] * fraction;
            } else {
              finalData[i] = monoData[index];
            }
          }
          finalSampleRate = closestRate;
        }
        
        // Create a new mono buffer with the correct sample rate
        const outputBuffer = audioContext.createBuffer(
          numberOfChannels,
          finalData.length,
          finalSampleRate
        );
        outputBuffer.getChannelData(0).set(finalData);
        
        // Convert AudioBuffer to WAV
        const wav = audioBufferToWav(outputBuffer, finalSampleRate);
        const wavBlob = new Blob([wav], { type: 'audio/wav' });
        
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(audioBlob);
  });
};

// Detect silence in WAV file using WebRTC VAD
export const detectSilenceInWav = async (wavBlob) => {
  try {
    // Read WAV file
    const arrayBuffer = await wavBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Mono audio
    const duration = audioBuffer.duration;
    
    // Simple energy-based VAD (silence detection)
    // Process audio in small frames (30ms recommended for WebRTC VAD)
    const frameDurationMs = 30; // milliseconds
    const frameSamples = Math.floor((sampleRate * frameDurationMs) / 1000);
    const numFrames = Math.floor(channelData.length / frameSamples);
    
    // Threshold for silence (adjust as needed, 0.01 is a good starting point)
    const silenceThreshold = 0.01;
    
    let silencePeriods = [];
    let currentSilenceStart = null;
    
    for (let i = 0; i < numFrames; i++) {
      const frameStart = i * frameSamples;
      const frameEnd = Math.min(frameStart + frameSamples, channelData.length);
      
      // Calculate RMS energy for this frame
      let sumSquares = 0;
      for (let j = frameStart; j < frameEnd; j++) {
        sumSquares += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sumSquares / (frameEnd - frameStart));
      
      const isSilence = rms < silenceThreshold;
      const timeSeconds = (frameStart / sampleRate).toFixed(2);
      
      if (isSilence) {
        // Start tracking silence period
        if (currentSilenceStart === null) {
          currentSilenceStart = parseFloat(timeSeconds);
        }
      } else {
        // End of silence period
        if (currentSilenceStart !== null) {
          silencePeriods.push({
            start: currentSilenceStart,
            end: parseFloat(timeSeconds),
            duration: (parseFloat(timeSeconds) - currentSilenceStart).toFixed(2)
          });
          currentSilenceStart = null;
        }
      }
    }
    
    // Handle case where recording ends in silence
    if (currentSilenceStart !== null) {
      silencePeriods.push({
        start: currentSilenceStart,
        end: duration.toFixed(2),
        duration: (duration - currentSilenceStart).toFixed(2)
      });
    }
    
    // Calculate total silence duration
    const totalSilence = silencePeriods.reduce((sum, period) => 
      sum + parseFloat(period.duration), 0
    ).toFixed(2);
    
    const totalSpeech = (duration - totalSilence).toFixed(2);
    
    return {
      totalDuration: duration.toFixed(2),
      totalSilence: totalSilence,
      totalSpeech: totalSpeech,
      silencePeriods: silencePeriods,
      silencePercentage: ((totalSilence / duration) * 100).toFixed(1)
    };
    
  } catch (error) {
    console.error('Error detecting silence:', error);
    return null;
  }
};

// Detect pitch (fundamental frequency) from frequency data using autocorrelation
export const detectPitch = (frequencyData, sampleRate) => {
  // Use autocorrelation to find fundamental frequency
  const bufferSize = frequencyData.length;
  const correlations = new Array(bufferSize).fill(0);
  
  // Calculate autocorrelation
  for (let lag = 0; lag < bufferSize; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      sum += frequencyData[i] * frequencyData[i + lag];
    }
    correlations[lag] = sum;
  }
  
  // Find the first peak after the zero lag
  let maxCorrelation = -1;
  let bestLag = -1;
  
  // Start from lag 20 to skip the DC component (typical voice is 80-400Hz)
  const minLag = Math.floor(sampleRate / 400); // 400 Hz max
  const maxLag = Math.floor(sampleRate / 80);  // 80 Hz min
  
  for (let lag = minLag; lag < Math.min(maxLag, bufferSize); lag++) {
    if (correlations[lag] > maxCorrelation) {
      maxCorrelation = correlations[lag];
      bestLag = lag;
    }
  }
  
  if (bestLag === -1) return 0; // No pitch detected
  
  // Convert lag to frequency
  const pitch = sampleRate / bestLag;
  return pitch;
};

// Analyze pitch contour for confusion (pitch upshift detection)
export const analyzePitchContour = (pitchData) => {
  if (pitchData.length < 2) {
    return {
      upshiftScore: 0,
      avgPitch: 0,
      pitchSlope: 0,
      pitchVariability: 0,
      pitchTrend: 'stable'
    };
  }
  
  // Remove zeros (silence/no pitch detected)
  const validPitches = pitchData.filter(p => p > 0);
  if (validPitches.length < 2) {
    return {
      upshiftScore: 0,
      avgPitch: 0,
      pitchSlope: 0,
      pitchVariability: 0,
      pitchTrend: 'stable'
    };
  }
  
  // Calculate pitch slope (overall trend)
  const startPitches = validPitches.slice(0, Math.ceil(validPitches.length / 3));
  const endPitches = validPitches.slice(-Math.ceil(validPitches.length / 3));
  
  const avgStartPitch = startPitches.reduce((sum, p) => sum + p, 0) / startPitches.length;
  const avgEndPitch = endPitches.reduce((sum, p) => sum + p, 0) / endPitches.length;
  const avgPitch = validPitches.reduce((sum, p) => sum + p, 0) / validPitches.length;
  
  const pitchSlope = avgEndPitch - avgStartPitch;
  
  // Calculate pitch variance (instability indicator)
  const mean = validPitches.reduce((sum, p) => sum + p, 0) / validPitches.length;
  const variance = validPitches.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / validPitches.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate coefficient of variation (CV) - normalized variability
  const cv = stdDev / mean;
  
  // Upshift score (0-1): combination of positive slope and high variability
  // Pitch upshift suggests uncertainty/questioning
  const upshiftScore = Math.max(0, Math.min(1, 
    (pitchSlope > 0 ? 0.6 : 0) + (cv > 0.1 ? 0.4 * Math.min(cv / 0.2, 1) : 0)
  ));
  
  // Determine pitch trend
  let pitchTrend = 'stable';
  if (pitchSlope > 10) {
    pitchTrend = 'rising (uncertainty)';
  } else if (pitchSlope < -10) {
    pitchTrend = 'falling';
  }
  
  return {
    upshiftScore,
    avgPitch: avgPitch.toFixed(0),
    pitchSlope: pitchSlope.toFixed(1),
    pitchVariability: (cv * 100).toFixed(1),
    pitchTrend
  };
};

