# ---- Base Stage ----
# Use a specific version for reproducibility. 'slim' is a good balance of size and utility.
FROM node:20-slim AS base
WORKDIR /app
# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# ---- Dependencies Stage ----
FROM base AS dependencies
# Install ONLY production dependencies
RUN npm install --production
# Generate Prisma Client based on schema
COPY prisma ./prisma
RUN npx prisma generate

# ---- Build Stage ----
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Compile TypeScript to JavaScript
RUN npm run build

# ---- Production/Runtime Stage ----
FROM node:20-slim AS runtime
WORKDIR /app

# --- Security: Create a non-root user ---
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy production artifacts from previous stages
COPY --from=build /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY package.json .

# --- Security: Ensure the database file location is owned by the app user ---
# The volume will be mounted here. We need to ensure our user can write to it.
RUN mkdir -p /app/prisma && chown -R appuser:nodejs /app/prisma

# Switch to the non-root user
USER appuser

EXPOSE 8080

ENV NODE_ENV=production
# This is the command to start the server from the compiled code
CMD [ "node", "dist/index.js" ]