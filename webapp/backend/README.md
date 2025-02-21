# Podcast Generator Backend

This is the backend service for the AI Podcast Generator application. It uses FastAPI to provide a REST API for generating podcast scripts using Google's Gemini AI model.

## Prerequisites

- Python 3.11 or higher
- Virtual environment (recommended)
- Google Gemini API key

## Setup

1. Create and activate a virtual environment:
```bash
python3.11 -m venv venv_py311
source venv_py311/bin/activate  # On Windows: .\venv_py311\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Google Gemini API key to `.env`

## Running the Server

Start the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### GET /
- Health check endpoint
- Returns: `{"message": "Welcome to the Podcast Generator API"}`

### POST /generate-podcast
- Generates a podcast script from text input
- Request body:
  ```json
  {
    "content": "Your content here",
    "style": "casual|professional|storytelling",
    "content_type": "article|blog|story"
  }
  ```

### POST /upload-file
- Uploads a text or HTML file and extracts its content
- Request: `multipart/form-data`
- Accepts: `.txt`, `.html` files

## Development

The server will automatically reload when you make changes to the code.

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 500: Internal Server Error

All errors include a detail message in the response body. 