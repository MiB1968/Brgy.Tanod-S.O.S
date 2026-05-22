#!/bin/bash
echo "🚀 Deploying Brgy. Tanod S.O.S..."

# Build Frontend
echo "Building Frontend..."
npm run build

# Build Backend
echo "Building Backend..."
npx tsc --project tsconfig.server.json

echo "✅ Build Complete!"

echo "
Deployment Options:

1. Docker (Recommended):
   docker-compose up -d --build

2. Vercel (Frontend) + Render (Backend):
   - Frontend: vercel --prod
   - Backend: Deploy src/server/index.ts on Render.com

3. Manual:
   - Frontend: npm run preview
   - Backend: npm run server
"

echo "Don't forget to set environment variables!"
