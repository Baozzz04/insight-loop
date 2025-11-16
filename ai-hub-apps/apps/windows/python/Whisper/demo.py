# ---------------------------------------------------------------------
# Copyright (c) 2025 Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause
# ---------------------------------------------------------------------
import argparse
import os
import subprocess
import shutil
from datetime import datetime

# Set FFMPEG_BINARY BEFORE importing any libraries that might need it
def setup_ffmpeg_early():
    """Set up ffmpeg environment variables before importing libraries."""
    # Check if FFMPEG_BINARY is already set
    if not os.environ.get("FFMPEG_BINARY"):
        # Try to find ffmpeg
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path and os.path.exists(ffmpeg_path):
            os.environ["FFMPEG_BINARY"] = ffmpeg_path
        else:
            # Try common Windows locations
            common_paths = [
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                r"C:\Users\{}\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe".format(os.environ.get("USERNAME", "")),
            ]
            for path in common_paths:
                if os.path.exists(path):
                    os.environ["FFMPEG_BINARY"] = path
                    break
    
    # Also update PATH in current process to include ffmpeg bin directory
    if os.environ.get("FFMPEG_BINARY"):
        ffmpeg_binary = os.environ["FFMPEG_BINARY"]
        ffmpeg_bin_dir = os.path.dirname(ffmpeg_binary)
        current_path = os.environ.get("PATH", "")
        if ffmpeg_bin_dir not in current_path:
            os.environ["PATH"] = ffmpeg_bin_dir + os.pathsep + current_path

# Setup ffmpeg BEFORE importing libraries
setup_ffmpeg_early()

import sounddevice as sd
from qai_hub_models.models._shared.hf_whisper.app import HfWhisperApp
from qai_hub_models.utils.onnx.torch_wrapper import OnnxModelTorchWrapper


def check_ffmpeg():
    """Check if ffmpeg is installed and accessible."""
    # Check if FFMPEG_BINARY is already set
    if os.environ.get("FFMPEG_BINARY"):
        ffmpeg_binary = os.environ.get("FFMPEG_BINARY")
        if os.path.exists(ffmpeg_binary):
            print(f"✅ FFmpeg found via FFMPEG_BINARY: {ffmpeg_binary}")
            return True
    
    # Check if ffmpeg is in PATH
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        try:
            # Try to run ffmpeg to verify it works
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"✅ FFmpeg found at: {ffmpeg_path}")
                # Set FFMPEG_BINARY for Python libraries that need it
                os.environ["FFMPEG_BINARY"] = ffmpeg_path
                return True
        except Exception as e:
            print(f"⚠️  FFmpeg found but failed to run: {e}")
    
    # Try common Windows locations
    common_paths = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\Users\{}\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe".format(os.environ.get("USERNAME", "")),
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            print(f"✅ FFmpeg found at: {path}")
            os.environ["FFMPEG_BINARY"] = path
            return True
    
    print("❌ FFmpeg not found in PATH or common locations")
    return False


