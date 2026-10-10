import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const services = [
  'API Gateway',
  'Auth Service',
  'User Service',
  'Resume Builder Service',
  'Chat Service',
  'Job Service',
  'Notification Service',
];

export function validateDestination(
  variables,
  expectedProject,
  expectedOrigin,
  gateway = false,
) {
  if (
    !expectedProject ||
    variables.RAILWAY_PROJECT_ID !== expectedProject ||
    variables.RAILWAY_ENVIRONMENT_NAME !== 'production'
  ) {
    throw new Error(
      'Railway credentials must access the explicitly configured production project',
    );
  }
  const origin = new URL(expectedOrigin);
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      'PRODUCTION_API_URL must be an HTTPS origin without credentials',
    );
  }
  if (
    gateway &&
    origin.hostname.endsWith('.up.railway.app') &&
    variables.RAILWAY_PUBLIC_DOMAIN !== origin.hostname
  ) {
    throw new Error(
      'PRODUCTION_API_URL does not match the gateway Railway domain',
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.env.RAILWAY_PROJECT_ID || !process.env.RAILWAY_TOKEN) {
    throw new Error(
      'RAILWAY_PROJECT_ID and a production project RAILWAY_TOKEN are required before migrations',
    );
  }
  for (const service of services) {
    let variables;
    try {
      variables = JSON.parse(
        execFileSync('railway', ['variables', '--service', service, '--json'], {
          encoding: 'utf8',
          timeout: 30_000,
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    } catch {
      // Variable values and CLI output may contain secrets; never log either.
      throw new Error(
        `Railway token cannot read production service: ${service}`,
      );
    }
    validateDestination(
      variables,
      process.env.RAILWAY_PROJECT_ID,
      process.env.PRODUCTION_API_URL,
      service === 'API Gateway',
    );
    console.log(`Verified production destination: ${service}`);
  }
}
