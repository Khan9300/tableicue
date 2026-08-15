# Official Playwright image with all browser dependencies installed
FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install packages
RUN npm ci

# Copy source code
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Run scraper as cron entrypoint
CMD ["npm", "start"]
