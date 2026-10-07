/** Deterministic clients for the gateway's complete OpenAPI contract. No network needed. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const check = process.argv.includes('--check');
const specPath = path.join(root, 'contracts/openapi.json');
const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
const fingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify(spec))
  .digest('hex');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const operations = Object.entries(spec.paths).flatMap(([url, item]) =>
  methods
    .filter((m) => item[m])
    .map((method) => ({
      url,
      method,
      ...item[method],
      parameters: [
        ...(item.parameters ?? []),
        ...(item[method].parameters ?? []),
      ],
    })),
);
const operationName = (s) =>
  s
    .replace(/_([a-zA-Z])/g, (_, c) => c.toUpperCase())
    .replace(/^./, (c) => c.toLowerCase());
const name = (s) => s.replace(/[^a-zA-Z0-9_]/g, '_');
const schemas = spec.components?.schemas ?? {};
const dartName = (s) => `Api${name(s)}`;
const refName = (s) => s.$ref?.split('/').at(-1);
const reserved = new Set([
  'abstract',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'covariant',
  'default',
  'deferred',
  'do',
  'dynamic',
  'else',
  'enum',
  'export',
  'extends',
  'extension',
  'external',
  'factory',
  'false',
  'final',
  'finally',
  'for',
  'Function',
  'get',
  'hide',
  'if',
  'implements',
  'import',
  'in',
  'interface',
  'is',
  'late',
  'library',
  'mixin',
  'new',
  'null',
  'of',
  'on',
  'operator',
  'part',
  'required',
  'rethrow',
  'return',
  'set',
  'show',
  'static',
  'super',
  'switch',
  'sync',
  'this',
  'throw',
  'true',
  'try',
  'typedef',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);
const field = (s) => (reserved.has(name(s)) ? `${name(s)}Value` : name(s));
function flatten(schema, seen = new Set()) {
  if (!schema) return {};
  if (schema.$ref) {
    const key = refName(schema);
    return seen.has(key) ? {} : flatten(schemas[key], new Set([...seen, key]));
  }
  return {
    ...schema,
    properties: Object.assign(
      {},
      ...(schema.allOf ?? []).map((s) => flatten(s, seen).properties ?? {}),
      schema.properties ?? {},
    ),
    required: [
      ...new Set([
        ...(schema.required ?? []),
        ...(schema.allOf ?? []).flatMap((s) => flatten(s, seen).required ?? []),
      ]),
    ],
  };
}
function dtype(s = {}) {
  const ref = refName(s);
  if (ref && Object.keys(flatten(s).properties ?? {}).length)
    return dartName(ref);
  if (s.type === 'array') return `List<${dtype(s.items)}>`;
  return (
    {
      string: 'String',
      integer: 'int',
      number: 'num',
      boolean: 'bool',
      object: 'Map<String, dynamic>',
    }[s.type] ?? 'dynamic'
  );
}
function decode(s, v) {
  const t = dtype(s);
  const ref = refName(s);
  if (ref && t === dartName(ref))
    return `${t}.fromJson(Map<String, dynamic>.from(${v} as Map))`;
  if (s.type === 'array')
    return `(${v} as List).map((v) => ${decode(s.items ?? {}, 'v')}).toList()`;
  if (t === 'Map<String, dynamic>')
    return `Map<String, dynamic>.from(${v} as Map)`;
  return t === 'dynamic' ? v : `${v} as ${t}`;
}
function encode(s, v) {
  if (refName(s) && dtype(s) === dartName(refName(s))) return `${v}.toJson()`;
  if (s.type === 'array')
    return `${v}.map((v) => ${encode(s.items ?? {}, 'v')}).toList()`;
  return v;
}
let dart = `// Generated from contracts/openapi.json. Do not edit.\n// SHA256: ${fingerprint}\nimport 'package:dio/dio.dart';\nimport '../api_client.dart';\n\n`;
for (const [n, raw] of Object.entries(schemas).sort()) {
  const s = flatten(raw);
  const props = Object.entries(s.properties ?? {});
  if (!props.length) continue;
  const required = new Set(s.required ?? []);
  dart += `class ${dartName(n)} {\n  const ${dartName(n)}({${props.map(([k]) => `${required.has(k) ? 'required ' : ''}this.${field(k)}`).join(', ')}});\n`;
  for (const [k, v] of props)
    dart += `  final ${dtype(v)}${dtype(v) === 'dynamic' ? '' : required.has(k) && !v.nullable ? '' : '?'} ${field(k)};\n`;
  dart += `  factory ${dartName(n)}.fromJson(Map<String, dynamic> json) => ${dartName(n)}(\n`;
  for (const [k, v] of props)
    dart += `    ${field(k)}: ${(required.has(k) && !v.nullable) || dtype(v) === 'dynamic' ? decode(v, `json[${JSON.stringify(k)}]`) : `json[${JSON.stringify(k)}] == null ? null : ${decode(v, `json[${JSON.stringify(k)}]`)}`},\n`;
  dart += '  );\n  Map<String, dynamic> toJson() => {\n';
  for (const [k, v] of props)
    dart += `    ${required.has(k) && !v.nullable ? '' : `if (${field(k)} != null) `}${JSON.stringify(k)}: ${encode(v, field(k) + (required.has(k) && !v.nullable ? '' : '!'))},\n`;
  dart += '  };\n}\n\n';
}
// Preserve headers/cookies and streaming bodies at the transport boundary.
dart +=
  'class GatewayApi {\n  GatewayApi(this.client);\n  final ApiClient client;\n';
for (const op of operations) {
  const params = op.parameters.filter((p) => p.in === 'path');
  const body = op.requestBody?.content?.['application/json']?.schema;
  const args = [
    ...params.map((p) => `required String ${field(p.name)}`),
    'Map<String, dynamic>? query',
    'Options? options',
  ];
  if (op.requestBody)
    args.push(
      `${op.requestBody.required ? 'required ' : ''}${body ? dtype(body) : 'dynamic'}${op.requestBody.required || !body || dtype(body) === 'dynamic' ? '' : '?'} body`,
    );
  let route = JSON.stringify(op.url);
  for (const p of params)
    route = route.replace(
      `{${p.name}}`,
      `\${Uri.encodeComponent(${field(p.name)})}`,
    );
  const data = op.requestBody
    ? `, data: ${body ? (op.requestBody.required ? encode(body, 'body') : `body == null ? null : ${encode(body, 'body!')}`) : 'body'}`
    : '';
  dart += `  Future<Response<dynamic>> ${operationName(name(op.operationId ?? `${op.method}_${op.url}`))}({${args.join(', ')}}) => client.${op.method}(${route}${op.method === 'get' ? ', queryParameters: query' : ''}${data}, options: options);\n`;
}
dart +=
  '}\n\nconst realtimeRefreshEvents = <String>' +
  JSON.stringify(spec['x-apsara-realtime-refresh'] ?? []) +
  ';\n';
let ts = `// Generated from contracts/openapi.json. Do not edit.\n// SHA256: ${fingerprint}\nimport type { paths } from '@/utils/interfaces/generated/api';\nimport type { AxiosInstance, AxiosRequestConfig } from 'axios';\nimport { API_BASE_URL } from '@/utils/constants/apis/base.api.constant';\ntype Content<T> = T extends { content: infer C } ? C[keyof C] : never;\ntype Body<T> = T extends { requestBody?: infer B } ? Content<NonNullable<B>> : never;\ntype Result<T> = T extends { responses: infer R } ? Content<R[keyof R]> : unknown;\nexport class GatewayApi {\n  constructor(private readonly client: AxiosInstance) {}\n`;
for (const op of operations) {
  const params = op.parameters.filter((p) => p.in === 'path');
  const o = `paths[${JSON.stringify(op.url)}][${JSON.stringify(op.method)}]`;
  const args = [
    ...params.map((p) => `${JSON.stringify(p.name)}: string`),
    'query?: Record<string, unknown>',
    'config?: AxiosRequestConfig',
  ];
  if (op.requestBody)
    args.push(`body${op.requestBody.required ? '' : '?'}: Body<${o}>`);
  let route = '`' + op.url + '`';
  for (const p of params)
    route = route.replace(
      `{${p.name}}`,
      `\${encodeURIComponent(input[${JSON.stringify(p.name)}])}`,
    );
  ts += `  async ${operationName(name(op.operationId ?? `${op.method}_${op.url}`))}(input: { ${args.join('; ')} }) {\n    return this.client.request<Result<${o}>>({ ...input.config, url: API_BASE_URL + ${route}, method: ${JSON.stringify(op.method)}, params: input.query${op.requestBody ? ', data: input.body' : ''} });\n  }\n`;
}
ts +=
  '}\nexport const realtimeEvents = ' +
  JSON.stringify(
    Object.fromEntries(
      (spec['x-apsara-realtime-refresh'] ?? []).map((event) => [event, event]),
    ),
  ) +
  ' as const;\n';
const mobile = await fs.access(path.join(root, 'pubspec.yaml')).then(
  () => true,
  () => false,
);
const output = path.join(
  root,
  mobile
    ? 'lib/core/network/generated/gateway_api.dart'
    : 'lib/generated/gateway-api.ts',
);
let content = mobile ? dart : ts;
if (!mobile) {
  const prettier = await import('prettier');
  content = await prettier.format(content, {
    ...(await prettier.resolveConfig(output)),
    filepath: output,
  });
}
await fs.mkdir(path.dirname(output), { recursive: true });
if (check) {
  const previous = await fs.readFile(output, 'utf8').catch(() => null);
  if (previous !== content)
    throw Error(
      `Generated client is stale: ${output}. Run node scripts/contracts/generate-clients.mjs`,
    );
} else await fs.writeFile(output, content);
console.log(
  `${operations.length} operations, ${Object.keys(schemas).length} schemas. ${check ? 'Verified' : 'Generated'} ${output}`,
);
