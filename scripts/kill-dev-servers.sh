#!/bin/bash

# Kill Dev Servers Script
# Use this to clean up stuck processes when HMR fails

echo "🔍 Finding processes using ports 3000, 3001, 3002..."

# Function to kill process on specific port
kill_port() {
  local port=$1
  local pids=$(lsof -ti:$port)

  if [ -z "$pids" ]; then
    echo "   Port $port: ✅ Free"
  else
    echo "   Port $port: ⚠️  In use (PIDs: $pids)"
    echo "   Killing processes..."
    kill -9 $pids 2>/dev/null
    echo "   Port $port: ✅ Freed"
  fi
}

# Kill processes on each port
kill_port 3000
kill_port 3001
kill_port 3002

# Also kill debugger ports
echo ""
echo "🔍 Finding debugger processes (ports 9229, 9230, 9231)..."
kill_port 9229
kill_port 9230
kill_port 9231

# Kill any remaining nx serve processes
echo ""
echo "🔍 Finding NX serve processes..."
pkill -f 'nx serve' 2>/dev/null && echo "   ✅ Killed nx serve processes" || echo "   No nx serve processes found"

# Kill any node processes running from dist/
echo ""
echo "🔍 Finding node processes from dist/..."
pkill -f 'node dist' 2>/dev/null && echo "   ✅ Killed node dist processes" || echo "   No node dist processes found"

echo ""
echo "✨ Cleanup complete! You can now run 'npm run dev'"
