#!/bin/bash

# Start the backend server
cd backend
source venv_py311/bin/activate
uvicorn app.main:app --reload &

# Start the frontend server
cd ../frontend
npm run dev &

# Wait for both processes
wait 