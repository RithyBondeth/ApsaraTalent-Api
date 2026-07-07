// Nest CLI picks this up automatically for webpack builds (nest-cli.json has webpack: true).
// Emit external source maps so production stack traces (Sentry, crash logs) point at
// TypeScript sources — pair with `node --enable-source-maps` in the service Dockerfiles.
module.exports = (options) => ({
  ...options,
  devtool: 'source-map',
});
