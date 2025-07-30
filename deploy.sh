#!/bin/bash

echo "🚀 Manual Vercel Deployment Script"
echo "================================="
echo ""
echo "This script will deploy to Vercel using their CLI"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

echo "🔐 You'll need to login to Vercel first time"
echo "📋 Follow the prompts to deploy"
echo ""

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment initiated!"