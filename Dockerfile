FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy and install Node dependencies
COPY package*.json ./
RUN npm install

# Install k6
RUN apk add --no-cache curl \
    && curl -L https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-arm64.tar.gz -o /tmp/k6.tar.gz \
    && mkdir -p /tmp/k6-extracted \
    && tar xz -f /tmp/k6.tar.gz -C /tmp/k6-extracted \
    && mv /tmp/k6-extracted/k6-v0.49.0-linux-arm64/k6 /usr/bin/k6 \
    && chmod +x /usr/bin/k6 \
    && rm -rf /tmp/k6.tar.gz /tmp/k6-extracted

# Install dotenv-cli globally
RUN npm install -g dotenv-cli

# Copy all project files
COPY . .

# Ensure run_full_test.sh has executable permissions
RUN chmod +x /app/run_full_test.sh

# Use the script as entrypoint
ENTRYPOINT ["/bin/sh", "/app/run_full_test.sh"]
