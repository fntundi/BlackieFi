# BlackieFi Frontend - Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Environment for hot reload in Docker/WSL
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# Start development server
CMD ["npm", "start"]
