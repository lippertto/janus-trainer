import { spawn, type ChildProcess } from 'child_process';
import { execFileSync } from 'child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import superagent from 'superagent';
import { SERVER } from './apiTestUtils';
import { getTestJwtSecret } from './test-auth';

let serverProcess: ChildProcess | null = null;
let postgresContainer: StartedPostgreSqlContainer | null = null;

// testcontainers-node does not read `docker context`; it expects DOCKER_HOST
// or the default socket. Colima puts the socket at ~/.colima/.../docker.sock,
// so we forward the active context's endpoint into DOCKER_HOST.
function ensureDockerHost() {
  if (process.env.DOCKER_HOST) return;
  try {
    const endpoint = execFileSync(
      'docker',
      ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
      { encoding: 'utf8' },
    ).trim();
    if (endpoint) {
      process.env.DOCKER_HOST = endpoint;
    }
  } catch {
    // Docker CLI not installed or no active context — let testcontainers
    // fall through to its default probe and surface its own error.
  }
}

async function waitForServer(
  url: string,
  timeoutMs: number = 30000,
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await superagent.get(url);
      console.log('✓ Server is ready');
      return;
    } catch (error) {
      // Server not ready yet, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function startPostgres(): Promise<string> {
  ensureDockerHost();
  console.log('Starting Postgres testcontainer...');
  const container = new PostgreSqlContainer('postgres:13.3-alpine')
    .withDatabase('postgres')
    .withUsername('postgres')
    .withPassword('postgres');

  // Reuse the container across local runs for faster iteration.
  // In CI (fresh runner every time) reuse buys nothing.
  const useReuse = !process.env.CI;
  const started = await (useReuse ? container.withReuse() : container).start();
  postgresContainer = started;

  const url = `postgresql://${started.getUsername()}:${started.getPassword()}@${started.getHost()}:${started.getPort()}/${started.getDatabase()}?connection_limit=1`;
  console.log(`✓ Postgres ready at ${started.getHost()}:${started.getPort()}`);
  return url;
}

function runPrisma(args: string[], env: NodeJS.ProcessEnv) {
  execFileSync('yarn', ['prisma', ...args], {
    stdio: 'inherit',
    env,
  });
}

export async function setup() {
  const connectionUrl = await startPostgres();
  process.env.POSTGRES_CONNECTION_URL = connectionUrl;

  const prismaEnv = { ...process.env, POSTGRES_CONNECTION_URL: connectionUrl };
  console.log('Running prisma migrate deploy...');
  runPrisma(['migrate', 'deploy'], prismaEnv);
  console.log('Seeding database...');
  runPrisma(['db', 'seed'], prismaEnv);

  console.log('Starting Next.js server for API tests...');
  serverProcess = spawn('yarn', ['start:dev'], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXTAUTH_SECRET: getTestJwtSecret(),
      NEXTAUTH_URL: SERVER,
      POSTGRES_CONNECTION_URL: connectionUrl,
    },
    stdio: 'pipe',
  });

  serverProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Ready') || output.includes('started server')) {
      console.log('Next.js server output:', output.trim());
    }
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error('Next.js server error:', data.toString());
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  await waitForServer(`${SERVER}/api/health`);
}

export async function teardown() {
  console.log('Stopping Next.js server...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }

  // With withReuse() testcontainers leaves the container alive so the next
  // local run starts instantly. In CI we started without reuse, so stop it.
  if (postgresContainer && process.env.CI) {
    console.log('Stopping Postgres testcontainer...');
    await postgresContainer.stop();
    postgresContainer = null;
  }
}
