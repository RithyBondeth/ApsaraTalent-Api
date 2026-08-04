const rawBaseUrl = process.argv[2] || process.env.PRODUCTION_API_URL;
const timeoutMs = Number(process.env.DEPLOY_VERIFY_TIMEOUT_MS || 300_000);

if (!rawBaseUrl) {
  throw new Error(
    'Set PRODUCTION_API_URL or pass the production API URL as the first argument.',
  );
}

const baseUrl = new URL(
  /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`,
);
const liveUrl = new URL('/health/live', baseUrl);
const readyUrl = new URL('/health/ready', baseUrl);
const deadline = Date.now() + timeoutMs;
let lastFailure = 'No request attempted';

while (Date.now() < deadline) {
  try {
    const [liveResponse, readyResponse] = await Promise.all([
      fetch(liveUrl, { signal: AbortSignal.timeout(10_000) }),
      fetch(readyUrl, { signal: AbortSignal.timeout(10_000) }),
    ]);
    const [live, ready] = await Promise.all([
      liveResponse.json(),
      readyResponse.json(),
    ]);
    if (
      liveResponse.ok &&
      readyResponse.ok &&
      live.status === 'ok' &&
      live.service === 'api-gateway' &&
      ready.status === 'ok'
    ) {
      console.log(
        `Verified ${baseUrl.origin} (release=${live.release || 'unknown'}, all readiness checks up)`,
      );
      process.exit(0);
    }
    lastFailure = `live=${liveResponse.status} ${JSON.stringify(live)} ready=${readyResponse.status} ${JSON.stringify(ready)}`;
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
  }
  await new Promise((resolve) => setTimeout(resolve, 5_000));
}

throw new Error(
  `Production did not become ready within ${timeoutMs}ms: ${lastFailure}`,
);
