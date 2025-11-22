# Base stage - common dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN npm ci --legacy-peer-deps

# Build stage
FROM dependencies AS build
COPY . .
RUN npx nx build admin-panel --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/admin-panel ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3002

CMD ["node", "main.js"]
