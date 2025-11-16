# Fix for Compressed WAV Files (DVI_ADPCM)

## Problem
The API was failing with the error:
```
Unknown wave file format: DVI_ADPCM. Supported formats: PCM, IEEE_FLOAT
```

This happens because:
- **DVI_ADPCM** is a compressed audio codec used in some WAV files
- Python's `scipy.wavfile.read()` and `wave` module only support uncompressed PCM and IEEE_FLOAT formats
- The original code only used FFmpeg for non-WAV files, assuming all WAV files were in PCM format

## Solution
Updated the API to **always convert audio through FFmpeg** to ensure standard PCM format, regardless of input format.

### Changes Made

#### 1. Enhanced `load_audio_from_bytes()` function
- Added `force_convert` parameter to force FFmpeg conversion
- Added automatic detection of unsupported WAV formats
- If scipy/wave fails with "Unknown wave file format", automatically retries with FFmpeg conversion
- Now handles multiple PCM formats: int16, int32, uint8

```python
def load_audio_from_bytes(audio_bytes: bytes, force_convert: bool = False):
    # Automatically detects compressed formats and converts with FFmpeg
    # Supports PCM int16, int32, uint8, and IEEE_FLOAT
```

#### 2. Updated `wav_file_to_blob_data()` function
- Always converts WAV files to standard PCM format using FFmpeg
- Returns both original and converted (PCM) versions in blob data
- Properly calculates duration from the audio data

#### 3. Updated `/transcribe` endpoint
- **Always converts through FFmpeg**, even for WAV files
- Ensures all audio is in standard PCM format before transcription

#### 4. Updated `/transcribe-blob` endpoint
- **Always converts through FFmpeg**, regardless of MIME type
- Handles compressed WAV formats automatically

## Supported Formats

### Before Fix
- ✅ Uncompressed PCM WAV
- ✅ IEEE_FLOAT WAV
- ✅ WebM, MP3, etc. (converted via FFmpeg)
- ❌ DVI_ADPCM WAV
- ❌ Other compressed WAV formats

### After Fix
- ✅ **All WAV formats** (DVI_ADPCM, IMA_ADPCM, MS_ADPCM, etc.)
- ✅ PCM WAV (int8, int16, int24, int32)
- ✅ IEEE_FLOAT WAV (float32, float64)
- ✅ WebM, MP3, MP4, AAC, FLAC, OGG, etc.
- ✅ Any format supported by FFmpeg

## Testing

### Test the Fix
Run the example client:

```bash
python api_client_example.py
```

All examples should now work with your `arth_rp.wav` (DVI_ADPCM format):

1. ✅ Upload and transcribe file
2. ✅ Create blob data and transcribe
3. ✅ Transcribe from server file path
4. ✅ Convert server file to blob data

### Manual Test

```python
import requests

# Test with your DVI_ADPCM WAV file
with open("arth_rp.wav", "rb") as f:
    files = {"audio_file": f}
    response = requests.post("http://localhost:8000/transcribe", files=files)
    
print(response.json()["transcription"])
# Should work now! ✅
```

## Technical Details

### FFmpeg Conversion Command
All audio is now converted to standard format:
```bash
ffmpeg -i input.wav \
  -ar 16000 \              # 16kHz sample rate (optimal for Whisper)
  -ac 1 \                  # Mono channel
  -acodec pcm_s16le \      # PCM signed 16-bit little-endian
  -f wav \                 # WAV container format
  -y output.wav
```

### Performance Impact
- **Minimal overhead**: FFmpeg conversion is very fast (< 1 second for most files)
- **Better compatibility**: Works with any audio format
- **Consistent quality**: All audio normalized to same format (16kHz, mono, 16-bit PCM)

## Troubleshooting

### If conversion still fails:

1. **Check FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```

2. **Check FFmpeg can decode your file:**
   ```bash
   ffmpeg -i arth_rp.wav -ar 16000 -ac 1 output.wav
   ```

3. **Set FFMPEG_BINARY environment variable:**
   ```powershell
   $env:FFMPEG_BINARY = "C:\ffmpeg\bin\ffmpeg.exe"
   ```

4. **Check API logs** for detailed error messages

## Benefits

- ✅ **Universal format support** - Works with any audio format FFmpeg supports
- ✅ **Automatic handling** - No need to pre-process audio files
- ✅ **Better error messages** - Clear indication if FFmpeg is missing
- ✅ **Consistent quality** - All audio normalized to optimal format for Whisper
- ✅ **Backwards compatible** - Existing code continues to work

## Files Modified
- `demo_api.py` - Main API file with all fixes applied
  - `load_audio_from_bytes()` - Enhanced with auto-detection and conversion
  - `wav_file_to_blob_data()` - Always converts to PCM
  - `/transcribe` endpoint - Always uses FFmpeg
  - `/transcribe-blob` endpoint - Always uses FFmpeg
  - `/transcribe-file-path` endpoint - Uses updated functions

---

**Fixed Date**: November 16, 2025  
**Issue**: DVI_ADPCM WAV files not supported  
**Resolution**: Always convert through FFmpeg to standard PCM format

