FROM node:20

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright and browsers
RUN npx playwright install --with-deps chromium

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:prod"]