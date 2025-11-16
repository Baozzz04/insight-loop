# Whisper Transcription API

A FastAPI-based REST API for the Whisper speech-to-text model, designed to accept recorded audio as blobs (similar to JavaScript `recordedAudioRef` structure).

## Features

- 🎙️ **Multiple input formats**: Upload files, send base64 blobs, or reference server file paths
- 🔄 **Automatic format conversion**: Supports WebM, MP3, WAV, and more (via FFmpeg)
- 📊 **Blob data structure**: Compatible with JavaScript audio recording structures
- 🚀 **FastAPI**: Modern, fast, with automatic interactive API documentation
- 🎯 **NPU acceleration**: Runs on Qualcomm Snapdragon X Elite NPU

## Installation

### Prerequisites

1. **FFmpeg** (required for audio conversion)
   ```bash
   # Windows: Download from https://github.com/BtbN/FFmpeg-Builds/releases
   # Add to PATH or set FFMPEG_BINARY environment variable
   ```

2. **Python dependencies**
   ```bash
   pip install fastapi uvicorn python-multipart requests numpy scipy
   pip install qai_hub_models sounddevice  # If not already installed
   ```

## Running the API Server

### Basic Usage

```bash
python demo_api.py
```

This starts the server on `http://localhost:8000`

### Custom Configuration

```bash
python demo_api.py --host 0.0.0.0 --port 8080 --model-size base --reload
```

**Arguments:**
- `--host`: Host to bind to (default: `0.0.0.0`)
- `--port`: Port to bind to (default: `8000`)
- `--model-size`: Whisper model size - `tiny`, `base`, `small`, `medium`, `large`, `large-v3-turbo` (default: `base`)
- `--encoder-path`: Path to encoder ONNX model
- `--decoder-path`: Path to decoder ONNX model
- `--reload`: Enable auto-reload for development

## API Endpoints

### 📚 Interactive Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Available Endpoints

#### 1. `POST /transcribe` - Upload and Transcribe Audio File

Upload an audio file for transcription.

**Request:**
- **Form Data:**
  - `audio_file`: Audio file (WebM, MP3, WAV, etc.)
  - `model_size`: (optional) Whisper model size (default: `base`)

**Example (curl):**
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "audio_file=@recording.wav" \
  -F "model_size=base"
```

**Response:**
```json
{
  "transcription": "Hello, this is a test recording.",
  "duration": 0.45,
  "timestamp": "2025-11-16T10:30:00",
  "sample_rate": 16000,
  "samples": 48000
}
```

---

#### 2. `POST /transcribe-blob` - Transcribe from Blob Data

Send audio as base64-encoded blob data (similar to JavaScript `recordedAudioRef`).

**Request Body:**
```json
{
  "blob": "base64_encoded_audio_data",
  "wavBlob": "base64_encoded_wav_data",
  "mimeType": "audio/wav",
  "size": 12345,
  "wavSize": 12345,
  "duration": 5.0,
  "timestamp": "2025-11-16T10:30:00"
}
```

**Example (Python):**
```python
import requests
import base64

# Read audio file
with open("recording.wav", "rb") as f:
    audio_bytes = f.read()

# Create blob structure
blob_data = {
    "blob": base64.b64encode(audio_bytes).decode('utf-8'),
    "wavBlob": base64.b64encode(audio_bytes).decode('utf-8'),
    "mimeType": "audio/wav",
    "size": len(audio_bytes),
    "wavSize": len(audio_bytes),
    "duration": 5.0,
    "timestamp": "2025-11-16T10:30:00"
}

# Send to API
response = requests.post("http://localhost:8000/transcribe-blob", json=blob_data)
print(response.json())
```

**Response:**
```json
{
  "transcription": "Hello, this is a test recording.",
  "duration": 0.45,
  "timestamp": "2025-11-16T10:30:00",
  "sample_rate": 16000,
  "samples": 48000
}
```

---

#### 3. `POST /transcribe-file-path` - Transcribe from Server File Path

Transcribe an audio file that exists on the server.

**Request Body:**
```json
{
  "file_path": "C:\\Users\\hackuser\\audio.wav"
}
```

**Example (curl):**
```bash
curl -X POST "http://localhost:8000/transcribe-file-path" \
  -H "Content-Type: application/json" \
  -d "{\"file_path\": \"C:\\\\Users\\\\hackuser\\\\audio.wav\"}"
