import supertest from 'supertest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const base = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:13000';
const origin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:14000';
const execute = promisify(execFile);
const token = (cookies: string[], name: string) =>
  decodeURIComponent(
    cookies
      .find((c) => c.startsWith(`${name}=`))!
      .split(';')[0]
      .slice(name.length + 1),
  );

describe('web/mobile gateway parity', () => {
  it('shares account drafts across cookie and bearer clients without overwriting stale revisions', async () => {
    const register = await supertest(base)
      .post('/auth/register-employee')
      .set('Origin', origin)
      .send({
        authEmail: false,
        phone: `+8557${Date.now().toString().slice(-8)}`,
        password: 'E2e!Password123',
        firstname: 'Parity',
        lastname: 'Test',
        username: `parity-${Date.now()}`,
        job: 'Engineer',
        availability: 'full_time',
        yearsOfExperience: '3 - 5 years',
        location: 'Phnom Penh',
        description: 'Isolated parity fixture',
      })
      .expect(201);
    const cookies = register.headers['set-cookie'] as unknown as string[];
    const cookie = cookies.map((c) => c.split(';')[0]).join('; ');
    const access = token(cookies, 'auth-token');
    const id = randomUUID();
    const content = {
      personalInfo: {
        fullName: 'Parity Test',
        email: 'parity@example.com',
        profilePicture: `data:image/png;base64,${'A'.repeat(150000)}`,
      },
      skills: ['Dart'],
      experience: [],
      template: 'modern',
      sectionOrder: [
        'skills',
        'summary',
        'experience',
        'education',
        'careerScopes',
      ],
      design: { palette: 'emerald', customAccent: '#3366CC' },
    };
    const created = await supertest(base)
      .post('/resume/drafts')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .send({ id, name: 'Cross-device resume', content })
      .expect(201);
    expect(created.body.revision).toBe(1);
    const mobile = supertest(base);
    const read = await mobile
      .get(`/resume/drafts/${id}`)
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
    expect(read.body.content).toEqual(content);
    await mobile
      .put(`/resume/drafts/${id}`)
      .set('Authorization', `Bearer ${access}`)
      .send({
        name: 'Cross-device resume',
        content: { ...content, summary: 'Mobile edit' },
        revision: 1,
      })
      .expect(200);
    await supertest(base)
      .put(`/resume/drafts/${id}`)
      .set('Origin', origin)
      .set('Cookie', cookie)
      .send({ name: 'Cross-device resume', content, revision: 1 })
      .expect(409);
    const latest = await supertest(base)
      .get(`/resume/drafts/${id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(latest.body.content.summary).toBe('Mobile edit');

    // Exercise the same one-use Redis exchange used by real provider callbacks.
    const code = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const redis = createClient({ url: 'redis://127.0.0.1:16379' });
    await redis.connect();
    try {
      await redis.set(
        `oauth:mobile:${createHash('sha256').update(code).digest('hex')}`,
        JSON.stringify({
          challenge: createHash('sha256').update(verifier).digest('base64url'),
          remember: false,
          result: {
            accessToken: access,
            refreshToken: token(cookies, 'refresh-token'),
            newUser: false,
          },
        }),
        { PX: 60000 },
      );
      await supertest(base)
        .post('/social/mobile/exchange')
        .send({ code, codeVerifier: 'x'.repeat(43) })
        .expect(401);
      const signedIn = await supertest(base)
        .post('/social/mobile/exchange')
        .send({ code, codeVerifier: verifier })
        .expect(200);
      expect(signedIn.body).not.toHaveProperty('accessToken');
      expect(
        (signedIn.headers['set-cookie'] as unknown as string[]).join(';'),
      ).toContain('HttpOnly');
      await supertest(base)
        .post('/social/mobile/exchange')
        .send({ code, codeVerifier: verifier })
        .expect(401);
    } finally {
      await redis.quit();
    }

    if (process.env.E2E_CLIENTS === '1') {
      const env = {
        ...process.env,
        E2E_API_URL: base,
        E2E_ACCESS_TOKEN: access,
        E2E_DRAFT_ID: id,
        NEXT_PUBLIC_API_URL: base,
      };
      for (const [repo, command, args] of [
        [
          'ApsaraTalent-Web',
          'npx',
          ['vitest', 'run', '--config', 'vitest.contract.config.ts'],
        ],
        [
          'ApsaraTalent-Mobile',
          'flutter',
          ['test', '--no-pub', 'test/contract/live_gateway_test.dart'],
        ],
      ] as const) {
        try {
          const result = await execute(command, [...args], {
            cwd: resolve(process.cwd(), '..', repo),
            env,
            timeout: 120000,
          });
          process.stdout.write(result.stdout);
        } catch (error: any) {
          throw new Error(
            `${repo} live contract check failed:\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
          );
        }
      }
    }
    await mobile
      .delete(`/resume/drafts/${id}`)
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
  }, 180000);
});
