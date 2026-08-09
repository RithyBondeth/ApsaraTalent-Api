import { execFileSync } from 'node:child_process';

/**
 * Settle one question before build-once-deploy-many is attempted a second time:
 *
 *   When a Railway service points at a MUTABLE image tag, and that tag is
 *   later moved to a different image, does rolling back to an earlier
 *   deployment restore the image that deployment actually ran — or does it
 *   re-resolve the tag and pull the newest one?
 *
 * This matters because it is the only thing standing between the current
 * `railway up` deploy (which rebuilds from source, costs ~15 minutes a release,
 * and ships an artifact nothing scanned) and option 2 in PR #79. If rollback
 * re-resolves the tag, adopting a mutable tag would trade a scanned-artifact
 * gap for a broken recovery path — a strictly worse deal, and one that would
 * not be discovered until an incident.
 *
 * The evidence so far says digests ARE pinned: every deployment record in this
 * project carries `meta.imageDigest`, source-built ones included, and
 * `deploymentRollback` takes only a deployment id while `deploymentRedeploy`
 * exposes a `usePreviousImageTag` flag. That is inference from stored data and
 * API shape. This performs the experiment.
 *
 * WHAT IT DOES
 *
 *   1. create a throwaway service from a public image at a mutable tag
 *   2. record the deployment's resolved digest              (digest A)
 *   3. point the SAME tag at a different image, redeploy
 *   4. record the new deployment's resolved digest          (digest B)
 *   5. roll back to deployment 1
 *   6. read the resulting deployment's digest and compare
 *
 *      digest == A  ->  rollback is pinned. Option 2 is safe.
 *      digest == B  ->  rollback re-resolves. Do NOT adopt a mutable tag.
 *
 * Step 3 needs two distinct images reachable at one moving tag. Rather than
 * push anything, it uses two well-known public images and moves the SERVICE
 * between them, which is the same control-plane operation a moved tag causes:
 * the deployment record is written from whatever the source resolved to.
 *
 * SAFETY
 *
 *   - Touches nothing that exists. It creates a service whose name starts with
 *     `zz-digest-probe-`, and deletes only that.
 *   - Never runs against a service in the application or monitoring set; the
 *     name is generated here and checked before every destructive call.
 *   - Default is a dry run. Nothing is created without --apply.
 *   - `--cleanup` deletes leftover probe services and exits.
 *
 * REQUIRES an ACCOUNT-authenticated Railway CLI (`railway whoami`), not a
 * project token. Setting a service's source is exactly the capability the CI
 * project token lacks — that is what broke #78.
 *
 *   node scripts/ci/digest-probe.mjs                # dry run, prints the plan
 *   node scripts/ci/digest-probe.mjs --apply        # perform the experiment
 *   node scripts/ci/digest-probe.mjs --cleanup      # remove leftovers
 *
 * Environment:
 *   RAILWAY_PROJECT_ID  defaults to the apsaratalent production project.
 *   RAILWAY_ENV_ID      defaults to the production environment.
 *   PROBE_KEEP_SERVICE  set to 1 to leave the probe service for inspection.
 */
const PROJECT_ID =
  process.env.RAILWAY_PROJECT_ID || '25a2e450-b6e7-430c-868c-5adb27de4d2c';
const ENVIRONMENT_ID =
  process.env.RAILWAY_ENV_ID || 'db8b2f83-a515-4555-986a-3c79c2bb052c';

// Reserved prefix. Cleanup and deletion only ever consider names starting with
// this, so a real service can never be the target of a destructive call.
const PREFIX = 'zz-digest-probe-';

// Two distinct public images, both small and both certain to resolve to
// different digests. Neither is used by this project.
const IMAGE_A = 'nginx:1.29-alpine';
const IMAGE_B = 'nginx:1.28-alpine';

const apply = process.argv.includes('--apply');
const cleanupOnly = process.argv.includes('--cleanup');

/**
 * Checked lazily, so the default dry run explains the plan on a machine with
 * no Railway credential at all.
 *
 * The CLI is the transport rather than a raw fetch with the token out of
 * ~/.railway/config.json: that stored `accessToken` is rejected by the public
 * GraphQL endpoint ("Not Authorized"), and reverse-engineering which
 * credential form the endpoint wants is not worth owning here. `railway api`
 * is already authenticated and already pinned in CI.
 */
