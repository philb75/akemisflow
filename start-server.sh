#!/bin/bash

# Load environment variables
source .env.local

# Kill any existing processes on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo "No processes on port 3000"

# Wait a moment
sleep 2

# Start server with error logging
echo "Starting AkemisFlow server..."
npm run dev -- --hostname 0.0.0.0 2>&1 | tee -a server-debug.log