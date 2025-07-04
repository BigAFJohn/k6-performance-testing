FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if you have one) to install Node.js dependencies
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install k6 (globally in the container, as it's an executable)
RUN apk add --no-cache curl \
    && curl -L https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-arm64.tar.gz -o /tmp/k6.tar.gz \
    && mkdir -p /tmp/k6-extracted \
    && tar xz -f /tmp/k6.tar.gz -C /tmp/k6-extracted \
    && mv /tmp/k6-extracted/k6-v0.49.0-linux-arm64/k6 /usr/bin/k6 \
    && chmod +x /usr/bin/k6 \
    && rm -rf /tmp/k6.tar.gz /tmp/k6-extracted

# Install dotenv-cli globally for running shell scripts with .env files
RUN npm install -g dotenv-cli

# Copy the rest of application code into the container
COPY . .

# execute shell script
ENTRYPOINT ["/bin/sh", "/app/run_full_test.sh"]
