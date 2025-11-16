# ---------------------------------------------------------------------
# Copyright (c) 2025 Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause
# ---------------------------------------------------------------------
import os
import subprocess
import shutil
import io
import base64
from datetime import datetime
from typing import Optional, Dict, Any

# Set FFMPEG_BINARY BEFORE importing any libraries that might need it
def setup_ffmpeg_early():
    """Set up ffmpeg environment variables before importing libraries."""
    if not os.environ.get("FFMPEG_BINARY"):
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path and os.path.exists(ffmpeg_path):
            os.environ["FFMPEG_BINARY"] = ffmpeg_path
        else:
            common_paths = [
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                r"C:\Users\{}\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe".format(os.environ.get("USERNAME", "")),
            ]
            for path in common_paths:
                if os.path.exists(path):
                    os.environ["FFMPEG_BINARY"] = path
                    break
    
    if os.environ.get("FFMPEG_BINARY"):
        ffmpeg_binary = os.environ["FFMPEG_BINARY"]
        ffmpeg_bin_dir = os.path.dirname(ffmpeg_binary)
        current_path = os.environ.get("PATH", "")
        if ffmpeg_bin_dir not in current_path:
            os.environ["PATH"] = ffmpeg_bin_dir + os.pathsep + current_path

setup_ffmpeg_early()

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from pydantic import BaseModel
import uvicorn

from qai_hub_models.models._shared.hf_whisper.app import HfWhisperApp
from qai_hub_models.utils.onnx.torch_wrapper import OnnxModelTorchWrapper


# Pydantic models for request/response
class TranscriptionResponse(BaseModel):
    transcription: str
    duration: float
    timestamp: str
    sample_rate: int
    samples: int

class AudioBlobData(BaseModel):
    """Structure similar to JavaScript recordedAudioRef"""
    blob: Optional[str] = None  # Base64 encoded audio data
    wavBlob: Optional[str] = None  # Base64 encoded WAV data
    mimeType: str
    size: int
    wavSize: int
    duration: float
    timestamp: str

class FilePathRequest(BaseModel):
    file_path: str


# Global app instance
whisper_app = None
app = FastAPI(title="Whisper Transcription API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def initialize_whisper_model(
    encoder_path: str = "build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperEncoder\\model.onnx",
    decoder_path: str = "build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperDecoder\\model.onnx",
    model_size: str = "base"
):
    """Initialize the Whisper model."""
    global whisper_app
    
    if whisper_app is None:
        print(f"Loading Whisper model ({model_size})...")
        whisper_app = HfWhisperApp(
            OnnxModelTorchWrapper.OnNPU(encoder_path),
            OnnxModelTorchWrapper.OnNPU(decoder_path),
            f"openai/whisper-{model_size}",
        )
        print("✅ Model loaded successfully")
    
    return whisper_app


