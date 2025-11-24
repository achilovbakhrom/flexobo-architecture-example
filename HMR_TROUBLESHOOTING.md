# HMR (Hot Module Reload) Troubleshooting Guide

## Problem

When running services with `npm run dev` or `npx nx serve`, the first start works fine, but when you change code:
- ❌ HMR tries to reload
- ❌ Port 3001 (or 3000, 3002) is already in use
- ❌ Service fails to restart

## Root Cause

The old Node.js process doesn't terminate properly before NX tries to start a new one, causing port conflicts.

## Solution

We've implemented **graceful shutdown** to fix this issue.

## What Was Fixed

### 1. Shared Graceful Shutdown Utility ✅

**File:** [libs/core/src/lib/bootstrap/graceful-shutdown.ts](libs/core/src/lib/bootstrap/graceful-shutdown.ts)

We created a reusable utility following DRY principles that all services can use:

```typescript
import { enableGracefulShutdown } from '@flexobo/core';

// In any service's main.ts
await app.listen(port);

enableGracefulShutdown(app, {
  serviceName: 'API Gateway',
  timeout: 5000,
});
```

**What it does:**
- `app.enableShutdownHooks()` - Tells NestJS to listen for shutdown signals
- `app.close()` - Properly closes HTTP server, releases port
- Signal handlers - Catch SIGTERM/SIGINT/uncaught exceptions
- Timeout protection - Force exit if shutdown takes too long
- Before/after hooks - Optional callbacks for custom cleanup

