#\!/bin/bash

echo "🔄 Starting AkemisFlow Application..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Check Docker containers
echo "🐳 Checking Docker containers..."
docker-compose ps

# Test database connection
echo "🗄️ Testing database connection..."
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev" node -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
prisma.\$queryRaw\`SELECT 1 as test\`.then(result => {
  console.log('✅ Database connected:', result)
  prisma.\$disconnect()
}).catch(error => {
  console.error('❌ Database failed:', error.message)
  process.exit(1)
})
"

# Start the application
echo "🚀 Starting Next.js development server..."
export DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
export NODE_ENV="development"

npm run dev
EOF < /dev/null