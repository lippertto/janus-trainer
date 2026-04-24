import { spawn, type ChildProcess } from 'child_process';
import superagent from 'superagent';
import { SERVER } from './apiTestUtils';

let serverProcess: ChildProcess | null = null;

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

export async function setup() {
  console.log('Starting Next.js server for API tests...');

  // Start the Next.js dev server
  serverProcess = spawn('yarn', ['start:dev'], {
    env: {
      ...process.env,
      DISABLE_JWT_CHECKS: '1',
      NODE_ENV: 'development',
    },
    stdio: 'pipe', // Capture output
  });

  // Log server output for debugging
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

  // Wait for server to be ready
  await waitForServer(`${SERVER}/api/health`);
}

export async function teardown() {
  console.log('Stopping Next.js server...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}
