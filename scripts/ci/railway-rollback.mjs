/**
 * Roll Railway services back to their previous successful deployment.
 *
 * This exists because rollback during an incident should be one action with a
 * known blast radius, not eleven dashboard tabs. It is deliberately NOT wired
 * into the deploy pipeline: rolling back a subset of services leaves mixed
 * revisions talking over TCP RPC, which is its own outage, so a human decides
 * scope. See docs/RUNBOOK.md §4.
 *
 * Defaults to a dry run. Nothing is mutated unless APPLY=1.
 *
 * Usage:
 *   RAILWAY_TOKEN=... node scripts/ci/railway-rollback.mjs all
 *   RAILWAY_TOKEN=... APPLY=1 node scripts/ci/railway-rollback.mjs "Auth Service"
 *
 * Environment:
 *   RAILWAY_TOKEN   (required) Railway project token, same secret the deploy uses.
 *   APPLY           Set to 1 to actually roll back. Anything else is a dry run.
 *   GITHUB_STEP_SUMMARY  When set, the plan/result table is appended to it.
 */

const ENDPOINT = process.env.RAILWAY_API_URL || 'https://backboard.railway.com/graphql/v2';

// Rollback order mirrors deploy order: internal services first, the public
// gateway last, so the front door is the last thing to change in either
// direction. "all" covers the RPC-coupled application services only —
// monitoring components are independent and are rolled back by name.
const API_SERVICES = [
  'Auth Service',
  'User Service',
  'Resume Builder Service',
  'Chat Service',
  'Job Service',
  'Notification Service',
  'API Gateway',
];

const MONITORING_SERVICES = ['alertmanager', 'blackbox-exporter', 'prometheus', 'grafana'];

const token = process.env.RAILWAY_TOKEN?.trim();
if (!token) {
  throw new Error('RAILWAY_TOKEN is required.');
}

const requested = process.argv[2];
if (!requested) {
  throw new Error(
    `Usage: node scripts/ci/railway-rollback.mjs <service|all>\n` +
      `Known services: all, ${[...API_SERVICES, ...MONITORING_SERVICES].join(', ')}`,
  );
}

const apply = process.env.APPLY === '1';

async function graphql(query, variables = {}) {
  let lastError = 'no attempt made';

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Project tokens authenticate with this header; account/team tokens
          // use Authorization. Sending both lets one secret work either way.
          'project-access-token': token,
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Railway rejected the token (HTTP ${response.status}). Confirm RAILWAY_TOKEN ` +
          'is the project token for the production environment.',
      );
    }

    if (!response.ok) {
      lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`;
      if (response.status < 500 && response.status !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      continue;
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`Railway API error: ${payload.errors.map((e) => e.message).join('; ')}`);
    }
    return payload.data;
  }

  throw new Error(`Railway API request failed: ${lastError}`);
}

// A project token already carries its project and environment; resolving them
// this way means no extra secrets and no chance of pointing at the wrong
// environment by hand.
const context = await graphql(`query { projectToken { projectId environmentId } }`);
const projectId = context?.projectToken?.projectId;
const environmentId = context?.projectToken?.environmentId;

if (!projectId || !environmentId) {
  throw new Error(
    'Could not resolve the project/environment from RAILWAY_TOKEN. This script ' +
      'requires a project-scoped token (the same one the deploy workflow uses).',
  );
}

const project = await graphql(
  `query ($id: String!) {
    project(id: $id) {
      name
      services { edges { node { id name } } }
    }
  }`,
  { id: projectId },
);

const services = (project?.project?.services?.edges ?? []).map((edge) => edge.node);
console.log(`Project: ${project?.project?.name} (environment ${environmentId})`);

const targetNames =
  requested === 'all' ? API_SERVICES : [requested];

const resolved = targetNames.map((name) => {
  const match = services.find((service) => service.name === name);
  if (!match) {
    throw new Error(
      `Service "${name}" does not exist in this Railway project. ` +
        `Available: ${services.map((s) => s.name).join(', ')}`,
    );
  }
  return match;
});

/** The deployment currently serving traffic, and the one before it. */
async function previousSuccessfulDeployment(serviceId) {
  const data = await graphql(
    `query ($first: Int!, $input: DeploymentListInput!) {
      deployments(first: $first, input: $input) {
        edges { node { id status createdAt meta } }
      }
    }`,
    { first: 20, input: { projectId, environmentId, serviceId } },
  );

  const deployments = (data?.deployments?.edges ?? []).map((edge) => edge.node);
  // Railway returns newest first. The current revision is the newest SUCCESS;
  // the rollback target is the next SUCCESS below it. Anything CRASHED,
  // FAILED, or REMOVED is not a place to roll back to.
  const healthy = deployments.filter((deployment) => deployment.status === 'SUCCESS');
  return { current: healthy[0], target: healthy[1], considered: deployments.length };
}

const plan = [];
for (const service of resolved) {
  const { current, target, considered } = await previousSuccessfulDeployment(service.id);
  plan.push({ service, current, target, considered });
}

const rows = plan.map(({ service, current, target }) => ({
  Service: service.name,
  Current: current ? `${current.id.slice(0, 12)} (${current.createdAt})` : 'none',
  'Roll back to': target ? `${target.id.slice(0, 12)} (${target.createdAt})` : '⚠️ no earlier success',
}));
console.table(rows);

const unrollable = plan.filter(({ target }) => !target);
if (unrollable.length > 0) {
  throw new Error(
    `No earlier successful deployment for: ${unrollable
      .map(({ service }) => service.name)
      .join(', ')}. Roll these back from the Railway dashboard instead.`,
  );
}

if (!apply) {
  console.log('\nDRY RUN — nothing was changed. Re-run with APPLY=1 to roll back.');
  process.exit(0);
}

const results = [];
for (const { service, target } of plan) {
  try {
    await graphql(`mutation ($id: String!) { deploymentRollback(id: $id) }`, { id: target.id });
    console.log(`Rolled back ${service.name} -> ${target.id}`);
    results.push({ Service: service.name, Result: `rolled back to ${target.id.slice(0, 12)}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILED to roll back ${service.name}: ${message}`);
    results.push({ Service: service.name, Result: `FAILED — ${message}` });
    // Keep going. Stopping here would leave the most mixed possible state.
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  const table = [
    '### Railway rollback',
    '',
    '| Service | Result |',
    '| --- | --- |',
    ...results.map((row) => `| ${row.Service} | ${row.Result} |`),
    '',
    'Verify with `/health/ready` on the gateway before standing down.',
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
}

const failures = results.filter((row) => row.Result.startsWith('FAILED'));
if (failures.length > 0) {
  throw new Error(`${failures.length} service(s) did not roll back. Finish them in the Railway dashboard.`);
}

console.log('\nRollback complete. Verify /health/ready before standing down.');
