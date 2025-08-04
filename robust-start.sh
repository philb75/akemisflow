#!/bin/bash

# AkemisFlow Robust Startup Script
# Addresses recurrent startup and connectivity issues
# 
# Usage: ./robust-start.sh [port]

set -e  # Exit on any error

PORT=${1:-3000}
LOG_FILE="logs/startup-$(date +%Y%m%d_%H%M%S).log"
MAX_WAIT_TIME=60
CHECK_INTERVAL=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "ERROR")
            echo -e "${RED}❌ [$timestamp] ERROR: $message${NC}" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  [$timestamp] WARN:  $message${NC}" | tee -a "$LOG_FILE"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  [$timestamp] INFO:  $message${NC}" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ [$timestamp] SUCCESS: $message${NC}" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Create logs directory
mkdir -p logs

log "INFO" "🚀 Starting AkemisFlow Robust Startup Process"
log "INFO" "📊 Target Port: $PORT"
log "INFO" "📝 Startup Log: $LOG_FILE"

# Step 1: Clean up any existing processes
log "INFO" "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || log "INFO" "No existing Next.js processes found"
pkill -f "node.*dev" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Step 2: Check and free up the target port
log "INFO" "🔍 Checking port $PORT availability..."
if lsof -i :$PORT >/dev/null 2>&1; then
    log "WARN" "Port $PORT is in use, attempting to free it..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    sleep 3
    
    if lsof -i :$PORT >/dev/null 2>&1; then
        log "ERROR" "Could not free port $PORT. Please manually stop the process using this port."
        exit 1
    fi
fi
log "SUCCESS" "Port $PORT is available"

# Step 3: Verify Docker services
log "INFO" "🐳 Checking Docker services..."
if ! docker-compose ps | grep -q "Up.*healthy"; then
    log "WARN" "Docker services not healthy, starting them..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "INFO" "⏳ Waiting for Docker services to be healthy..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if docker-compose ps | grep -q "Up.*healthy"; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log "ERROR" "Docker services failed to become healthy"
        exit 1
    fi
fi
log "SUCCESS" "Docker services are healthy"

# Step 4: Load environment variables
log "INFO" "📋 Loading environment variables..."
if [ -f ".env.local" ]; then
    log "INFO" "Loading .env.local"
    export $(grep -v '^#' .env.local | xargs)
elif [ -f ".env" ]; then
    log "INFO" "Loading .env"
    export $(grep -v '^#' .env | xargs)
else
    log "WARN" "No .env.local or .env file found"
fi

# Step 5: Test database connectivity
log "INFO" "🗄️  Testing database connectivity..."
if ! node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
        .then(() => { console.log('DB_CONNECTED'); prisma.\$disconnect(); })
        .catch(e => { console.error('DB_ERROR:', e.message); process.exit(1); });
" 2>/dev/null | grep -q "DB_CONNECTED"; then
    log "ERROR" "Database connection failed"
    log "INFO" "Checking DATABASE_URL configuration..."
    if [ -z "$DATABASE_URL" ]; then
        log "ERROR" "DATABASE_URL environment variable is not set"
        exit 1
    fi
    exit 1
fi
log "SUCCESS" "Database connection verified"

# Step 6: Run pre-startup checks
log "INFO" "🔍 Running pre-startup checks..."
if ! node scripts/startup-check.js > /dev/null 2>&1; then
    log "WARN" "Some startup checks failed, but proceeding..."
fi

# Step 7: Start the application
log "INFO" "🚀 Starting Next.js application..."

# Set environment variables
export AKEMIS_ENV=local
export NODE_ENV=development
export FORCE_COLOR=1

# Start Next.js in background with output redirection
npm run dev -- -p $PORT > "logs/nextjs-output.log" 2>&1 &
NEXTJS_PID=$!

log "INFO" "📋 Next.js started with PID: $NEXTJS_PID"

# Step 8: Wait for application to be ready
log "INFO" "⏳ Waiting for application to be ready..."
start_time=$(date +%s)
ready=false

while [ $(($(date +%s) - start_time)) -lt $MAX_WAIT_TIME ]; do
    # Check if process is still running
    if ! ps -p $NEXTJS_PID > /dev/null 2>&1; then
        log "ERROR" "Next.js process terminated unexpectedly"
        log "INFO" "Last 20 lines of Next.js output:"
        tail -20 "logs/nextjs-output.log" | while read line; do
            log "ERROR" "$line"
        done
        exit 1
    fi
    
    # Check if port is listening
    if lsof -i :$PORT > /dev/null 2>&1; then
        # Test HTTP connectivity
        if curl -s -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
            ready=true
            break
        fi
    fi
    
    log "INFO" "Still waiting... ($(($(date +%s) - start_time))/${MAX_WAIT_TIME}s)"
    sleep $CHECK_INTERVAL
done

if [ "$ready" = true ]; then
    # Step 9: Verify full functionality
    log "SUCCESS" "🎉 Application is ready!"
    log "INFO" "🔗 Testing endpoints..."
    
    # Test multiple endpoints
    endpoints=("/api/health" "/" "/api/auth/session")
    for endpoint in "${endpoints[@]}"; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT$endpoint 2>/dev/null || echo "000")
        if [ "$response_code" != "000" ]; then
            log "SUCCESS" "Endpoint $endpoint responding (HTTP $response_code)"
        else
            log "WARN" "Endpoint $endpoint not responding"
        fi
    done
    
    # Step 10: Display startup summary
    log "SUCCESS" "🚀 AkemisFlow is now running successfully!"
    echo ""
    echo -e "${GREEN}┌─────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│             AkemisFlow Ready            │${NC}"
    echo -e "${GREEN}├─────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}│ URL:      http://localhost:$PORT        │${NC}"
    echo -e "${GREEN}│ Mode:     Local + Prisma + PostgreSQL   │${NC}"
    echo -e "${GREEN}│ PID:      $NEXTJS_PID                         │${NC}"
    echo -e "${GREEN}│ Logs:     $LOG_FILE    │${NC}"
    echo -e "${GREEN}│ Next.js:  logs/nextjs-output.log       │${NC}"
    echo -e "${GREEN}└─────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${BLUE}💡 To stop the application: kill $NEXTJS_PID${NC}"
    echo -e "${BLUE}💡 To view logs: tail -f $LOG_FILE${NC}"
    echo -e "${BLUE}💡 To view Next.js logs: tail -f logs/nextjs-output.log${NC}"
    echo ""
    
    # Create a PID file for easy management
    echo $NEXTJS_PID > "logs/akemisflow.pid"
    log "INFO" "PID saved to logs/akemisflow.pid"
    
    # Monitor the process (optional)
    if [ "${MONITOR:-false}" = "true" ]; then
        log "INFO" "🔍 Starting monitoring mode..."
        while ps -p $NEXTJS_PID > /dev/null 2>&1; do
            sleep 10
            if ! curl -s -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
                log "WARN" "Health check failed, application may have issues"
            fi
        done
        log "ERROR" "Application process terminated"
    fi
    
else
    log "ERROR" "❌ Application failed to start within $MAX_WAIT_TIME seconds"
    log "INFO" "Terminating Next.js process..."
    kill $NEXTJS_PID 2>/dev/null || true
    
    log "INFO" "Last 30 lines of Next.js output:"
    tail -30 "logs/nextjs-output.log" | while read line; do
        log "ERROR" "$line"
    done
    exit 1
fi