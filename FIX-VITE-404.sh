#!/bin/bash
# Fix Vite 404 errors for missing dependencies

echo "🔧 Fixing Vite dependency cache issues..."

# Step 1: Stop the dev server if running (Ctrl+C in the terminal where it's running)
echo "📍 Step 1: Make sure to stop your dev server (Ctrl+C)"
read -p "Press Enter when server is stopped..."

# Step 2: Clear Vite cache
echo "🗑️  Step 2: Clearing Vite cache..."
rm -rf node_modules/.vite

# Step 3: Clear node_modules (optional but recommended)
echo "🗑️  Step 3: Clearing node_modules..."
rm -rf node_modules

# Step 4: Clear package lock
echo "🗑️  Step 4: Clearing package-lock.json..."
rm -f package-lock.json

# Step 5: Reinstall dependencies
echo "📦 Step 5: Reinstalling dependencies..."
npm install

# Step 6: Start dev server
echo "🚀 Step 6: Starting dev server..."
npm run dev
