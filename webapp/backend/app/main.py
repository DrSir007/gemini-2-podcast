from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Literal
import os
import sys
import shutil
from pathlib import Path
import google.generativeai as genai
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import tempfile
import logging
from google.cloud import texttospeech

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Text-to-Speech client
try:
    tts_client = texttospeech.TextToSpeechClient()
    logger.info("Successfully initialized Google Cloud Text-to-Speech client")
except Exception as e:
    logger.error(f"Failed to initialize Text-to-Speech client: {e}")
    raise

app = FastAPI(title="AI Podcast Generator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
UPLOAD_DIR = Path("uploads")
AUDIO_DIR = Path("audio_output")
UPLOAD_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

class PodcastRequest(BaseModel):
    content: str
    style: str
    type: str
    voice: str = "en-US-Neural2-C"  # Default voice

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Podcast Generator API"}

@app.get("/voices")
async def get_voices():
    """Get available voices for text-to-speech"""
    try:
        # List available voices
        response = tts_client.list_voices()
        available_voices = []
        
        for voice in response.voices:
            if "en-US" in voice.language_codes and "Neural2" in voice.name:
                voice_info = {
                    "id": voice.name,
                    "name": voice.name.split("-")[-1],
                    "description": f"Neural voice with {voice.ssml_gender.name} gender"
                }
                available_voices.append(voice_info)
        
        return {"voices": available_voices}
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-podcast")
async def generate_podcast(request: PodcastRequest):
    try:
        logger.info(f"Generating podcast with style: {request.style}, type: {request.type}")
        
        # Generate script using Gemini
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"Create a {request.style} podcast script about {request.content}. The format should be {request.type}. Make it engaging and natural for text-to-speech."
        
        response = model.generate_content(prompt)
        script = response.text
        
        if not script:
            raise HTTPException(status_code=400, detail="Failed to generate script")
        
        # Generate audio using Google Cloud Text-to-Speech
        try:
            # Set the text input to be synthesized
            synthesis_input = texttospeech.SynthesisInput(text=script)

            # Build the voice request
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name=request.voice,
            )

            # Select the type of audio file to return
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,  # Slightly slower for better clarity
                pitch=0.0,  # Default pitch
            )

            # Perform the text-to-speech request
            response = tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )

            # Create a temporary file for the audio
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_file.write(response.audio_content)
                logger.info(f"Audio generated successfully at {temp_file.name}")
                
                return {
                    "script": script,
                    "audio_path": temp_file.name
                }
                
        except Exception as e:
            logger.error(f"TTS generation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error in generate_podcast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        
        # If it's a text file, read it directly
        if file.content_type == "text/plain":
            text_content = content.decode()
        # If it's HTML, parse it with BeautifulSoup
        elif file.content_type == "text/html":
            soup = BeautifulSoup(content, 'html.parser')
            text_content = soup.get_text()
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
            
        return {"content": text_content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    try:
        # Test Gemini API
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Hello")
        
        # Test TTS
        synthesis_input = texttospeech.SynthesisInput(text="TTS system is working.")
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Neural2-C"
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        return {
            "status": "healthy",
            "gemini_api": "connected",
            "tts_system": "working"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    try:
        return FileResponse(filename)
    except Exception as e:
        logger.error(f"Error serving audio file: {e}")
        raise HTTPException(status_code=404, detail="Audio file not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 