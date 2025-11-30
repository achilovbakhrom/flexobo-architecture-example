# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
COPY package.json yarn.lock ./
COPY nx.json ./
COPY tsconfig.base.json ./
# Use npm with yarn.lock compatibility
RUN npm install --legacy-peer-deps

# Build stage
FROM dependencies AS build
COPY . .

# Generate Prisma client for order-service
RUN npx prisma generate --schema=apps/order-service/prisma/schema.prisma

# Build the application with NX
RUN npx nx build order-service --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/order-service ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Copy built libs (@flexobo/core and @flexobo/shared-kernel)
COPY --from=build --chown=nodejs:nodejs /app/dist/libs/core ./node_modules/@flexobo/core
COPY --from=build --chown=nodejs:nodejs /app/dist/libs/shared-kernel ./node_modules/@flexobo/shared-kernel

# Copy Prisma client to the path expected by the code (relative path resolution)
# The code navigates from dist/apps/order-service/src/ to apps/order-service/node_modules
COPY --from=build --chown=nodejs:nodejs /app/apps/order-service/node_modules/.prisma /apps/order-service/node_modules/.prisma

# Copy Prisma schema and migrations for running migrations in init container
COPY --from=build --chown=nodejs:nodejs /app/apps/order-service/prisma ./prisma

# Copy Prisma config file for migrations
COPY --from=build --chown=nodejs:nodejs /app/apps/order-service/prisma.config.ts ./prisma.config.ts

# Create symlinks for Prisma runtime dependencies (they resolve relative to Prisma client location)
RUN mkdir -p /apps/order-service/node_modules/@prisma && \
    ln -sf /app/node_modules/@prisma/client /apps/order-service/node_modules/@prisma/client && \
    ln -sf /app/node_modules/@prisma/client-runtime-utils /apps/order-service/node_modules/@prisma/client-runtime-utils && \
    ln -sf /app/node_modules/@prisma/adapter-pg /apps/order-service/node_modules/@prisma/adapter-pg && \
    ln -sf /app/node_modules/@prisma/driver-adapter-utils /apps/order-service/node_modules/@prisma/driver-adapter-utils && \
    chown -R nodejs:nodejs /apps

USER nodejs

EXPOSE 3000

CMD ["node", "src/main.js"]