```

---

#### 4. `POST /convert-file-to-blob` - Convert File to Blob Data

Utility endpoint to convert a server file path to blob data structure.

**Request Body:**
```json
{
  "file_path": "C:\\Users\\hackuser\\audio.wav"
}
```

**Response:**
```json
{
  "blob": "base64_encoded_data...",
  "wavBlob": "base64_encoded_data...",
  "mimeType": "audio/wav",
  "size": 48044,
  "wavSize": 48044,
  "duration": 3.0,
  "timestamp": "2025-11-16T10:30:00"
}
```

---

#### 5. `GET /health` - Health Check

Check if the API and model are ready.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2025-11-16T10:30:00"
}
```

## Python Client Examples

See `api_client_example.py` for complete examples. Here's a quick reference:

### Example 1: Upload File
```python
import requests

with open("audio.wav", "rb") as f:
    files = {"audio_file": f}
    response = requests.post("http://localhost:8000/transcribe", files=files)
    
print(response.json()["transcription"])
```

### Example 2: Send Blob Data
```python
import requests
import base64

# Read and encode audio
with open("audio.wav", "rb") as f:
    audio_data = base64.b64encode(f.read()).decode('utf-8')

# Create blob structure (matching JavaScript recordedAudioRef)
blob_data = {
    "blob": audio_data,
    "wavBlob": audio_data,
    "mimeType": "audio/wav",
    "size": len(audio_data),
    "wavSize": len(audio_data),
    "duration": 5.0,
    "timestamp": "2025-11-16T10:30:00"
}

response = requests.post("http://localhost:8000/transcribe-blob", json=blob_data)
print(response.json()["transcription"])
```

### Example 3: File Path Utility Function

```python
def wav_file_to_blob_data(file_path):
    """Convert WAV file to blob data structure."""
    import requests
    
    response = requests.post(
        "http://localhost:8000/convert-file-to-blob",
        json={"file_path": file_path}
    )
    return response.json()

# Usage
blob_data = wav_file_to_blob_data("C:\\Users\\hackuser\\audio.wav")
print(f"Duration: {blob_data['duration']}s")
print(f"Size: {blob_data['size']} bytes")
```

## JavaScript Integration

### Sending Recorded Audio from Browser

```javascript
// After recording (similar to your example)
const recordedAudioRef = {
  blob: audioBlob,
  wavBlob: wavBlob,
  mimeType: mimeType,
  size: audioBlob.size,
  wavSize: wavBlob?.size || 0,
  duration: currentRecordingTime,
  url: URL.createObjectURL(audioBlob),
  wavUrl: wavBlob ? URL.createObjectURL(wavBlob) : null,
  timestamp: new Date()
};

// Convert to base64 and send to API
const reader = new FileReader();
reader.readAsDataURL(recordedAudioRef.wavBlob || recordedAudioRef.blob);
reader.onloadend = async () => {
  const base64Audio = reader.result.split(',')[1]; // Remove data:audio/wav;base64,
  
  const blobData = {
    blob: base64Audio,
    wavBlob: base64Audio,
    mimeType: recordedAudioRef.mimeType,
    size: recordedAudioRef.size,
    wavSize: recordedAudioRef.wavSize,
    duration: recordedAudioRef.duration,
    timestamp: recordedAudioRef.timestamp.toISOString()
  };
  
  // Send to API
  const response = await fetch('http://localhost:8000/transcribe-blob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blobData)
  });
  
  const result = await response.json();
  console.log('Transcription:', result.transcription);
};
```

### Alternative: Direct File Upload

```javascript
const formData = new FormData();
formData.append('audio_file', recordedAudioRef.blob, 'recording.wav');
formData.append('model_size', 'base');

const response = await fetch('http://localhost:8000/transcribe', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Transcription:', result.transcription);
```

## Troubleshooting

### FFmpeg Not Found
If you get FFmpeg-related errors:

1. **Check if FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```

2. **Set FFMPEG_BINARY environment variable:**
   ```powershell
   # PowerShell
   $env:FFMPEG_BINARY = "C:\ffmpeg\bin\ffmpeg.exe"
   ```

3. **Or add to PATH permanently** (see instructions in demo.py)

### Model Not Loading
- Ensure encoder and decoder model paths are correct
- Check if models are downloaded and in the correct location
- Verify NPU drivers are installed (for Snapdragon devices)

### CORS Issues
If calling from a web browser on a different domain, update CORS settings in `demo_api.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Performance Tips

1. **Use smaller models** (`tiny`, `base`) for faster transcription
2. **Pre-convert audio to WAV** at 16kHz mono for best performance
3. **Keep audio chunks around 5-10 seconds** for optimal accuracy
4. **Use streaming endpoints** for real-time transcription

## License

BSD-3-Clause (Copyright © 2025 Qualcomm Technologies, Inc.)

