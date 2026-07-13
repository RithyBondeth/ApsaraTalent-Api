# Isolated end-to-end tests

Run the complete API stack against disposable local infrastructure:

```sh
npm run test:e2e
```

The runner:

- starts temporary pgvector PostgreSQL and Redis containers;
- rebuilds and starts all eight API applications on dedicated localhost ports;
- initializes the schema once, then disables synchronization for every other process;
- disables Firebase and other external integrations only under `NODE_ENV=test`;
- tests readiness, authentication cookies, registration, login, token refresh,
  logout, profile ownership, private files, CORS, and security headers;
- stops every application and removes containers, volumes, logs, and temporary
  storage after success or failure.

The runner refuses to start unless PostgreSQL and Redis point to the dedicated
localhost test ports. This prevents accidental use of shared or production data.

For a faster rerun after the applications are already built:

```sh
E2E_SKIP_BUILD=1 npm run test:e2e
```

Docker Desktop or another compatible Docker engine must be running.
