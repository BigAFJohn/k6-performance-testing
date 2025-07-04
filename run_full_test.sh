#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure .env file exists before running any command
if [[ ! -f .env ]]; then
  echo "❌ .env file not found! Please ensure the .env file exists."
  exit 1
fi

echo "--- Step 1: Preparing users (registering, verifying OTP, getting tokens) ---"

# Check if dotenv-cli is installed
if ! command -v dotenv &> /dev/null; then
  echo "❌ dotenv-cli could not be found. Please install it globally or via npm."
  exit 1
fi

# Execute the Node.js script to prepare users
echo "Executing Node.js script to prepare users..."
dotenv -e .env -- node run-k6-with-otp.js 

echo "--- Step 2: Running k6 load test with prepared users ---"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "❌ k6 could not be found. Please ensure k6 is installed and available."
  exit 1
fi

# Execute the k6 test, BASE_URL and K6_OUT are passed via docker-compose.yml environment
echo "Running k6 test..."
dotenv -e .env -- k6 run test.js

echo "--- All steps completed successfully! ---"
