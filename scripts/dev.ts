/**
 * Development Runner Script
 *
 * Usage:
 *   npx tsx scripts/dev.ts gateway  # Run api-gateway
 *   npx tsx scripts/dev.ts users    # Run users-service
 *   npx tsx scripts/dev.ts chat     # Run chat-service
 *   npx tsx scripts/dev.ts file     # Run file-service
 *   npx tsx scripts/dev.ts main     # Run main-service
 *   npx tsx scripts/dev.ts all      # Run all services
 *   npx tsx scripts/dev.ts stop     # Stop all services and containers
 */

import { execSync, spawn, ChildProcess } from 'child_process';

type ServiceName = 'gateway' | 'users' | 'chat' | 'file' | 'main';

interface ServiceConfig {
  name: string;
  nxProject: string;
  dockerCompose: string;
  color: string;
}

const SERVICES: Record<ServiceName, ServiceConfig> = {
  gateway: {
    name: 'api-gateway',
    nxProject: 'api-gateway',
    dockerCompose: 'apps/api-gateway/docker-compose.yml',
    color: '\x1b[33m', // yellow
  },
  users: {
    name: 'users-service',
    nxProject: 'users-service',
    dockerCompose: 'apps/users-service/docker-compose.yml',
    color: '\x1b[32m', // green
  },
  chat: {
    name: 'chat-service',
    nxProject: 'chat-service',
    dockerCompose: 'apps/chat-service/docker-compose.yml',
    color: '\x1b[34m', // blue
  },
  file: {
    name: 'file-service',
    nxProject: 'file-service',
    dockerCompose: 'apps/file-service/docker-compose.yml',
    color: '\x1b[91m', // light red
  },
  main: {
    name: 'main-service',
    nxProject: 'main-service',
    dockerCompose: 'apps/main-service/docker-compose.yml',
    color: '\x1b[36m', // cyan
  },
};

const INFRA_COMPOSE = 'infrastructure/docker-compose.yml';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

function log(message: string, color = RESET) {
  console.log(`${color}[dev]${RESET} ${message}`);
}

function exec(cmd: string, silent = false): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch {
    return '';
  }
}

function isDockerRunning(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function isComposeUp(composeFile: string): boolean {
  try {
    const result = execSync(
      `docker-compose -f ${composeFile} ps --services --filter "status=running"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function startCompose(composeFile: string, name: string): void {
  if (isComposeUp(composeFile)) {
    log(`${name} containers already running`, GREEN);
  } else {
    log(`Starting ${name} containers...`);
    exec(`docker-compose -f ${composeFile} up -d`);
    log(`${name} containers started`, GREEN);
  }
}

function stopCompose(composeFile: string, name: string): void {
  if (isComposeUp(composeFile)) {
    log(`Stopping ${name} containers...`, YELLOW);
    exec(`docker-compose -f ${composeFile} down`);
    log(`${name} containers stopped`, GREEN);
  }
}

function runService(service: ServiceConfig): ChildProcess {
  log(`Starting ${service.name}...`, service.color);

  const child = spawn('npx', ['nx', 'serve', service.nxProject], {
    stdio: 'inherit',
    shell: true,
  });

  return child;
}

function runMultipleServices(services: ServiceConfig[]): void {
  const names = services.map((s) => s.nxProject).join(',');
  log(`Starting services: ${names}`, GREEN);

  spawn(
    'npx',
    [
      'nx',
      'run-many',
      '--target=serve',
      `--projects=${names}`,
      `--parallel=${services.length}`,
    ],
    {
      stdio: 'inherit',
      shell: true,
    }
  );
}

function killProcesses(): void {
  log('Killing dev processes...', YELLOW);

  // Kill nx serve processes
  exec("pkill -f 'nx serve' 2>/dev/null || true", true);

  // Kill node dist processes
  exec("pkill -f 'node dist' 2>/dev/null || true", true);

  // Kill processes on dev ports
  exec(
    'lsof -ti:3000,3001,3002,3003,3004,3005,9229,9230,9231 | xargs kill -9 2>/dev/null || true',
    true
  );

  log('Dev processes killed', GREEN);
}

function stopAll(): void {
  log('Stopping all services...', YELLOW);

  // Kill running processes
  killProcesses();

  // Stop all service containers
  for (const key of Object.keys(SERVICES) as ServiceName[]) {
    const service = SERVICES[key];
    stopCompose(service.dockerCompose, service.name);
  }

  // Stop infrastructure
  stopCompose(INFRA_COMPOSE, 'Infrastructure');

  log('All services stopped', GREEN);
}

async function main() {
  const arg = process.argv[2];

  if (!arg || !['gateway', 'users', 'chat', 'file', 'main', 'all', 'stop'].includes(arg)) {
    console.log(`
Usage: npx tsx scripts/dev.ts <command>

Commands:
  gateway  - Run api-gateway (port 3000)
  users    - Run users-service (port 3003)
  chat     - Run chat-service (port 3004)
  file     - Run file-service (port 3005)
  main     - Run main-service (port 3006)
  all      - Run all services
  stop     - Stop all services and containers
`);
    process.exit(1);
  }

  // Handle stop command
  if (arg === 'stop') {
    stopAll();
    return;
  }

  // Check Docker for start commands
  if (!isDockerRunning()) {
    log('Docker is not running. Please start Docker first.', RED);
    process.exit(1);
  }

  // Start shared infrastructure (RabbitMQ)
  log('Checking shared infrastructure...');
  startCompose(INFRA_COMPOSE, 'Infrastructure (RabbitMQ)');

  if (arg === 'all') {
    // Start all service containers
    for (const key of Object.keys(SERVICES) as ServiceName[]) {
      const service = SERVICES[key];
      startCompose(service.dockerCompose, service.name);
    }

    // Run all services
    runMultipleServices(Object.values(SERVICES));
  } else {
    const service = SERVICES[arg as ServiceName];

    // Start service-specific containers
    startCompose(service.dockerCompose, service.name);

    // Run the service
    runService(service);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\nShutting down...', RED);
  process.exit(0);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
