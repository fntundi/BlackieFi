FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/gateway-app/package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY services/gateway-app/tsconfig.json ./
COPY services/gateway-app/src ./src

# Build TypeScript
RUN npm run build

EXPOSE 8000

CMD ["node", "dist/index.js"]
