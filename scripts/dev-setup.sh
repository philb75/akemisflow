#!/bin/bash

# AkemisFlow Development Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 AkemisFlow Development Setup"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Start Docker services
echo "📦 Starting Docker services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec postgres pg_isready -U akemisflow -d akemisflow_dev; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready"

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push

# Seed the database
echo "🌱 Seeding database with sample data..."
npx prisma db seed

echo "🎉 Development environment is ready!"
echo ""
echo "🔗 Available services:"
echo "  - Application: http://localhost:3000"
echo "  - pgAdmin: http://localhost:8080 (admin@akemisflow.local / admin123)"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "🚀 To start development:"
echo "  npm run dev"
echo ""
echo "🛠️ Useful commands:"
echo "  npm run db:studio     - Open Prisma Studio"
echo "  npm run db:reset      - Reset database with fresh data"
echo "  npm run docker:down   - Stop all services"