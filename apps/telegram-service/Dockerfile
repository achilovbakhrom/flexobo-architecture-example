# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
COPY package.json yarn.lock ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN yarn install --frozen-lockfile

# Build stage
FROM dependencies AS build
COPY . .

# Generate Prisma client for telegram-service
RUN npx prisma generate --schema=apps/telegram-service/prisma/schema.prisma

# Build the application with NX (dependencies are built automatically)
RUN npx nx build telegram-service --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/telegram-service ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Copy Prisma client to expected path and link node_modules for Prisma runtime dependencies
RUN mkdir -p /apps/telegram-service/node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/apps/telegram-service/node_modules/.prisma /apps/telegram-service/node_modules/.prisma
RUN ln -s /app/node_modules/@prisma /apps/telegram-service/node_modules/@prisma

# Copy internal libraries
COPY --from=build --chown=nodejs:nodejs /app/dist/libs/shared-kernel ./node_modules/@flexobo/shared-kernel
COPY --from=build --chown=nodejs:nodejs /app/dist/libs/core ./node_modules/@flexobo/core

# Copy proto files (required for gRPC)
COPY --from=build --chown=nodejs:nodejs /app/libs/shared-kernel/src/lib/grpc/proto /app/libs/shared-kernel/src/lib/grpc/proto

USER nodejs

EXPOSE 3012

CMD ["node", "src/main.js"]
