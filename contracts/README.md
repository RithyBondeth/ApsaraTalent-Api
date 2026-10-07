# Shared gateway contract

`openapi.json` is the canonical, sorted Swagger document exported from the running gateway. The current snapshot covers 176 HTTP operations, 165 route paths, and 213 schemas. It includes the AI SSE envelope and the four realtime events used to refresh notification, matching, and interview state.

## Updating an API

1. Change the gateway DTOs/controllers. Every DTO class name must be unique: Swagger references class names globally. Run `node scripts/contracts/check-dto-names.mjs` before exporting.
2. Start the gateway with Swagger enabled, then run `API_SPEC_URL=http://127.0.0.1:13000/docs-json npm run contracts:update`. This writes the canonical snapshot, copies it and the shared generator to sibling `ApsaraTalent-Web` and `ApsaraTalent-Mobile` checkouts, and regenerates both SDKs plus the existing web OpenAPI types. A missing sibling checkout is skipped and must receive the snapshot and generator separately.
3. Review and commit the snapshot and generated files in each repository together with the UI/repository changes. Generated endpoint availability alone does not establish feature or permission coverage.

`npm run contracts:check` compares the live gateway with the frozen snapshot. Each client can check its generated SDK offline with `node scripts/contracts/generate-clients.mjs --check`.

## Checking both real clients

With Docker running and dependencies installed in all three sibling repositories, run:

```sh
E2E_CLIENTS=1 npm run test:e2e
```

The runner checks DTO names, builds the gateway and workers, creates isolated local PostgreSQL/Redis services, verifies the live Swagger contract, and runs backend journeys. It also invokes the generated TypeScript and Dart clients against the real gateway to read/update the same account draft. `E2E_CONTRACT_UPDATE=1` intentionally refreshes the snapshot before verification. `E2E_SKIP_BUILD=1` is only appropriate when all service builds already match the source.

The parity journey checks web cookie and mobile bearer access, embedded avatar/design preservation, stale-revision rejection, and the Redis-backed native OAuth code exchange (wrong verifier, successful exchange, and replay rejection). External providers are disabled in this isolated suite. Provider credentials, browser-to-app handoff on iOS/Android, and native PDF opening still require device smoke tests.

## Client use

Web: `lib/generated/gateway-api.ts` uses the existing authenticated Axios instance. Request and response types come from `utils/interfaces/generated/api.ts`. Web account-draft calls and realtime event names use this contract.

Mobile: `lib/core/network/generated/gateway_api.dart` accepts the existing authenticated Dio instance and generates endpoint methods and schema models. Native OAuth exchange and resume/draft tools use it. Transport methods retain raw Dio responses for existing cookie, file, and stream handling; consumer repositories still validate payloads before applying them.

Legacy feature callers remain valid and can migrate incrementally. The shared SDK covers every declared HTTP operation; it does not add mobile admin screens or certify every third-party integration.