def print_ffmpeg_instructions():
    """Print instructions for installing ffmpeg on Windows."""
    print("\n" + "="*60)
    print("FFmpeg Installation Instructions for Windows:")
    print("="*60)
    print("1. Download FFmpeg:")
    print("   https://github.com/BtbN/FFmpeg-Builds/releases")
    print("   Download: ffmpeg-master-latest-win64-gpl.zip")
    print()
    print("2. Extract the zip file (e.g., to C:\\ffmpeg)")
    print()
    print("3. Add FFmpeg to PATH:")
    print("   a. Press Windows key, search 'Environment Variables'")
    print("   b. Click 'Edit environment variables for your account'")
    print("   c. Select 'Path' and click 'Edit'")
    print("   d. Click 'New' and add: C:\\ffmpeg\\bin")
    print("   e. Click OK to save")
    print()
    print("4. Restart your terminal/PowerShell")
    print()
    print("5. Verify installation:")
    print("   ffmpeg -version")
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        conflict_handler="error",
    )
    parser.add_argument(
        "--audio-file",
        type=str,
        default=None,
        help="Path to .wav audio file to transcribe (e.g., audio.wav or path/to/file.wav)",
    )
    parser.add_argument(
        "--stream-audio-device",
        type=int,
        default=None,
        help="Audio device (number) to stream from.",
    )
    parser.add_argument(
        "--stream-audio-chunk-size",
        type=int,
        default=5,
        help="For audio streaming, the number of seconds to record between each transcription attempt. A minimum of around 5 seconds is recommended for best accuracy.",
    )
    parser.add_argument(
        "--list-audio-devices",
        action="store_true",
        help="Pass this to list audio devices and exit.",
    )
    parser.add_argument(
        "--encoder-path",
        type=str,
        default="build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperEncoder\\model.onnx",
        help="Encoder model path",
    )
    parser.add_argument(
        "--decoder-path",
        type=str,
        default="build\\whisper_base_float\\precompiled\\qualcomm-snapdragon-x-elite\\HfWhisperDecoder\\model.onnx",
        help="Decoder model path",
    )
    parser.add_argument(
        "--model-size",
        type=str,
        default="base",
        choices=["tiny", "base", "small", "medium", "large", "large-v3-turbo"],
        help="Size of the model being run, corresponding to a specific model checkpoint on huggingface.",
    )
    args = parser.parse_args()

    if args.list_audio_devices:
        print(sd.query_devices())
        return

    print("Loading model...")
    app = HfWhisperApp(
        OnnxModelTorchWrapper.OnNPU(args.encoder_path),
        OnnxModelTorchWrapper.OnNPU(args.decoder_path),
        f"openai/whisper-{args.model_size}",
    )

    if args.stream_audio_device:
        # Custom streaming with timestamps and better control
        import numpy as np
        
        sample_rate = 16000
        chunk_duration = args.stream_audio_chunk_size
        
        print(f"Starting audio stream from device {args.stream_audio_device}")
        print(f"Recording {chunk_duration} seconds per chunk...")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Record audio chunk
                chunk_samples = sample_rate * chunk_duration
                audio_chunk = sd.rec(
                    chunk_samples,
                    samplerate=sample_rate,
                    channels=1,
                    device=args.stream_audio_device,
                    dtype=np.float32
                )
                sd.wait()  # Wait until recording is finished
                
                # Transcribe
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                transcription = app.transcribe(audio_chunk.flatten(), sample_rate)
                
                if transcription.strip():
                    print(f"[{timestamp}] {transcription}")
                else:
                    print(f"[{timestamp}] (no speech detected)")
                    
        except KeyboardInterrupt:
            print("\n\nStopping transcription...")
    else:
        audio_file = args.audio_file
        if audio_file is None:
            print("Error: No audio file specified.")
            print("Usage: python demo.py --audio-file <path_to_wav_file>")
            print("   or: python demo.py --stream-audio-device <device_number>")
            return
        
        # Validate file exists - check multiple locations
        file_path = None
        
        # 1. Check if it's an absolute path or relative to current directory
        if os.path.exists(audio_file):
            file_path = os.path.abspath(audio_file)
        # 2. Check if it's relative to the script's directory
        elif os.path.exists(os.path.join(os.path.dirname(__file__), audio_file)):
            file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), audio_file))
        else:
            print(f"Error: Audio file not found: {audio_file}")
            print(f"  Searched in:")
            print(f"    - Current directory: {os.getcwd()}")
            print(f"    - Script directory: {os.path.dirname(os.path.abspath(__file__))}")
            print(f"\nTip: Use absolute path or place .wav file in one of the above directories.")
            return
        
        audio_file = file_path  # Use the resolved path
        
        # Check if it's a .wav file (optional validation)
        if not audio_file.lower().endswith('.wav'):
            print(f"Warning: File '{audio_file}' doesn't have .wav extension.")
            print("The file will be processed, but .wav format is recommended.")
        
        # FFmpeg should already be checked and set up before model loading
        # But verify it's still accessible
        if not os.environ.get("FFMPEG_BINARY"):
            print("⚠️  Warning: FFMPEG_BINARY not set. Attempting to set it now...")
            if not check_ffmpeg():
                print_ffmpeg_instructions()
                return
        
        # Perform transcription
        print(f"\nLoading audio file: {audio_file}")
        print(f"Starting transcription at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 60)
        
        # Debug: Show FFMPEG_BINARY status
        if os.environ.get("FFMPEG_BINARY"):
            print(f"Using FFMPEG_BINARY: {os.environ['FFMPEG_BINARY']}")
        
        try:
            # Load audio using ffmpeg directly (audio2numpy has issues detecting ffmpeg)
            import numpy as np
            
            ffmpeg_binary = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
            if not ffmpeg_binary:
                raise Exception("FFmpeg not found. Please ensure FFMPEG_BINARY is set or ffmpeg is in PATH.")
            
            print(f"Loading audio using ffmpeg: {ffmpeg_binary}")
            
            # Use ffmpeg to convert to standard WAV format, then load with numpy
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_wav = tmp_file.name
            
            # Convert to standard WAV format using ffmpeg
            cmd = [
                ffmpeg_binary,
                "-i", audio_file,
                "-ar", "16000",  # Sample rate
                "-ac", "1",      # Mono
                "-f", "wav",     # WAV format
                "-y",            # Overwrite output
                tmp_wav
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg conversion failed: {result.stderr}")
            
            # Load the converted WAV file using scipy or wave
            try:
                from scipy.io import wavfile
                sample_rate, audio_data = wavfile.read(tmp_wav)
                audio_data = audio_data.astype(np.float32) / 32768.0  # Normalize to [-1, 1]
            except ImportError:
                import wave
                with wave.open(tmp_wav, 'rb') as wav_file:
                    sample_rate = wav_file.getframerate()
                    frames = wav_file.readframes(-1)
                    audio_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Clean up temp file
            os.unlink(tmp_wav)
            
            print(f"✅ Audio loaded: {len(audio_data)} samples at {sample_rate} Hz")
            
            # Transcribe using numpy array
            transcription = app.transcribe(audio_data, sample_rate)
            
            print("-" * 60)
            print(f"Transcription:")
            print(f"{transcription}")
            print("-" * 60)
            print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
        except Exception as e:
            error_msg = str(e)
            print(f"\n❌ Error during transcription: {error_msg}")
            
            # Check if it's an ffmpeg-related error
            if "ffmpeg" in error_msg.lower() or "It is likely that ffmpeg" in error_msg:
                print("\n⚠️  FFmpeg-related error detected!")
                print("Even though ffmpeg may be installed, Python might not be able to find it.")
                print("\nTroubleshooting steps:")
                print("1. Verify ffmpeg is accessible:")
                print("   Open a NEW PowerShell/Command Prompt and run: ffmpeg -version")
                print("2. If ffmpeg works in terminal but not in Python:")
                print("   - Restart your IDE/terminal")
                print("   - Make sure you're using the same Python environment")
                print("   - Try setting FFMPEG_BINARY environment variable:")
                print(f"     $env:FFMPEG_BINARY='C:\\Users\\hackuser\\Downloads\\ffmpeg\\ffmpeg\\bin\\ffmpeg.exe'")
                print("3. Check if audio2numpy can find ffmpeg:")
                print("   python -c \"import audio2numpy as a2n; print(a2n.__file__)\"")
                print_ffmpeg_instructions()
            else:
                print("Make sure the audio file is a valid .wav file and try again.")


if __name__ == "__main__":
    main()
