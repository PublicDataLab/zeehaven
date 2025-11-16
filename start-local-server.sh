#!/bin/bash
# Quick start script for running zeehaven locally

echo "🌐 Starting Zeehaven local server..."
echo ""
echo "Python 3 detected. Starting server..."
cd "$(dirname "$0")"
python3 -m http.server 8000

echo ""
echo "✅ Server started! Open your browser to:"
echo "   http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
