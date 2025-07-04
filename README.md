
# KingdomPortal K6 Performance Testing Framework

This repository contains performance test scripts for the KingdomPortal platform using [k6](https://k6.io/), integrated with Node.js for dynamic user preparation, Docker Compose for environment isolation, and GitHub Actions for CI/CD automation.

🚀 **Overview**

This framework simulates realistic user load on the application's API, covering a full user journey:

1. **User Registration**
2. **OTP Verification**
3. **User Login**
4. **Prayer Creation**
5. **Testimony Submission**
6. **Comment Posting**

It addresses complex scenarios like dynamic user creation and OTP handling by pre-authenticating users before the load test, ensuring efficient and accurate performance measurement.

✨ **Features**

- **Dynamic User Preparation**: 
  Node.js script registers new users, fetches OTPs from the database, verifies them, and obtains JWT tokens.

- **Scalable Load Testing**: 
  k6 uses pre-authenticated user data to simulate a high number of concurrent users.

- **End-to-End Journey Metrics**: 
  Tracks the total time taken for a complete user flow (login to comment post).

- **Dockerized Environment**: 
  Run tests consistently across different environments using Docker Compose (includes InfluxDB for data storage and Grafana for visualization).

- **CI/CD Integration**: 
  Automated performance tests via GitHub Actions on push/pull requests.

## Project Structure

```
scripts/
├── auth/
│   ├── register.js        # Handles user registration
│   └── verifyOtp.js       # Handles OTP verification
├── user/
│   ├── addComment.js      # Simulates user adding a comment
│   ├── createPrayer.js    # Simulates user creating a prayer
│   └── createTestimony.js # Simulates user creating a testimony
├── utils/
│   ├── faker.js           # Utility for generating fake data
│   └── logger.js          # Custom logger for k6 output
.env                       # Environment variables
.env.otp                   # OTP-related environment variables
docker-compose.yml         # For containerized services
README.md                  # Project documentation
run-k6-with-otp.js         # Script to run k6 test with OTP logic
summary.json               # JSON summary of test results
test.js                    # Entry point for performance tests
```

## Getting Started

### Prerequisites

Before running the tests, ensure you have the following installed:

- **Node.js** (v16 or higher, recommended v20)
- **npm**
- **Docker Desktop** (includes Docker Engine and Docker Compose)
- **Git**
- **k6** (optional for local runs, but required if not using Docker)
- **dotenv-cli**: `npm install -g dotenv-cli` (for local shell script execution)

### Installation

To install the necessary dependencies:

```bash
npm install
```

### Running a Test
Running the Project
1. Prepare Users (Local - Manual Step)
This step registers users, fetches OTPs from the database, verifies them, and obtains JWT tokens. These pre-authenticated user details are saved to prepared_users.json. This script is a Node.js script and uses Node.js's native fetch and mysql2.

```bash
node run-k6-with-otp.js
```

Note: This step will take some time as it involves API calls and database polling for each virtual user.

Troubleshooting: If resend-otp or OTP verification fails, ensure the API endpoints are correctly configured and accessible, and that resend-otp (if secured) has the necessary authentication configured in prepareUsers.js.

2. Run K6 Test (Local - After Preparing Users)
Once prepared_users.json is successfully generated, you can run the k6 load test.

```bash
node dotenv -e .env -- k6 run test.js
```

This command loads the environment variables from .env and executes test.js using k6.

The test.js script will load the prepared_users.json file and simulate (X) concurrent users performing the full user journey. The nummber of users can be adjusted in the script based on project needs.

Results will be printed to the console and saved to k6_results.json.

3. Run with Docker Compose (Recommended for Local Development & CI/CD)
This is the most convenient way to run the entire setup (InfluxDB, Grafana, user preparation, and k6 test) in an isolated environment.

```bash
docker-compose up --build
```
This command will:

Build the k6_runner Docker image (if not cached).

Start influxdb and grafana services.

Start the k6_runner service, which executes the run_full_test.sh script.

run_full_test.sh will first run prepareUsers.js to create prepared_users.json inside the container.

Then, run_full_test.sh will run k6 run test.js, with k6 sending its metrics to the influxdb service within the Docker network.

Access Grafana: Once services are up, open your browser to http://localhost:3001 (default credentials: admin/admin123). You can then configure a data source to InfluxDB (http://influxdb:8086) and import a k6 dashboard (e.g., Grafana Dashboard ID 2001).

4. Run via GitHub Actions (CI/CD Automation)
The performance-test.yml workflow is configured to run on push to main and pull_request to main, or manually via workflow_dispatch.


### Environment Variables

Create a `.env` file in the root directory and configure necessary keys:

```env
BASE_URL=Your BaseUrl

# InfluxDB target for k6 results
INFLUX_URL=http://localhost:8086/k6

# MySQL credentials used to fetch OTP from the DB
DATABASE_HOST=your hostname
DATABASE_PORT=your portnumber
DATABASE_NAME=your database name
DATABASE_USERNAME=your database username
DATABASE_PASSWORD=your database password

### Running via Docker

If you want to run the tests using Docker, ensure Docker and Docker Compose are installed. Then, build and run the Docker container with:

```bash
docker-compose up --build
```

This command will automatically:

1. Build the Docker image using the `Dockerfile`.
2. Start the services defined in `docker-compose.yml`, including InfluxDB and Grafana for monitoring the load test.
3. Execute the test and log results.

### Continuous Integration (CI/CD)

This framework is designed to be used with GitHub Actions for CI/CD automation. Every time a push or pull request is made to the `main` branch, the tests will run automatically. Make sure your repository has a `.github/workflows/performance-test.yml` file set up for automated testing.

### License

This project is licensed under the MIT License.

### Author
John Ige
