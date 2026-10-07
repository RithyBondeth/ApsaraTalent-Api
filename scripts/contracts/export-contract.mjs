import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const url = process.env.API_SPEC_URL ?? 'http://127.0.0.1:13000/docs-json';
const response = await fetch(url);
if (!response.ok) throw Error(`OpenAPI export failed: HTTP ${response.status}`);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable(value[k])]),
    );
  return value;
}
const document = stable(await response.json());
const content = JSON.stringify(document, null, 2) + '\n';
const output = path.join(root, 'contracts/openapi.json');
if (process.argv.includes('--check')) {
  if ((await fs.readFile(output, 'utf8')) !== content)
    throw Error(
      'The live gateway differs from contracts/openapi.json. Run npm run contracts:update.',
    );
} else {
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, content);
  for (const repo of ['ApsaraTalent-Web', 'ApsaraTalent-Mobile']) {
    const destination = path.resolve(root, '..', repo);
    if (
      !(await fs.access(destination).then(
        () => true,
        () => false,
      ))
    )
      continue;
    await fs.mkdir(path.join(destination, 'contracts'), { recursive: true });
    await fs.mkdir(path.join(destination, 'scripts/contracts'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(destination, 'contracts/openapi.json'),
      content,
    );
    await fs.copyFile(
      path.join(root, 'scripts/contracts/generate-clients.mjs'),
      path.join(destination, 'scripts/contracts/generate-clients.mjs'),
    );
    execFileSync(process.execPath, ['scripts/contracts/generate-clients.mjs'], {
      cwd: destination,
      stdio: 'inherit',
    });
    if (repo.endsWith('Web'))
      execFileSync(process.execPath, ['scripts/generate-api-types.mjs'], {
        cwd: destination,
        stdio: 'inherit',
        env: { ...process.env, API_SPEC_URL: 'contracts/openapi.json' },
      });
  }
}
console.log(
  `Gateway contract ${process.argv.includes('--check') ? 'verified' : 'exported'}: ${Object.keys(document.paths).length} paths.`,
);
