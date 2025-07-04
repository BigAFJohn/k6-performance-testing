#!/bin/bash 

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Step 1: Preparing users (registering, verifying OTP, getting tokens) ---"

# Execute the Node.js script to prepare users
dotenv -e .env -- node run-k6-with-otp.js # Ensure .env is loaded for Node.js script too

echo "--- Step 2: Running k6 load test with prepared users ---"
# Execute the k6 test, BASE_URL and K6_OUT are passed via docker-compose.yml environment
dotenv -e .env -- k6 run test.js

echo "--- All steps completed successfully! ---"