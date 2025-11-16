"""
Simple test script to demonstrate how to use the Whisper Transcription API.
"""
import requests
import sys
import os

def test_transcribe_api(audio_file_path: str, api_url: str = "http://localhost:8000"):
    """
    Test the transcription API with an audio file.
    
    Args:
        audio_file_path: Path to the audio file to transcribe
        api_url: Base URL of the API (default: http://localhost:8000)
    """
    # Check if file exists
    if not os.path.exists(audio_file_path):
        print(f"Error: File not found: {audio_file_path}")
        return
    
    # Check health first
    print(f"Checking API health at {api_url}...")
    try:
        health_response = requests.get(f"{api_url}/health", timeout=5)
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"API is {health_data['status']}")
            print(f"   Model loaded: {health_data['model_loaded']}")
            print(f"   FFmpeg available: {health_data['ffmpeg_available']}")
        else:
            print(f"Warning: Health check returned status {health_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}")
        print("   Make sure the API server is running: python demo_api.py")
        return
    
    # Transcribe the file
    print(f"\nTranscribing: {audio_file_path}")
    try:
        with open(audio_file_path, 'rb') as f:
            files = {'file': (os.path.basename(audio_file_path), f, 'audio/wav')}
            response = requests.post(f"{api_url}/transcribe", files=files, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + "="*60)
            print("Transcription successful!")
            print("="*60)
            print(f"Transcription: {result['transcription']}")
            print(f"\nMetadata:")
            print(f"  Filename: {result['metadata']['filename']}")
            print(f"  File size: {result['metadata']['file_size_bytes']} bytes")
            print(f"  Processing time: {result['metadata']['processing_time_seconds']} seconds")
            print(f"  Timestamp: {result['metadata']['timestamp']}")
            print("="*60)
        else:
            print(f"Error: {response.status_code}")
            print(f"   {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error during transcription: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_api.py <audio_file.wav> [api_url]")
        print("Example: python test_api.py audio.wav")
        print("Example: python test_api.py audio.wav http://localhost:8000")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    api_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000"
    
    test_transcribe_api(audio_file, api_url)

