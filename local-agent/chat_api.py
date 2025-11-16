"""
FastAPI Chat API - Proxy for Nexa LLM
This server acts as a proxy between the frontend and the Nexa LLM server,
handling CORS and providing a clean REST API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn

app = FastAPI(title="Insight Loop Chat API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nexa configuration
NEXA_URL = "http://127.0.0.1:18181/v1/chat/completions"
NEXA_API_KEY = "nexa"
NEXA_MODEL = "NexaAI/Llama3.2-3B-NPU-Turbo"

class ChatRequest(BaseModel):
    question: str
    slideContent: str

class ChatResponse(BaseModel):
    response: str
    debug: dict

def safe_print(text):
    try:
        print(text.encode("ascii", "ignore").decode("ascii"))
    except:
        print("<<non-ascii text>>")

def safe_ascii(text) -> str:
    try:
        return str(text).encode("ascii", "ignore").decode("ascii")
    except Exception:
        return ""

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Insight Loop Chat API",
        "nexa_url": NEXA_URL,
        "model": NEXA_MODEL
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Handle chat requests from the frontend.
    
    Args:
        request: ChatRequest containing question and slideContent
        
    Returns:
        ChatResponse with AI response and debug info
    """
    try:
        # Prepare the prompt with slide context
        prompt_with_context = f"""You are an AI tutor helping a student understand their learning material. 

Current Slide Content:
{request.slideContent}

Student Question: {request.question}

Please provide a helpful, educational response based on the slide content and the student's question."""
        
        # Debug logging (ASCII-safe to avoid Windows charmap issues)
        print("\n=== CHAT REQUEST ===")
        print(f"Question: {safe_ascii(request.question)}")
        print(f"Slide Content: {safe_ascii(request.slideContent[:100])}...")
        print("===================\n")
        
        # Call Nexa API
        response = requests.post(
            NEXA_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {NEXA_API_KEY}",
            },
            json={
                "model": NEXA_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt_with_context
                    }
                ],
                "max_tokens": 256,
                "temperature": 0.7,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"[ERROR] Nexa API Error: {response.status_code}")
            safe_error = response.text.encode('ascii', 'ignore').decode('ascii')
            print(f"[ERROR] Response: {safe_error[:200]}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Nexa API error: {safe_error[:500]}"  # Use safe_error instead of response.text
            )
        
        data = response.json()
        ai_response = data['choices'][0]['message']['content']
        
        # Debug logging (safe for Windows console - remove emojis)
        try:
            safe_response = ai_response.encode('ascii', 'ignore').decode('ascii')
            print(f"[OK] AI Response (length: {len(ai_response)} chars): {safe_response[:200]}...")
        except:
            print(f"[OK] AI Response received ({len(ai_response)} chars)")
        print("")
        
        return ChatResponse(
            response=ai_response,
            debug={
                "question": request.question,
                "slideContentLength": len(request.slideContent),
                "slidePreview": safe_ascii(request.slideContent[:100]),
                "tokensUsed": data.get('usage', {}).get('total_tokens', 0)
            }
        )
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request Error: {str(e)[:200]}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Nexa server: {str(e)}"
        )
    except Exception as e:
        # Safely handle error message (remove Unicode for Windows console)
        try:
            error_msg = str(e).encode('ascii', 'ignore').decode('ascii')
        except:
            error_msg = "Error occurred (contains non-ASCII characters)"
        
        print(f"[ERROR] Exception: {error_msg[:200]}")
        
        # Return safe error message (no Unicode)
        safe_detail = error_msg if error_msg else "Internal server error occurred"
        raise HTTPException(
            status_code=500,
            detail=safe_detail
        )

if __name__ == "__main__":
    print(f"Starting Chat API server...")
    print(f"Connecting to Nexa at: {NEXA_URL}")
    print(f"Using model: {NEXA_MODEL}")
    print(f"Server will run on: http://localhost:8001")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)

