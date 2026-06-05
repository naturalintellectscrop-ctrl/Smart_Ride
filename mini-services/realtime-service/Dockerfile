# Smart Ride Realtime Service - Fly.io Dockerfile
# Node.js runtime for Fly.io compatibility

FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY index.ts ./

# Expose ports
# 3001 = Socket.io server (client connections)
# 3002 = Internal HTTP API (server-to-server)
EXPOSE 3001 3002

# Set environment variables with defaults
ENV NODE_ENV=production
ENV SOCKET_PORT=3001
ENV API_PORT=3002

# Start the service using tsx (TypeScript runner)
CMD ["npx", "tsx", "index.ts"]
