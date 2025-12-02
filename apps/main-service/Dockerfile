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

# Generate Prisma client for main-service
RUN npx prisma generate --schema=apps/main-service/prisma/schema.prisma

# Build the application with NX
RUN npx nx build main-service --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/main-service ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy Prisma client (custom output path)
COPY --from=build --chown=nodejs:nodejs /app/apps/main-service/node_modules/.prisma ./node_modules/.prisma

USER nodejs

EXPOSE 3000

CMD ["node", "main.js"]
