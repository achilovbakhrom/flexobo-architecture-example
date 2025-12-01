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

# Generate Prisma client for api-gateway
RUN npx prisma generate --schema=apps/api-gateway/prisma/schema.prisma

# Build the application with NX
RUN npx nx build api-gateway --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/api-gateway ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Copy Prisma client (custom output path)
COPY --from=build --chown=nodejs:nodejs /app/apps/api-gateway/node_modules/.prisma ./node_modules/.prisma

USER nodejs

EXPOSE 3001

CMD ["node", "main.js"]
