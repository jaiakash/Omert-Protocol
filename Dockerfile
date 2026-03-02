# --- STAGE 1: Build Client ---
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- STAGE 2: Build Server ---
FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server source
COPY server/ ./server/

# Copy built frontend from Stage 1 to the location the server expects
COPY --from=client-build /app/client/dist ./client/dist

# Expose the unified port
EXPOSE 3001

# Start the application
WORKDIR /app/server
CMD ["node", "server.js"]