def convert_audio_to_wav_bytes(audio_data: bytes, input_format: str = "webm") -> bytes:
    """Convert audio data to WAV format using ffmpeg."""
    ffmpeg_binary = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
    if not ffmpeg_binary:
        raise Exception("FFmpeg not found")
    
    # Create temporary files
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as tmp_input:
        tmp_input_path = tmp_input.name
        tmp_input.write(audio_data)
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_output:
        tmp_output_path = tmp_output.name
    
    try:
        # Convert to WAV using ffmpeg
        cmd = [
            ffmpeg_binary,
            "-i", tmp_input_path,
            "-ar", "16000",  # 16kHz sample rate
            "-ac", "1",      # Mono
            "-f", "wav",
            "-y",
            tmp_output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg conversion failed: {result.stderr}")
        
        # Read the WAV file
        with open(tmp_output_path, 'rb') as f:
            wav_data = f.read()
        
        return wav_data
    
    finally:
        # Cleanup
        if os.path.exists(tmp_input_path):
            os.unlink(tmp_input_path)
        if os.path.exists(tmp_output_path):
            os.unlink(tmp_output_path)


def load_audio_from_bytes(audio_bytes: bytes, force_convert: bool = False) -> tuple[np.ndarray, int]:
    """
    Load audio from WAV bytes and return numpy array and sample rate.
    
    Args:
        audio_bytes: WAV audio data
        force_convert: If True, always convert through FFmpeg to ensure PCM format
    
    Returns:
        Tuple of (audio_data, sample_rate)
    """
    # If force_convert is True, use FFmpeg to ensure standard PCM format
    if force_convert:
        # Write to temp file and convert with FFmpeg
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_input:
            tmp_input_path = tmp_input.name
            tmp_input.write(audio_bytes)
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_output:
            tmp_output_path = tmp_output.name
        
        try:
            ffmpeg_binary = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
            if not ffmpeg_binary:
                raise Exception("FFmpeg not found")
            
            # Convert to standard PCM WAV
            cmd = [
                ffmpeg_binary,
                "-i", tmp_input_path,
                "-ar", "16000",  # 16kHz sample rate
                "-ac", "1",      # Mono
                "-acodec", "pcm_s16le",  # PCM 16-bit signed little-endian
                "-f", "wav",
                "-y",
                tmp_output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg conversion failed: {result.stderr}")
            
            # Read the converted file
            with open(tmp_output_path, 'rb') as f:
                audio_bytes = f.read()
        
        finally:
            # Cleanup
            if os.path.exists(tmp_input_path):
                os.unlink(tmp_input_path)
            if os.path.exists(tmp_output_path):
                os.unlink(tmp_output_path)
    
    # Try to load with scipy first
    try:
        from scipy.io import wavfile
        with io.BytesIO(audio_bytes) as wav_buffer:
            sample_rate, audio_data = wavfile.read(wav_buffer)
            # Convert to float32 and normalize
            if audio_data.dtype == np.int16:
                audio_data = audio_data.astype(np.float32) / 32768.0
            elif audio_data.dtype == np.int32:
                audio_data = audio_data.astype(np.float32) / 2147483648.0
            elif audio_data.dtype == np.uint8:
                audio_data = (audio_data.astype(np.float32) - 128) / 128.0
            return audio_data, sample_rate
    except (ImportError, ValueError) as e:
        # If scipy fails or encounters unsupported format, try wave module
        # If that also fails and we haven't tried FFmpeg yet, convert and retry
        if not force_convert and "Unknown wave file format" in str(e):
            print(f"⚠️  Unsupported WAV format detected, converting with FFmpeg...")
            return load_audio_from_bytes(audio_bytes, force_convert=True)
        
        # Try wave module as fallback
        try:
            import wave
            with io.BytesIO(audio_bytes) as wav_buffer:
                with wave.open(wav_buffer, 'rb') as wav_file:
                    sample_rate = wav_file.getframerate()
                    frames = wav_file.readframes(-1)
                    sample_width = wav_file.getsampwidth()
                    
                    if sample_width == 2:  # 16-bit
                        audio_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                    elif sample_width == 1:  # 8-bit
                        audio_data = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128) / 128.0
                    elif sample_width == 4:  # 32-bit
                        audio_data = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
                    else:
                        raise ValueError(f"Unsupported sample width: {sample_width}")
                    
                    return audio_data, sample_rate
        except Exception as wave_error:
            if not force_convert:
                print(f"⚠️  Standard WAV loading failed, converting with FFmpeg...")
                return load_audio_from_bytes(audio_bytes, force_convert=True)
            else:
                raise Exception(f"Failed to load audio: {str(e)}, {str(wave_error)}")


def wav_file_to_blob_data(file_path: str) -> AudioBlobData:
    """
    Convert a WAV file path to blob-like data structure similar to JavaScript.
    Automatically handles compressed WAV formats (DVI_ADPCM, etc.) by converting to PCM.
    
    Args:
        file_path: Path to the WAV file
        
    Returns:
        AudioBlobData object with blob structure
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    
    # Read the WAV file
    with open(file_path, 'rb') as f:
        original_wav_bytes = f.read()
    
    # Get original file size
    original_file_size = len(original_wav_bytes)
    
    # Load audio to get duration (this will auto-convert if needed)
    try:
        audio_data, sample_rate = load_audio_from_bytes(original_wav_bytes)
        duration = len(audio_data) / sample_rate
        
        # After successful load, get the converted WAV bytes if conversion happened
        # For blob data, we should use standard PCM format
        # Re-encode as standard PCM WAV for consistency
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_wav_path = tmp_file.name
        
        try:
            # Convert to standard PCM using FFmpeg
            ffmpeg_binary = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
            if ffmpeg_binary:
                # Write original to temp file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_input:
                    tmp_input_path = tmp_input.name
                    tmp_input.write(original_wav_bytes)
                
                # Convert to standard PCM
                cmd = [
                    ffmpeg_binary,
                    "-i", tmp_input_path,
                    "-ar", "16000",
                    "-ac", "1",
                    "-acodec", "pcm_s16le",
                    "-f", "wav",
                    "-y",
                    tmp_wav_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    # Read converted PCM WAV
                    with open(tmp_wav_path, 'rb') as f:
                        wav_bytes = f.read()
                    wav_size = len(wav_bytes)
                else:
                    # Fallback to original
                    wav_bytes = original_wav_bytes
                    wav_size = original_file_size
                
                # Cleanup
                if os.path.exists(tmp_input_path):
                    os.unlink(tmp_input_path)
            else:
                wav_bytes = original_wav_bytes
                wav_size = original_file_size
        
        finally:
            if os.path.exists(tmp_wav_path):
                os.unlink(tmp_wav_path)
    
    except Exception as e:
        raise Exception(f"Failed to process WAV file: {str(e)}")
    
    # Encode to base64 (for API transmission)
    wav_base64 = base64.b64encode(wav_bytes).decode('utf-8')
    original_base64 = base64.b64encode(original_wav_bytes).decode('utf-8')
    
    return AudioBlobData(
        blob=original_base64,  # Original file
        wavBlob=wav_base64,    # Converted PCM WAV
        mimeType="audio/wav",
        size=original_file_size,
        wavSize=wav_size,
        duration=duration,
        timestamp=datetime.now().isoformat()
    )


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup."""
    try:
        initialize_whisper_model()
    except Exception as e:
        print(f"[WARNING] Could not initialize model on startup: {e}")
        print("Model will be initialized on first request.")


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "message": "Whisper Transcription API",
        "version": "1.0.0",
        "endpoints": {
            "POST /transcribe": "Transcribe audio from uploaded file (supports WebM, MP3, WAV, etc.)",
            "POST /transcribe-blob": "Transcribe audio from base64 encoded blob data",
            "POST /transcribe-file-path": "Transcribe audio from file path",
            "GET /health": "Health check endpoint"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": whisper_app is not None,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    model_size: str = Form("base")
):
    """
    Transcribe audio from uploaded file.
    
    Args:
        audio_file: Audio file (WebM, MP3, WAV, etc.)
        model_size: Whisper model size (tiny, base, small, medium, large)
        
    Returns:
        TranscriptionResponse with transcription and metadata
    """
    try:
        # Initialize model if needed
        model = initialize_whisper_model(model_size=model_size)
        
        # Read uploaded file
        audio_bytes = await audio_file.read()
        
        # Detect file format from filename or content type
        file_extension = audio_file.filename.split('.')[-1].lower() if audio_file.filename else "wav"
        
        # Always convert through FFmpeg to ensure standard PCM format
        # This handles compressed WAV formats (DVI_ADPCM, etc.) as well
        print(f"Converting {file_extension} to standard PCM WAV...")
        wav_bytes = convert_audio_to_wav_bytes(audio_bytes, file_extension)
        
        # Load audio (should work now that it's in PCM format)
        audio_data, sample_rate = load_audio_from_bytes(wav_bytes)
        
        # Transcribe
        start_time = datetime.now()
        transcription = model.transcribe(audio_data, sample_rate)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return TranscriptionResponse(
            transcription=transcription,
            duration=processing_time,
            timestamp=datetime.now().isoformat(),
            sample_rate=sample_rate,
            samples=len(audio_data)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/transcribe-blob", response_model=TranscriptionResponse)
async def transcribe_from_blob(blob_data: AudioBlobData):
    """
    Transcribe audio from base64 encoded blob data (similar to JavaScript recordedAudioRef).
    
    Args:
        blob_data: AudioBlobData object with base64 encoded audio
        
    Returns:
        TranscriptionResponse with transcription and metadata
    """
    try:
        # Initialize model if needed
        model = initialize_whisper_model()
        
        # Decode base64 audio data
        if blob_data.wavBlob:
            audio_bytes = base64.b64decode(blob_data.wavBlob)
        elif blob_data.blob:
            audio_bytes = base64.b64decode(blob_data.blob)
        else:
            raise HTTPException(status_code=400, detail="No audio data provided")
        
        # Always convert through FFmpeg to ensure standard PCM format
        # This handles all formats including compressed WAV (DVI_ADPCM, etc.)
        format_type = blob_data.mimeType.split('/')[-1] if '/' in blob_data.mimeType else "wav"
        print(f"Converting {format_type} to standard PCM WAV...")
        wav_bytes = convert_audio_to_wav_bytes(audio_bytes, format_type)
        
        # Load audio (should work now that it's in PCM format)
        audio_data, sample_rate = load_audio_from_bytes(wav_bytes)
        
        # Transcribe
        start_time = datetime.now()
        transcription = model.transcribe(audio_data, sample_rate)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return TranscriptionResponse(
            transcription=transcription,
            duration=processing_time,
            timestamp=datetime.now().isoformat(),
            sample_rate=sample_rate,
            samples=len(audio_data)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/transcribe-file-path", response_model=TranscriptionResponse)
async def transcribe_from_file_path(request: FilePathRequest):
    """
    Transcribe audio from a file path on the server.
    
    Args:
        request: FilePathRequest with file_path
        
    Returns:
        TranscriptionResponse with transcription and metadata
    """
    try:
        file_path = request.file_path
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        # Initialize model if needed
        model = initialize_whisper_model()
        
        # Convert file to blob data
        blob_data = wav_file_to_blob_data(file_path)
        
        # Decode and load audio
        audio_bytes = base64.b64decode(blob_data.wavBlob)
        audio_data, sample_rate = load_audio_from_bytes(audio_bytes)
        
        # Transcribe
        start_time = datetime.now()
        transcription = model.transcribe(audio_data, sample_rate)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return TranscriptionResponse(
            transcription=transcription,
            duration=processing_time,
            timestamp=datetime.now().isoformat(),
            sample_rate=sample_rate,
            samples=len(audio_data)
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/convert-file-to-blob")
async def convert_file_to_blob(request: FilePathRequest) -> AudioBlobData:
    """
    Utility endpoint to convert a WAV file path to blob-like data structure.
    
    Args:
        request: FilePathRequest with file_path
        
    Returns:
        AudioBlobData object
    """
    try:
        return wav_file_to_blob_data(request.file_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Whisper Transcription API Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    parser.add_argument(
        "--encoder-path",
        type=str,
        default="build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperEncoder\\model.onnx",
        help="Encoder model path"
    )
    parser.add_argument(
        "--decoder-path",
        type=str,
        default="build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperDecoder\\model.onnx",
        help="Decoder model path"
    )
    parser.add_argument(
        "--model-size",
        type=str,
        default="base",
        choices=["tiny", "base", "small", "medium", "large", "large-v3-turbo"],
        help="Whisper model size"
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("Whisper Transcription API Server")
    print("="*60)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Model: whisper-{args.model_size}")
    print(f"Encoder: {args.encoder_path}")
    print(f"Decoder: {args.decoder_path}")
    print("="*60)
    print(f"\nAPI Documentation: http://{args.host}:{args.port}/docs")
    print(f"Interactive API: http://{args.host}:{args.port}/redoc\n")
    
    uvicorn.run(
        "demo_api:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )
