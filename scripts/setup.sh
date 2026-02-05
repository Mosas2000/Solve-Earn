#!/bin/bash

# Setup script for Solve-Earn testing

echo "🔧 Solve-Earn Testing Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
    echo ""
    echo "Current contents:"
    cat .env
    echo ""
    read -p "Do you want to update it? (yes/no): " update
    if [ "$update" != "yes" ]; then
        echo "Setup cancelled."
        exit 0
    fi
else
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "📋 You need your Stacks private key"
echo ""
echo "How to get it:"
echo "  Hiro Wallet: Settings → View Secret Key"
echo "  Leather Wallet: Settings → View Secret Key"
echo ""
echo "⚠️  WARNING: Keep your private key safe!"
echo "    Never share it or commit it to git"
echo ""

read -p "Enter your Stacks private key: " private_key

if [ -z "$private_key" ]; then
    echo "❌ No private key entered. Setup cancelled."
    exit 1
fi

# Update .env file
echo "STACKS_PRIVATE_KEY=$private_key" > .env

echo ""
echo "✅ Setup complete!"
echo ""
echo "🧪 Next steps:"
echo "1. Verify deployment:"
echo "   node test-readonly.js"
echo ""
echo "2. Register as researcher:"
echo "   node demo-first-transaction.js"
echo ""
echo "3. Interactive testing:"
echo "   node test-interactive.js"
echo ""