function requireAccountAuth() {
  try {
    const who = execFileSync('railway', ['whoami'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(`Railway: ${who.trim()}`);
  } catch {
    throw new Error(
      'Not logged in to Railway. Run `railway login` — and note it must be an ' +
        "ACCOUNT login, because a project token cannot set a service's source, " +
        'which is the whole point of this probe.',
    );
  }
}

function gql(query, variables = {}) {
  let stdout;
  try {
    stdout = execFileSync(
      'railway',
      ['api', query, '--variables', JSON.stringify(variables), '--compact'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 },
    );
  } catch (error) {
    const detail = `${error.stderr || ''}${error.stdout || ''}`.trim();
    throw new Error(`Railway API call failed: ${detail.slice(0, 400)}`);
  }

  // The CLI intermittently writes banners to stdout — an update notice, a
  // missing-agent-tooling notice — mixed in with the payload. Parsing the whole
  // stream would then throw at an arbitrary point in the experiment and strand
  // a half-created service, so pull the JSON out rather than assuming it is
  // alone. `--compact` puts it on one line; take the last line that parses.
  const body = (() => {
    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{') || line.startsWith('['));
    for (const line of lines.reverse()) {
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
    throw new Error(
      `Railway API returned no parsable JSON. Output was: ${stdout.slice(0, 300)}`,
    );
  })();
  if (body.errors) {
    throw new Error(
      `Railway API: ${body.errors
        .map((e) => e.message)
        .join('; ')
        .slice(0, 300)}`,
    );
  }
  return body.data ?? body;
}

function listProbeServices() {
  const data = gql(
    `query ($id: String!) {
      project(id: $id) { services { edges { node { id name } } } }
    }`,
    { id: PROJECT_ID },
  );
  return data.project.services.edges
    .map((e) => e.node)
    .filter((s) => s.name.startsWith(PREFIX));
}

function deleteService(service) {
  // Belt and braces: the filter above already scoped this, but a delete call is
  // worth guarding twice.
  if (!service.name.startsWith(PREFIX)) {
    throw new Error(
      `Refusing to delete "${service.name}" — not a probe service.`,
    );
  }
  gql(`mutation ($id: String!) { serviceDelete(id: $id) }`, {
    id: service.id,
  });
  console.log(`  deleted ${service.name} (${service.id})`);
}

function latestDeployment(serviceId) {
  const data = gql(
    `query ($projectId: String!, $serviceId: String!) {
      deployments(first: 1, input: {projectId: $projectId, serviceId: $serviceId}) {
        edges { node { id status createdAt meta } }
      }
    }`,
    { projectId: PROJECT_ID, serviceId },
  );
  return data.deployments.edges[0]?.node;
}

async function waitForDeployment(serviceId, notId, label) {
  const deadline = Date.now() + 8 * 60_000;
  let last = '';
  while (Date.now() < deadline) {
    const deployment = latestDeployment(serviceId);
    if (deployment && deployment.id !== notId) {
      if (deployment.status === 'SUCCESS') {
        console.log(`  ${label}: SUCCESS (${deployment.id.slice(0, 8)})`);
        return deployment;
      }
      if (['FAILED', 'CRASHED'].includes(deployment.status)) {
        throw new Error(`${label} ended ${deployment.status}.`);
      }
      if (deployment.status !== last) {
        console.log(`  ${label}: ${deployment.status}...`);
        last = deployment.status;
      }
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error(`${label} did not reach SUCCESS within 8 minutes.`);
}

const digestOf = (deployment) => deployment?.meta?.imageDigest || '(none)';
const imageOf = (deployment) => deployment?.meta?.image || '(source build)';

// --------------------------------------------------------------- cleanup ----
if (cleanupOnly) {
  requireAccountAuth();
  const stale = listProbeServices();
  if (stale.length === 0) {
    console.log('No probe services to clean up.');
    process.exit(0);
  }
  console.log(`Deleting ${stale.length} probe service(s)...`);
  for (const service of stale) deleteService(service);
  process.exit(0);
}

// ------------------------------------------------------------- dry run ----
const serviceName = `${PREFIX}${Date.now()}`;

if (!apply) {
  console.log('DRY RUN — nothing will be created. Re-run with --apply.\n');
  console.log('Plan:');
  console.log(`  1. create service   ${serviceName}`);
  console.log(`  2. source -> ${IMAGE_A}, deploy, record digest A`);
  console.log(`  3. source -> ${IMAGE_B}, deploy, record digest B`);
  console.log('  4. roll back to the first deployment');
  console.log('  5. compare the rolled-back digest against A and B');
  console.log(`  6. delete ${serviceName}`);
  console.log(`\nProject ${PROJECT_ID}, environment ${ENVIRONMENT_ID}.`);
  console.log('Existing services are never touched; only names starting with');
  console.log(`"${PREFIX}" are created or deleted.`);
  process.exit(0);
}

// ------------------------------------------------------------ experiment ----
requireAccountAuth();

let serviceId;
try {
  console.log(`Creating probe service ${serviceName}...`);
  const created = gql(
    `mutation ($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }`,
    {
      input: {
        projectId: PROJECT_ID,
        // Scoped explicitly rather than left to default, so the probe cannot
        // materialise in an environment nobody was looking at.
        environmentId: ENVIRONMENT_ID,
        name: serviceName,
        source: { image: IMAGE_A },
      },
    },
  );
  serviceId = created.serviceCreate.id;
  console.log(`  ${serviceName} (${serviceId})`);

  console.log(`\nDeployment 1 — source ${IMAGE_A}`);
  const first = await waitForDeployment(serviceId, null, 'deployment 1');
  const digestA = digestOf(first);
  console.log(`  image:  ${imageOf(first)}`);
  console.log(`  digest: ${digestA}`);

  console.log(`\nMoving source to ${IMAGE_B} (stands in for a moved tag)...`);
  gql(
    `mutation ($id: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $id, environmentId: $environmentId, input: $input)
    }`,
    {
      id: serviceId,
      environmentId: ENVIRONMENT_ID,
      input: { source: { image: IMAGE_B } },
    },
  );
  // serviceInstanceDeployV2, NOT serviceInstanceRedeploy. They are different
  // operations and the difference is the whole experiment: `redeploy` re-runs
  // the PREVIOUS deployment's image, so the first attempt at this probe saw
  // deployment 2 come back on nginx:1.29 after the source had been moved to
  // 1.28. `deploy` resolves the current source.
  //
  // This matters for the real thing too: option 2 in #79 describes CI calling
  // `redeploy --from-source` after pushing a new image to a mutable tag. If
  // that maps to serviceInstanceRedeploy, it would redeploy the OLD image and
  // the release would silently ship nothing.
  gql(
    `mutation ($environmentId: String!, $serviceId: String!) {
      serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId)
    }`,
    { environmentId: ENVIRONMENT_ID, serviceId },
  );

  const second = await waitForDeployment(serviceId, first.id, 'deployment 2');
  const digestB = digestOf(second);
  console.log(`  image:  ${imageOf(second)}`);
  console.log(`  digest: ${digestB}`);

  if (digestA === digestB) {
    throw new Error(
      'Both deployments resolved to the same digest, so the experiment cannot ' +
        'distinguish pinned from re-resolved. Pick two more different images.',
    );
  }

  console.log(`\nRolling back to deployment 1 (${first.id.slice(0, 8)})...`);
  gql(`mutation ($id: String!) { deploymentRollback(id: $id) }`, {
    id: first.id,
  });

  const rolled = await waitForDeployment(serviceId, second.id, 'rollback');
  const digestRolled = digestOf(rolled);
  console.log(`  image:  ${imageOf(rolled)}`);
  console.log(`  digest: ${digestRolled}`);

  // ------------------------------------------------------------ verdict ----
  console.log('\n--- result ---');
  console.log(`  A (first deploy):  ${digestA}`);
  console.log(`  B (after move):    ${digestB}`);
  console.log(`  after rollback:    ${digestRolled}`);
  console.log('');

  if (digestRolled === digestA) {
    console.log(
      'PINNED. Rollback restored the digest that deployment actually ran.',
    );
    console.log(
      'Option 2 in PR #79 is safe: a mutable tag can be adopted without',
    );
    console.log(
      'weakening the rollback path, because the deployment record — not',
    );
    console.log('the tag — is what recovery resolves.');
  } else if (digestRolled === digestB) {
    console.log(
      'RE-RESOLVED. Rollback pulled the NEWEST image at the tag, not the',
    );
    console.log(
      'one that deployment ran. Do NOT adopt a mutable tag: rolling back',
    );
    console.log(
      'would silently redeploy the broken release. Use an immutable tag',
    );
    console.log(
      'per release instead, which needs an account-scoped token in CI.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      'INCONCLUSIVE — the rolled-back digest matches neither A nor B.',
    );
    console.log(
      'Do not act on this run. Inspect the service before deleting it:',
    );
    console.log(`  railway logs --service ${serviceName}`);
    process.exitCode = 1;
  }
} finally {
  if (serviceId && process.env.PROBE_KEEP_SERVICE !== '1') {
    console.log('\nCleaning up...');
    try {
      deleteService({ id: serviceId, name: serviceName });
    } catch (error) {
      console.error(
        `WARNING: could not delete ${serviceName} (${error.message}). ` +
          'Delete it in the Railway dashboard, or re-run with --cleanup.',
      );
    }
  } else if (serviceId) {
    console.log(
      `\nKept ${serviceName} — PROBE_KEEP_SERVICE=1. Remove it with --cleanup.`,
    );
  }
}
