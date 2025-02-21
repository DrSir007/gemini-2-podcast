from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import sys
import shutil
from pathlib import Path
import google.generativeai as genai
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pydub import AudioSegment
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Gemini API
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=api_key)

app = FastAPI(title="AI Podcast Generator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class PodcastRequest(BaseModel):
    content: str
    style: str
    content_type: str

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Podcast Generator API"}

@app.post("/generate-podcast")
async def generate_podcast(request: PodcastRequest):
    try:
        logger.info(f"Generating podcast with style: {request.style}, type: {request.content_type}")
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-pro')
        
        # Prepare the prompt based on style and content type
        prompt = f"""Generate a podcast script in a {request.style} style about the following {request.content_type}:
        
        {request.content}
        
        Make it engaging, informative, and natural-sounding. Include appropriate transitions and maintain the chosen style throughout.
        Format the output as a proper podcast script with speaker indicators and clear sections."""
        
        # Generate the script
        response = model.generate_content(prompt)
        
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="Failed to generate content")
        
        # Extract and clean the generated text
        script = response.text
        
        logger.info("Successfully generated podcast script")
        
        return JSONResponse(content={
            "script": script,
            "status": "success"
        })
        
    except Exception as e:
        logger.error(f"Error generating podcast: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating the podcast: {str(e)}"
        )

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

@app.post("/api/generate")
async def generate_podcast_from_file(
    style: str = Form(...),
    content_type: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    try:
        # Handle file upload if provided
        if file:
            file_path = UPLOAD_DIR / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            with file_path.open("r", encoding="utf-8") as f:
                content = f.read()
            file_path.unlink()  # Delete the temporary file
        
        if not content:
            raise HTTPException(status_code=400, detail="No content provided")

        # Generate script with selected style
        script = generate_script.generate_content(
            content_type=content_type,
            content=content,
            style=style
        )

        # Generate audio
        audio_path = generate_audio.convert_to_audio(script)

        # Return the audio file
        return FileResponse(
            audio_path,
            media_type="audio/wav",
            filename="podcast.wav"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    try:
        # Test Gemini API connection
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Test connection")
        if response and response.text:
            return {"status": "healthy", "api_connection": "ok"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 