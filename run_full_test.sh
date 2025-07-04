#!/bin/sh

set -e

if [ ! -f .env ]; then
  echo "❌ .env file not found! Please ensure the .env file exists."
  exit 1
fi

echo "--- Step 1: Preparing users (registering, verifying OTP, getting tokens) ---"

if ! command -v dotenv >/dev/null 2>&1; then
  echo "❌ dotenv-cli not found. Please install it."
  exit 1
fi

echo "Executing Node.js script to prepare users..."
dotenv -e .env -- node run-k6-with-otp.js

echo "--- Step 2: Running k6 load test with prepared users ---"

if ! command -v k6 >/dev/null 2>&1; then
  echo "❌ k6 not found. Please ensure k6 is installed."
  exit 1
fi

echo "Running k6 test with JSON output..."
k6 run --out json=k6_results.json /app/test.js

echo "--- All steps completed successfully! ---"
