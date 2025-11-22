# Hot Module Reload (HMR) / Watch Mode Guide

## Overview

This setup provides **true hot reload** for your microservices. When you edit any file:
- TypeScript is automatically recompiled (incremental, fast)
- The service automatically restarts
- No manual `yarn build` needed

## Architecture

```
┌─────────────────┐
│  tsc --watch    │ ← Watches source files, recompiles incrementally
│  (libs + app)   │
└────────┬────────┘
         │ writes to
         ↓
┌─────────────────┐
│   dist/         │ ← Compiled JavaScript
└────────┬────────┘
         │ watched by
         ↓
┌─────────────────┐
│    nodemon      │ ← Detects changes, restarts Node.js
└────────┬────────┘
         │ runs
         ↓
┌─────────────────┐
│  NestJS App     │ ← Your running service
└─────────────────┘
```

## Quick Start

### 1. Start Infrastructure
```bash
yarn infra:up
```
This starts PostgreSQL, Redis, and RabbitMQ in Docker.

### 2. Initial Build
```bash
yarn build:all
```
Build everything once (required for first run).

### 3. Start Service in Watch Mode

**Order Service:**
```bash
yarn dev:order:watch
```

**API Gateway:**
```bash
yarn dev:gateway:watch
```

**Admin Panel:**
```bash
yarn dev:admin:watch
```

## What Happens?

When you run `yarn dev:order:watch`, it starts **3 parallel processes**:

1. **`yarn watch:libs`** - Watches `libs/core` and `libs/shared-kernel`
2. **`yarn watch:order`** - Watches `apps/order-service`
3. **`yarn start:order`** - Runs nodemon to execute the app

### Process Output

You'll see output like:
```
[0] 9:55:57 PM - Starting compilation in watch mode...
[1] 9:55:59 PM - Found 0 errors. Watching for file changes.
[2] [nodemon] starting `node dist/apps/order-service/src/main.js`
[2] [Nest] 12345  - 11/22/2025, 9:56:00 PM     LOG [NestFactory] Starting Nest application...
[2] [Nest] 12345  - 11/22/2025, 9:56:01 PM     LOG [NestApplication] Nest application successfully started
```

The `[0]`, `[1]`, `[2]` prefixes indicate which process the output is from.

## Testing Hot Reload

1. **Start the service:**
   ```bash
   yarn dev:order:watch
   ```

2. **Edit a file:** For example, open `apps/order-service/src/application/commands/order.handlers.ts`

3. **Make a change:**
   ```typescript
   // Add a console.log in any handler
   async execute(command: CreateOrderCommand): Promise<Result<void, Error>> {
     console.log('🔥 HOT RELOAD WORKING! Creating order:', command.orderId);
     try {
       // ... rest of code
   ```

4. **Save the file** (Cmd+S)

5. **Watch the terminal:**
   ```
   [1] 9:57:23 PM - File change detected. Starting incremental compilation...
   [1] 9:57:24 PM - Found 0 errors. Watching for file changes.
   [2] [nodemon] restarting due to changes...
   [2] [nodemon] starting `node dist/apps/order-service/src/main.js`
   [2] [Nest] 12346  - 11/22/2025, 9:57:25 PM     LOG [NestFactory] Starting Nest application...
   ```

Your service is now running with the new code! 🎉

## Configuration Files

### `nodemon.json`
```json
{
  "restartable": "rs",
  "ignore": [".git", "node_modules"],
  "watch": ["dist/"],
  "ext": "js",
  "delay": 1000
}
```

**Key settings:**
- `watch: ["dist/"]` - Only watch the compiled output
- `delay: 1000` - Wait 1 second before restarting (prevents restart loops during multi-file changes)
- `ext: "js"` - Only restart on .js file changes (compiled output)

### TypeScript Watch Mode

The `--watch` flag on `tsc` enables incremental compilation:
- Only recompiles changed files
- Fast (milliseconds for single file)
- Preserves type checking

## Scripts Explained

### Individual Scripts

```json
{
  "watch:libs": "tsc --build libs/core/tsconfig.lib.json libs/shared-kernel/tsconfig.lib.json --watch",
  "watch:order": "tsc --build apps/order-service/tsconfig.app.json --watch",
  "watch:gateway": "tsc --build apps/api-gateway/tsconfig.app.json --watch",
  "watch:admin": "tsc --build apps/admin-panel/tsconfig.app.json --watch",
  
  "start:order": "nodemon --watch dist/apps/order-service --watch dist/libs dist/apps/order-service/src/main.js",
  "start:gateway": "nodemon --watch dist/apps/api-gateway --watch dist/libs dist/apps/api-gateway/src/main.js",
  "start:admin": "nodemon --watch dist/apps/admin-panel --watch dist/libs dist/apps/admin-panel/src/main.js"
}
```

