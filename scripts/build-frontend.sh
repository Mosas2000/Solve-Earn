#!/bin/bash

echo "Building Solve-Earn frontend..."

cd frontend
npm install
npm run build

echo "Build complete! Output in frontend/dist/"
