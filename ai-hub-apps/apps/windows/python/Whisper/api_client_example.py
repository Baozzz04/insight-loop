"""
Example client for Whisper Transcription API
Demonstrates how to use the API endpoints
"""
import requests
import base64
import json
from pathlib import Path


API_BASE_URL = "http://localhost:8000"


def transcribe_from_file(file_path: str, model_size: str = "base"):
    """Upload and transcribe an audio file."""
    url = f"{API_BASE_URL}/transcribe"
    
    with open(file_path, 'rb') as f:
        files = {'audio_file': (Path(file_path).name, f, 'audio/wav')}
        data = {'model_size': model_size}
        
        response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")


def transcribe_from_blob(audio_blob_data: dict):
    """Transcribe from blob data (similar to JavaScript recordedAudioRef)."""
    url = f"{API_BASE_URL}/transcribe-blob"
    
    response = requests.post(url, json=audio_blob_data)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")


def transcribe_from_server_path(file_path: str):
    """Transcribe from a file path on the server."""
    url = f"{API_BASE_URL}/transcribe-file-path"
    
    response = requests.post(url, json={"file_path": file_path})
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")


def convert_file_to_blob_data(file_path: str):
    """
    Convert a WAV file to blob data structure (similar to JavaScript).
    This matches the structure you showed in your example.
    """
    url = f"{API_BASE_URL}/convert-file-to-blob"
    
    response = requests.post(url, json={"file_path": file_path})
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")


def create_blob_data_from_local_file(file_path: str) -> dict:
    """
    Create blob data structure from a local file (client-side conversion).
    This creates a structure similar to JavaScript recordedAudioRef.
    """
    from datetime import datetime
    
    with open(file_path, 'rb') as f:
        audio_bytes = f.read()
    
    # Encode to base64
    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    # Get file size
    file_size = len(audio_bytes)
    
    # For simplicity, assuming it's a WAV file
    # In production, you might want to calculate actual duration
    blob_data = {
        "blob": audio_base64,
        "wavBlob": audio_base64,
        "mimeType": "audio/wav",
        "size": file_size,
        "wavSize": file_size,
        "duration": 0.0,  # Will be calculated by server if needed
        "timestamp": datetime.now().isoformat()
    }
    
    return blob_data


# Example usage
if __name__ == "__main__":
    print("="*60)
    print("Whisper API Client Examples")
    print("="*60)
    
    # Example 1: Transcribe by uploading a file
    print("\n1️⃣  Example 1: Upload and transcribe a file")
    try:
        # Replace with your actual audio file path
        audio_file = "./arth_rp.wav"
        
        if Path(audio_file).exists():
            result = transcribe_from_file(audio_file)
            print(f"✅ Transcription: {result['transcription']}")
            print(f"   Duration: {result['duration']:.2f}s")
            print(f"   Sample rate: {result['sample_rate']} Hz")
        else:
            print(f"⚠️  File not found: {audio_file}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 2: Convert file to blob and transcribe
    print("\n2️⃣  Example 2: Create blob data and transcribe")
    try:
        audio_file = "./arth_rp.wav"
        
        if Path(audio_file).exists():
            # Create blob data structure (client-side)
            blob_data = create_blob_data_from_local_file(audio_file)
            
            print(f"   Blob size: {blob_data['size']} bytes")
            print(f"   MIME type: {blob_data['mimeType']}")
            
            # Send to API for transcription
            result = transcribe_from_blob(blob_data)
            print(f"✅ Transcription: {result['transcription']}")
        else:
            print(f"⚠️  File not found: {audio_file}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 3: Transcribe from server file path
    print("\n3️⃣  Example 3: Transcribe from server file path")
    try:
        # This assumes the file exists on the server
        server_file_path = r"C:\Users\hackuser\InsightLoop\arth_rp.wav"
        
        result = transcribe_from_server_path(server_file_path)
        print(f"✅ Transcription: {result['transcription']}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Example 4: Convert server file to blob data and transcribe
    print("\n4️⃣  Example 4: Convert server file to blob data and transcribe")
    try:
        server_file_path = r"C:\Users\hackuser\InsightLoop\arth_rp.wav"
        
        blob_data = convert_file_to_blob_data(server_file_path)
        print(f"✅ Blob data created:")
        print(f"   Size: {blob_data['size']} bytes")
        print(f"   Duration: {blob_data['duration']:.2f}s")
        print(f"   MIME type: {blob_data['mimeType']}")
        print(f"   Timestamp: {blob_data['timestamp']}")
        
        # Now transcribe the blob data
        print(f"\n   Transcribing blob data...")
        result = transcribe_from_blob(blob_data)
        print(f"✅ Transcription: {result['transcription']}")
        print(f"   Processing time: {result['duration']:.2f}s")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "="*60)
    print("For interactive API docs, visit: http://localhost:8000/docs")
    print("="*60)