### Combined Scripts (With HMR)

```json
{
  "dev:order:watch": "concurrently \"yarn watch:libs\" \"yarn watch:order\" \"yarn start:order\"",
  "dev:gateway:watch": "concurrently \"yarn watch:libs\" \"yarn watch:gateway\" \"yarn start:gateway\"",
  "dev:admin:watch": "concurrently \"yarn watch:libs\" \"yarn watch:admin\" \"yarn start:admin\""
}
```

## Troubleshooting

### Service Won't Start

**Check infrastructure is running:**
```bash
docker ps
```

You should see:
- `flexobo-postgres-dev`
- `flexobo-redis-dev`
- `flexobo-rabbitmq-dev`

If not running:
```bash
yarn infra:up
```

### "Cannot find module @flexobo/core"

Run the postinstall script manually:
```bash
yarn postinstall
```

This creates symlinks:
```
node_modules/@flexobo/core → dist/libs/core
node_modules/@flexobo/shared-kernel → dist/libs/shared-kernel
```

### Service Restarts in a Loop

Increase the delay in `nodemon.json`:
```json
{
  "delay": 2000
}
```

### TypeScript Errors on Save

The watch mode will show compilation errors immediately:
```
[1] 9:58:10 PM - File change detected. Starting incremental compilation...
[1] apps/order-service/src/application/commands/order.handlers.ts:45:15
[1]   - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
[1] 9:58:11 PM - Found 1 error. Watching for file changes.
```

Fix the error and save again. The service won't restart until compilation succeeds.

### Want to Restart Manually

Type `rs` and press Enter in the terminal where nodemon is running:
```bash
rs
```

## Performance Tips

### First Compilation is Slow
The initial `tsc --watch` takes 5-10 seconds because it compiles everything. Subsequent changes are **instant** (incremental).

### Parallel Compilation
The libs and app are compiled in parallel:
- `watch:libs` compiles core + shared-kernel
- `watch:order` compiles order-service
- Changes to either trigger recompilation + restart

### Nx Cache Still Works
Even in watch mode, Nx caching works for the initial build:
```bash
yarn build:all  # Fast if nothing changed
```

## Comparison: Before vs After

### Before (Manual)
1. Edit file
2. Run `yarn build:all` (10+ seconds)
3. Run `yarn dev:order` 
4. Test
5. Edit file
6. Go back to step 2 😫

### After (Watch Mode)
1. Run `yarn dev:order:watch` once
2. Edit file
3. Save (Cmd+S)
4. Service automatically restarts (2 seconds)
5. Test
6. Go back to step 2 🎉

## Advanced Usage

### Running Multiple Services

Open 3 terminals:

**Terminal 1:**
```bash
yarn dev:order:watch
```

**Terminal 2:**
```bash
yarn dev:gateway:watch
```

**Terminal 3:**
```bash
yarn dev:admin:watch
```

Now all 3 services have hot reload!

### Watching Specific Files

Nodemon watches by file patterns. To customize:

```json
{
  "watch": [
    "dist/apps/order-service/**/*.js",
    "dist/libs/core/**/*.js",
    "dist/libs/shared-kernel/**/*.js"
  ],
  "ignore": [
    "dist/**/*.spec.js",
    "dist/**/*.test.js"
  ]
}
```

### Docker Integration

If you want to run services in Docker with hot reload:

1. Mount the workspace as a volume
2. Run watch mode inside the container
3. Use nodemon with Docker

Example `docker-compose.dev.yml`:
```yaml
order-service:
  build: ./apps/order-service
  volumes:
    - ./:/app
    - /app/node_modules
  command: yarn dev:order:watch
```

## Summary

✅ **True hot reload** - Edit → Save → Auto-restart (2 seconds)
✅ **Incremental compilation** - Only changed files recompile
✅ **Type checking** - Errors shown immediately
✅ **No bundling overhead** - Pure TypeScript compilation
✅ **Nx caching** - Still works for full builds
✅ **Multiple services** - Run all 3 with hot reload simultaneously

**Start developing:**
```bash
# Start infrastructure
yarn infra:up

# Build once
yarn build:all

# Start with hot reload
yarn dev:order:watch
```

**Edit any file → Save → Service restarts automatically! 🚀**