**Applied to all services:**
- API Gateway ([main.ts:88-91](apps/api-gateway/src/main.ts#L88-L91))
- Order Service ([main.ts:65-68](apps/order-service/src/main.ts#L65-L68))
- Admin Panel ([main.ts:63-66](apps/admin-panel/src/main.ts#L63-L66))

### 2. Debounce Delay in project.json ✅

**Applied to all services:**
- API Gateway ([project.json:35](apps/api-gateway/project.json#L35))
- Order Service ([project.json:35](apps/order-service/project.json#L35))
- Admin Panel ([project.json:35](apps/admin-panel/project.json#L35))

```json
{
  "serve": {
    "options": {
      "debounce": 500,  // ← Wait 500ms before restarting
      "runtimeArgs": ["--enable-source-maps"]
    }
  }
}
```

**What it does:**
- Prevents rapid restarts when saving multiple files
- Gives old process time to shut down
- Reduces "EADDRINUSE" errors

### 3. Cleanup Scripts ✅

**Added to package.json:**

```bash
npm run dev:clean     # Quick cleanup
npm run dev:kill      # Detailed cleanup with logs
npm run dev:restart   # Clean + restart
```

## How to Use

### Normal Development

```bash
npm run dev
```

**Now works correctly:**
1. Save a file → TypeScript recompiles
2. NX sends SIGTERM to old process
3. Graceful shutdown closes port properly
4. New process starts on clean port ✅

### If Port Is Still Stuck

**Quick fix:**
```bash
npm run dev:restart
```

**Or detailed cleanup:**
```bash
npm run dev:kill
npm run dev
```

**Or manual cleanup:**
```bash
# Kill specific port
lsof -ti:3001 | xargs kill -9

# Kill all dev servers
pkill -f 'nx serve'
```

## Understanding the Logs

### Successful HMR Reload

```
🛑 Received SIGTERM, closing application...
✅ Application closed successfully
[TypeScript compilation started...]
🚪 API Gateway: http://localhost:3001
```

### Failed Reload (Before Fix)

```
[NestApplication] Error: listen EADDRINUSE: address already in use :::3001
```

## Common Issues & Solutions

### Issue 1: Port Still in Use After Graceful Shutdown

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Option 1: Use cleanup script
npm run dev:kill

# Option 2: Manual kill
lsof -ti:3001 | xargs kill -9
```

**Prevention:**
- Graceful shutdown should prevent this (now implemented ✅)
- Check for zombie processes: `ps aux | grep node`

### Issue 2: Too Many Rapid Restarts

**Symptoms:**
- Service restarting multiple times per second
- CPU usage spikes
- Build never completes

**Solution:**
- Debounce delay prevents this (now set to 500ms ✅)
- If still happening, increase debounce in project.json:
  ```json
  "debounce": 1000  // 1 second
  ```

### Issue 3: Debugger Port Conflict

**Symptoms:**
```
Starting inspector on localhost:9231 failed: address already in use
```

**Solution:**
```bash
# Kill debugger processes
lsof -ti:9229,9230,9231 | xargs kill -9

# Or use cleanup script
npm run dev:kill
```

### Issue 4: Changes Not Reflecting

**Symptoms:**
- Save file but no reload
- Old code still running

**Solution 1: Check watch mode**
```json
// project.json
{
  "serve": {
    "options": {
      "watch": true  // ← Must be true
    }
  }
}
```

**Solution 2: Clear NX cache**
```bash
npx nx reset
npm run dev
```

**Solution 3: Full restart**
```bash
npm run dev:restart
```

## How Graceful Shutdown Works

### Without Graceful Shutdown ❌

```
1. Save file
2. NX tries to kill process (SIGKILL)
3. Process terminates immediately
4. Port not released yet (async cleanup incomplete)
5. New process tries to start
6. Error: EADDRINUSE ❌
```

### With Graceful Shutdown ✅

```
1. Save file
2. NX sends SIGTERM
3. Signal handler caught → gracefulShutdown()
4. app.close() → Closes HTTP server properly
5. Port released ✅
6. process.exit(0)
7. New process starts on clean port ✅
```

## Best Practices

### ✅ DO:

1. **Use `npm run dev:restart`** when in doubt
2. **Check logs** for "Application closed successfully"
3. **Wait for compilation** before making next change
4. **Use debounce** to prevent rapid restarts

### ❌ DON'T:

1. **Don't kill processes manually** (unless cleanup scripts fail)
2. **Don't save multiple files rapidly** (wait for first reload)
3. **Don't run multiple `npm run dev`** instances
4. **Don't ignore "port in use" errors** (they indicate stuck process)

## Testing the Fix

### Before This Fix

```bash
# Start dev server
npm run dev

# Make a change and save
# Result: Error: EADDRINUSE ❌
```

### After This Fix

```bash
# Start dev server
npm run dev

# Make a change and save
# Result:
# 🛑 Received SIGTERM, closing application...
# ✅ Application closed successfully
# 🚪 API Gateway: http://localhost:3001
# ✅ Works!
```

## DRY Implementation ✅

The graceful shutdown has been implemented as a **shared utility** in `@flexobo/core` following DRY principles.

### How to Use in Any Service

```typescript
import { enableGracefulShutdown } from '@flexobo/core';

async function bootstrap() {
  const app = await NestFactory.create(YourModule);
  await app.listen(port);

  // Enable graceful shutdown with custom options
  enableGracefulShutdown(app, {
    serviceName: 'Your Service',
    timeout: 5000,
    beforeShutdown: async () => {
      // Optional: custom cleanup before shutdown
    },
    afterShutdown: async () => {
      // Optional: custom cleanup after shutdown
    },
  });
}
```

### Already Applied To

✅ **All services now use the shared utility:**
- API Gateway
- Order Service
- Admin Panel

No code duplication - all services use the same battle-tested graceful shutdown logic!

## Monitoring & Debugging

### Check What's Using Ports

```bash
# Check all dev ports
lsof -i:3000,3001,3002

# Check specific port
lsof -i:3001

# Check debugger ports
lsof -i:9229,9230,9231
```

### Find Zombie Processes

```bash
# All Node processes
ps aux | grep node

# NX serve processes
ps aux | grep 'nx serve'

# Processes from dist/
ps aux | grep 'node dist'
```

### Kill Specific Process

```bash
# By PID
kill -9 <PID>

# By port
lsof -ti:3001 | xargs kill -9

# All nx processes
pkill -f 'nx serve'
```

## Environment Variables (If Needed)

If you need more control over shutdown:

```bash
# .env
GRACEFUL_SHUTDOWN_TIMEOUT=5000  # 5 seconds
```

```typescript
// main.ts
const shutdownTimeout = parseInt(
  process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '5000',
  10
);

setTimeout(() => {
  Logger.error('❌ Shutdown timeout, forcing exit');
  process.exit(1);
}, shutdownTimeout);
```

## Summary

✅ **Graceful shutdown** implemented in main.ts
✅ **Debounce delay** (500ms) prevents rapid restarts
✅ **Cleanup scripts** available (`dev:kill`, `dev:restart`)
✅ **Signal handlers** catch SIGTERM/SIGINT
✅ **Port properly released** before restart

**HMR should now work smoothly!** 🎉

If you still experience issues:
1. Run `npm run dev:kill`
2. Check for zombie processes: `ps aux | grep node`
3. Clear NX cache: `npx nx reset`
4. Restart: `npm run dev`
