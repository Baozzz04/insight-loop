"""
Simple test to transcribe arth_rp.wav file using /transcribe-blob
This matches what the frontend does!
"""
import requests
import base64
import os
from datetime import datetime

# Test file
file_path = "arth_rp.wav"

print("=" * 60)
print("Testing Whisper Transcription API")
print("=" * 60)
print(f"File: {file_path}")
print("Endpoint: POST /transcribe-blob")
print("-" * 60)

try:
    # Read the WAV file
    print("Reading WAV file...")
    with open(file_path, 'rb') as f:
        wav_bytes = f.read()
    
    # Convert to base64
    print("Converting to base64...")
    wav_base64 = base64.b64encode(wav_bytes).decode('utf-8')
    
    # Prepare payload (matching AudioBlobData structure)
    payload = {
        "blob": wav_base64,
        "wavBlob": wav_base64,
        "mimeType": "audio/wav",
        "size": len(wav_bytes),
        "wavSize": len(wav_bytes),
        "duration": 0.0,  # Will be calculated by backend
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"Sending {len(wav_bytes)} bytes to API...")
    print("-" * 60)
    
    # Send request to transcribe
    response = requests.post(
        "http://localhost:8000/transcribe-blob",
        json=payload,
        timeout=60  # 60 seconds timeout
    )
    
    print(f"Status Code: {response.status_code}\n")
    
    if response.status_code == 200:
        data = response.json()
        print("[SUCCESS] Transcription completed!")
        print("=" * 60)
        print(f"TRANSCRIPTION: {data['transcription']}")
        print("=" * 60)
        print(f"Processing Duration: {data['duration']:.2f} seconds")
        print(f"Sample Rate: {data['sample_rate']} Hz")
        print(f"Samples: {data['samples']}")
        print(f"Timestamp: {data['timestamp']}")
    else:
        print(f"[ERROR] Failed with status {response.status_code}")
        print(f"Response: {response.text}")
        
except FileNotFoundError:
    print(f"[ERROR] File not found: {file_path}")
    print("Make sure arth_rp.wav is in the current directory")
except requests.exceptions.ConnectionError:
    print("[ERROR] Could not connect to API server.")
    print("Make sure the server is running: python demo_api.py")
except Exception as e:
    print(f"[ERROR] {str(e)}")
    import traceback
    traceback.print_exc()

print("=" * 60)

