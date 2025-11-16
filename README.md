# InsightLoop

Real-time, edge-AI agent tutoring that listens to you and responds instantly

## Application Description
InsightLoop helps students learn from PDFs by combining speech explanations with slide context. Students record a short explanation; the app transcribes it locally (Whisper), analyzes silence, pitch, and speaking rate for signs of uncertainty, and uses a local LLM (Nexa) to semantically compare the explanation with the slide’s key concepts. If understanding is correct, the student advances; if not, the tutor highlights what was right, what’s missing, and gives targeted feedback—fully on-device friendly and fast to iterate.

## Author Information

| Name | Email |
| :-- | :-- |
| **Bao Nguyen** | [nnbao04@gmail.com](mailto:nnbao04@gmail.com) |
| **Giap Nguyen** | [giaptomhoang@gmail.com](mailto:giaptomhoang@gmail.com) |

This project has:
- Frontend (React + Vite)
- Real‑time confusion detection (silence analysis, pitch variation, and speaking rate)
- Whisper transcription backend (FastAPI, ONNX Runtime QNN/NPU)
- Nexa local LLM (Desktop + CLI) with a small FastAPI proxy

## Implementation
This app was built for the Snapdragon X Elite but designed to be platform agnostic. Performance may vary on other hardware.

Machine: Microsoft Surface Laptop, 7th Edition
Chip: Snapdragon X Elite
OS: Windows 11 
Memory: 32 GB
Python Version: 3.13.9 (ARM)

## Frontend

Requirements: Node.js 18+

```bash
npm install
npm run dev
```

App runs at http://localhost:3000


## Backend: Whisper (Transcription)

Folder: `ai-hub-apps/apps/windows/python/Whisper`

Follow steps from that README (lines 1–30) then start the API:

```powershell
# 1) Enable scripts (Admin PowerShell)
Set-ExecutionPolicy -Scope CurrentUser Unrestricted -Force

# 2) Install platform deps (includes ffmpeg)
cd ai-hub-apps\apps\windows\python\Whisper
..\install_platform_deps.ps1 -extra_pkgs ffmpeg

# 3) Re-open Anaconda PowerShell Prompt in this folder

# 4) Create & activate env
..\activate_venv.ps1 -name AI_Hub

# 5) Run API
python demo_api.py
```

Transcription endpoint: `POST http://localhost:8000/transcribe-blob`


## Backend: Nexa LLM

1) Install Nexa Desktop and open the Nexa CLI
2) (Optional) Check CLI: `nexa -h`
3) Pull model (NPU): `nexa pull NexaAI/Llama3.2-3B-NPU-Turbo`
4) Serve API: `nexa serve`  (OpenAI‑compatible on `http://127.0.0.1:18181`)


## Chat Proxy API (FastAPI)

Folder: `local-agent`

```powershell
cd local-agent
python chat_api.py
```

Endpoints:
- `GET /` – health
- `POST /chat` – body `{ question, slideContent }` → `{ response, debug }`


## Ports
- Frontend (Vite): 5173
- Whisper API:     8000
- Chat API:        8001
- Nexa Server:     18181


## Tips / Troubleshooting
- Windows consoles can throw `charmap` errors for Unicode; we sanitize logs server‑side.
- First LLM call after model load can be slow; wait or warm up with a short prompt.
- To free a busy port:
  ```powershell
  netstat -ano | findstr :8001
  taskkill /PID <PID> /F
  ```


## License
MIT
