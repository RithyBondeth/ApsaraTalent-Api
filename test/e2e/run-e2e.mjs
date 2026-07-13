import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const composeFile = join(here, 'docker-compose.e2e.yml');
const envFile = join(here, 'e2e.env');
const projectName = 'apsara-talent-e2e';
const children = [];
let runtimeDir;

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function assertIsolated(env) {
  const database = new URL(env.DATABASE_URL);
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  if (!localHosts.has(database.hostname) || database.port !== '15432') {
    throw new Error(
      'Refusing e2e run: DATABASE_URL is not isolated localhost:15432',
    );
  }
  if (
    !localHosts.has(env.REDIS_CACHING_HOST) ||
    env.REDIS_CACHING_PORT !== '16379' ||
    !localHosts.has(env.REDIS_WEBSOCKET_HOST) ||
    env.REDIS_WEBSOCKET_PORT !== '16379'
  ) {
    throw new Error('Refusing e2e run: Redis is not isolated localhost:16379');
  }
  if (env.NODE_ENV !== 'test' || env.DISABLE_EXTERNAL_INTEGRATIONS !== 'true') {
    throw new Error('Refusing e2e run: test isolation flags are missing');
  }
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function waitForPort(port, child, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      child?.off('exit', onExit);
      callback();
    };
    const onExit = (code) =>
      finish(() =>
        reject(
          new Error(
            `Service exited with ${code} before localhost:${port} was ready; log: ${child.logPath}`,
          ),
        ),
      );
    child?.once('exit', onExit);
    const tryConnect = () => {
      if (settled) return;
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        finish(resolvePromise);
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          finish(() =>
            reject(new Error(`Timed out waiting for localhost:${port}`)),
          );
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    };
    tryConnect();
  });
}

async function waitForReady(url, child, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 'not reachable';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `API gateway exited with ${child.exitCode} before readiness; log: ${child.logPath}`,
      );
    }
    try {
      const response = await fetch(url);
      lastStatus = `${response.status} ${await response.text()}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastStatus}`);
}

function startService(name, env, synchronize = false) {
  const logPath = join(runtimeDir, `${name}.log`);
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(
    process.execPath,
    [join(root, 'dist/apps', name, 'main.js')],
    {
      cwd: runtimeDir,
      env: {
        ...process.env,
        ...env,
        DATABASE_SYNCHRONIZE: synchronize ? 'true' : 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.logPath = logPath;
  children.push(child);
  child.once('exit', (code) => {
    if (code && !child.stopping) {
      process.stderr.write(`${name} exited with ${code}; log: ${logPath}\n`);
    }
  });
  return child;
}

async function stopChildren() {
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolvePromise) => {
          if (child.exitCode !== null) return resolvePromise();
          child.stopping = true;
          child.once('exit', resolvePromise);
          child.kill('SIGTERM');
          setTimeout(() => {
            if (child.exitCode === null) child.kill('SIGKILL');
          }, 5000).unref();
        }),
    ),
  );
}

async function printLogs() {
  for (const child of children) {
    try {
      const content = await readFile(child.logPath, 'utf8');
      process.stderr.write(
        `\n--- ${child.logPath} ---\n${content.slice(-6000)}\n`,
      );
    } catch {}
  }
}

async function cleanup() {
  await stopChildren();
  if (process.env.E2E_KEEP_INFRA !== '1') {
    await run(
      'docker',
      [
        'compose',
        '-f',
        composeFile,
        '-p',
        projectName,
        'down',
        '-v',
        '--remove-orphans',
      ],
      { stdio: 'ignore' },
    ).catch(() => {});
  }
  if (runtimeDir) await rm(runtimeDir, { recursive: true, force: true });
}

let exitCode = 0;
try {
  const env = parseEnv(await readFile(envFile, 'utf8'));
  assertIsolated(env);
  runtimeDir = await mkdtemp(join(tmpdir(), 'apsara-e2e-'));

  await run('docker', [
    'compose',
    '-f',
    composeFile,
    '-p',
    projectName,
    'up',
    '-d',
    '--wait',
  ]);

  if (process.env.E2E_SKIP_BUILD !== '1') {
    const services = [
      'api-gateway',
      'auth-service',
      'user-service',
      'resume-builder-service',
      'chat-service',
      'job-service',
      'payment-service',
      'notification-service',
    ];
    for (const service of services) {
      await run('npx', ['nest', 'build', service]);
    }
  }

  const userService = startService('user-service', env, true);
  await waitForPort(Number(env.USER_SERVICE_METRICS_PORT), userService);

  const workers = [
    ['auth-service', env.AUTH_SERVICE_METRICS_PORT],
    ['resume-builder-service', env.RESUME_SERVICE_METRICS_PORT],
    ['chat-service', env.CHAT_SERVICE_METRICS_PORT],
    ['notification-service', env.NOTIFICATION_SERVICE_METRICS_PORT],
    ['job-service', env.JOB_SERVICE_METRICS_PORT],
    ['payment-service', env.PAYMENT_SERVICE_METRICS_PORT],
  ];
  for (const [service, metricsPort] of workers) {
    const child = startService(service, env, false);
    await waitForPort(Number(metricsPort), child);
  }

  const apiGateway = startService('api-gateway', env, false);
  await waitForReady('http://127.0.0.1:13000/health/ready', apiGateway);

  await run(
    process.execPath,
    [
      join(root, 'node_modules/jest/bin/jest.js'),
      '--config',
      join(here, 'jest-e2e.json'),
      '--runInBand',
    ],
    {
      env: {
        ...process.env,
        ...env,
        E2E_BASE_URL: 'http://127.0.0.1:13000',
      },
    },
  );
} catch (error) {
  exitCode = 1;
  process.stderr.write(
    `\nE2E run failed: ${error instanceof Error ? error.stack : error}\n`,
  );
  await printLogs();
} finally {
  await cleanup();
}

process.exitCode = exitCode;
