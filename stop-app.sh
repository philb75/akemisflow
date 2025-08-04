#!/bin/bash

# AkemisFlow Stop Script
# Cleanly stops the running application

echo "🛑 Stopping AkemisFlow application..."

# Check if PID file exists
if [ -f "logs/akemisflow.pid" ]; then
    PID=$(cat logs/akemisflow.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "📋 Found running process with PID: $PID"
        echo "🔄 Sending graceful shutdown signal..."
        kill $PID
        
        # Wait for graceful shutdown
        sleep 5
        
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  Process still running, forcing termination..."
            kill -9 $PID
        fi
        
        echo "✅ Process terminated"
    else
        echo "⚠️  Process with PID $PID is not running"
    fi
    
    rm -f logs/akemisflow.pid
else
    echo "📋 No PID file found, looking for Next.js processes..."
    pkill -f "next dev" && echo "✅ Killed Next.js processes" || echo "ℹ️  No Next.js processes found"
fi

# Also kill any remaining dev processes
pkill -f "node.*dev" 2>/dev/null && echo "✅ Killed additional dev processes" || true

echo "🏁 Application stopped"