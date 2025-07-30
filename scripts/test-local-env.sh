#!/bin/bash

# Test Local Environment Script
# Ensures local Docker environment still works after deployment changes

echo "🧪 Testing Local Environment"
echo "==========================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"

# Check if PostgreSQL container is running
if docker ps | grep -q "postgres:15"; then
    echo "✅ PostgreSQL container is running"
else
    echo "⚠️  PostgreSQL container not running. Starting it..."
    docker-compose up -d postgres
    sleep 5
fi

# Test database connection
echo ""
echo "📋 Testing database connection..."
export DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
export DIRECT_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"

# Check if we can connect to the database
if pnpm prisma db push --skip-generate > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "   Please check your Docker PostgreSQL container"
    exit 1
fi

# Check if the app can start
echo ""
echo "📋 Testing Next.js application..."
echo "   Starting development server (press Ctrl+C to stop)..."
echo ""

# Start the app
pnpm dev