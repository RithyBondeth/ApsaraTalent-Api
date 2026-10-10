import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDestination } from './release-preflight.mjs';

const variables = {
  RAILWAY_PROJECT_ID: 'expected-project',
  RAILWAY_ENVIRONMENT_NAME: 'production',
  RAILWAY_PUBLIC_DOMAIN: 'talent-api.up.railway.app',
};
test('validates the token destination and generated gateway domain before any migration', () => {
  validateDestination(
    variables,
    'expected-project',
    'https://talent-api.up.railway.app',
    true,
  );
  assert.throws(() =>
    validateDestination(
      variables,
      'another-project',
      'https://talent-api.up.railway.app',
      true,
    ),
  );
  assert.throws(() =>
    validateDestination(
      { ...variables, RAILWAY_ENVIRONMENT_NAME: 'staging' },
      'expected-project',
      'https://talent-api.up.railway.app',
      true,
    ),
  );
  assert.throws(() =>
    validateDestination(
      variables,
      'expected-project',
      'https://removed.up.railway.app',
      true,
    ),
  );
});
test('rejects invalid public origins and permits a custom HTTPS domain', () => {
  for (const origin of [
    'http://api.local.test',
    'https://user:private@api.local.test',
    'https://api.local.test/private',
    'https://api.local.test?token=private',
  ]) {
    assert.throws(() =>
      validateDestination(variables, 'expected-project', origin),
    );
  }
  validateDestination(
    variables,
    'expected-project',
    'https://api.talent.local.test',
    true,
  );
});
