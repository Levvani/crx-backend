FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright browsers and dependencies
RUN npx playwright install chromium --with-deps

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 80

# Start the application
CMD ["npm", "run", "start:prod"]