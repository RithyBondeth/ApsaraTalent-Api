import supertest from 'supertest';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:13000';
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:14000';
const request = (url: string) =>
  supertest.agent(url).set('Origin', frontendOrigin);
const password = 'E2e!Password123';
const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

type Session = {
  cookie: string;
  userId: string;
  profileId: string;
};

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const tinyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
);

function cookieHeader(response: supertest.Response): string {
  const values = response.headers['set-cookie'];
  const cookies = Array.isArray(values) ? values : values ? [values] : [];
  return cookies.map((value) => value.split(';', 1)[0]).join('; ');
}

function cookieValue(response: supertest.Response, name: string): string {
  const cookie = cookieHeader(response)
    .split('; ')
    .find((value) => value.startsWith(`${name}=`));
  return decodeURIComponent(cookie?.slice(name.length + 1) ?? '');
}

function expectSecureAuthBoundary(response: supertest.Response): void {
  const values = response.headers['set-cookie'];
  const cookies = Array.isArray(values) ? values : values ? [values] : [];
  expect(cookies.some((value) => value.startsWith('auth-token='))).toBe(true);
  expect(cookies.some((value) => value.startsWith('refresh-token='))).toBe(
    true,
  );
  for (const value of cookies.filter(
    (cookie) =>
      cookie.startsWith('auth-token=') || cookie.startsWith('refresh-token='),
  )) {
    expect(value).toMatch(/HttpOnly/i);
  }
  expect(response.body).not.toHaveProperty('accessToken');
  expect(response.body).not.toHaveProperty('refreshToken');
}

async function registerEmployee(label: string): Promise<Session> {
  const phone = `+8559${runId.slice(-6)}${label === 'owner' ? '1' : '2'}`;
  const response = await request(baseUrl)
    .post('/auth/register-employee')
    .send({
      authEmail: false,
      phone,
      password,
      firstname: label,
      lastname: 'E2E',
      username: `${label}-${runId}`,
      job: 'Software Engineer',
      // Canonical values — the search filters compare these by exact equality,
      // so the fixture has to look like what the signup wizard now produces.
      availability: 'full_time',
      yearsOfExperience: '3 - 5 years',
      description: 'Isolated end-to-end test account',
      location: 'Phnom Penh',
      workMode: 'hybrid',
      noticePeriod: '2_weeks',
      languages: ['Khmer', 'English'],
    })
    .expect(201);

  expectSecureAuthBoundary(response);
  return {
    cookie: cookieHeader(response),
    userId: response.body.user.id,
    profileId: response.body.user.employee.id,
  };
}

async function registerCompany(): Promise<Session> {
  const phone = `+8558${runId.slice(-7)}`;
  const response = await request(baseUrl)
    .post('/auth/register-company')
    .send({
      authEmail: false,
      phone,
      password,
      name: `E2E Company ${runId}`,
      description: 'Isolated end-to-end test company',
      industry: 'Technology',
      location: 'Phnom Penh',
      companySize: 10,
      foundedYear: 2024,
      websiteUrl: 'https://e2e.example.com',
      // Free text by design: not one of the suggested types.
      companyType: 'Agricultural Cooperative',
      jobs: [
        {
          title: 'E2E Software Engineer',
          description: 'A job used only by the isolated test suite',
          // Canonical values, matching what the signup wizard now produces.
          type: 'full_time',
          experienceRequired: '3 - 5 years',
          educationRequired: 'Any',
          skillsRequired: 'TypeScript',
          salaryMin: 500,
          salaryMax: 1000,
          salaryCurrency: 'USD',
          workMode: 'hybrid',
          location: 'Phnom Penh',
          languagesRequired: ['Khmer', 'English'],
          openingsCount: 1,
          expireDate: '2030-01-01T00:00:00.000Z',
        },
      ],
    })
    .expect(201);

  expectSecureAuthBoundary(response);
  return {
    cookie: cookieHeader(response),
    userId: response.body.user.id,
    profileId: response.body.user.company.id,
  };
}

describe('isolated API system', () => {
  let owner: Session;
  let otherEmployee: Session;
  let company: Session;
  let jobId: string;

  it('reports gateway liveness without waiting for dependencies', async () => {
    const response = await request(baseUrl).get('/health').expect(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'api-gateway',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      }),
    );
  });

  it('reports the complete local service graph as ready', async () => {
    const response = await request(baseUrl).get('/health/ready').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.info.database.status).toBe('up');
    expect(response.body.info.redis_cache.status).toBe('up');
  });

  it('protects authenticated and private-file routes', async () => {
    await request(baseUrl).get('/user/current-user').expect(401);
    await request(baseUrl).get('/job/all').expect(401);
    await request(baseUrl).get('/notification').expect(401);
    await request(baseUrl).get('/notification/all').expect(404);
    await request(baseUrl)
      .get(
        '/match/analytics/00000000-0000-4000-8000-000000000000?role=employee',
      )
      .expect(401);
    await request(baseUrl)
      .get(
        '/user/employee/00000000-0000-4000-8000-000000000000/document/resume',
      )
      .expect(401);
    await request(baseUrl)
      .get('/chat/attachment/2026-07-13/example.pdf')
      .expect(401);
    await request(baseUrl).get('/storage/resumes/example.pdf').expect(404);
  });

  it('registers isolated employee and company sessions with HTTP-only cookies', async () => {
    owner = await registerEmployee('owner');
    otherEmployee = await registerEmployee('other');
    company = await registerCompany();

    const current = await request(baseUrl)
      .get('/user/current-user')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(current.body.id).toBe(owner.userId);
    expect(current.body.employee.id).toBe(owner.profileId);

    const companyProfile = await request(baseUrl)
      .get(`/user/company/one/${company.profileId}`)
      .set('Cookie', company.cookie)
      .expect(200);
    expect(companyProfile.body.openPositions).toHaveLength(1);
    jobId = companyProfile.body.openPositions[0].id;
  });

  // Registration used to accept fields and quietly drop them on the way to the
  // database — a company's website, type, work mode, salary range and openings
  // count were all lost, and nothing failed. Every assertion here names its
  // field, because the bug was an omission and only an omission-shaped test
  // catches it.
  it('persists every field submitted at registration', async () => {
    const companyProfile = await request(baseUrl)
      .get(`/user/company/one/${company.profileId}`)
      .set('Cookie', company.cookie)
      .expect(200);

    expect(companyProfile.body).toMatchObject({
      industry: 'Technology',
      location: 'Phnom Penh',
      companySize: 10,
      foundedYear: 2024,
      websiteUrl: 'https://e2e.example.com',
      companyType: 'Agricultural Cooperative',
    });

    const [position] = companyProfile.body.openPositions;
    expect(position).toMatchObject({
      title: 'E2E Software Engineer',
      type: 'full_time',
      experience: '3 - 5 years',
      education: 'Any',
      workMode: 'hybrid',
      location: 'Phnom Penh',
      openingsCount: 1,
    });
    expect(position.skills).toContain('TypeScript');
    expect(position.languagesRequired).toEqual(['Khmer', 'English']);
    // Decimal columns come back as strings through the driver, so compare
    // numerically rather than by identity.
    expect(Number(position.salaryMin)).toBe(500);
    expect(Number(position.salaryMax)).toBe(1000);
    expect(position.salaryCurrency).toBe('USD');

    const employeeProfile = await request(baseUrl)
      .get('/user/current-user')
      .set('Cookie', owner.cookie)
      .expect(200);

    expect(employeeProfile.body.employee).toMatchObject({
      job: 'Software Engineer',
      availability: 'full_time',
      yearsOfExperience: '3 - 5 years',
      location: 'Phnom Penh',
      workMode: 'hybrid',
      noticePeriod: '2_weeks',
    });
    expect(employeeProfile.body.employee.languages).toEqual([
      'Khmer',
      'English',
    ]);
  });

  it('rejects cross-profile mutations and private document access', async () => {
    await request(baseUrl)
      .patch(`/user/employee/update-info/${otherEmployee.profileId}`)
      .set('Cookie', owner.cookie)
      .send({ firstname: 'Unauthorized change' })
      .expect(403);

    await request(baseUrl)
      .patch(`/user/company/update-info/${company.profileId}`)
      .set('Cookie', owner.cookie)
      .send({ name: 'Unauthorized change' })
      .expect(403);

    await request(baseUrl)
      .get(`/user/employee/${otherEmployee.profileId}/document/resume`)
      .set('Cookie', owner.cookie)
      .expect(403);
  });

  it('enforces ownership for favorites, matching lists, interviews, and analytics', async () => {
    const employeeFavorite = await request(baseUrl)
      .post(
        `/user/employee/${owner.profileId}/favorite/company/${company.profileId}`,
      )
      .set('Cookie', owner.cookie)
      .expect(201);
    expect(employeeFavorite.body.message).toBeDefined();

    await request(baseUrl)
      .post(
        `/user/employee/${owner.profileId}/favorite/company/${company.profileId}`,
      )
      .set('Cookie', otherEmployee.cookie)
      .expect(403);

    const employeeFavorites = await request(baseUrl)
      .get(`/user/employee/all-favorites/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(employeeFavorites.body).toHaveLength(1);

    await request(baseUrl)
      .get(`/match/current-employee-liked/${owner.profileId}`)
      .set('Cookie', otherEmployee.cookie)
      .expect(403);
    await request(baseUrl)
      .get(`/match/interview/employee/${owner.profileId}`)
      .set('Cookie', otherEmployee.cookie)
      .expect(403);
    await request(baseUrl)
      .get(`/match/analytics/${owner.profileId}?role=employee`)
      .set('Cookie', otherEmployee.cookie)
      .expect(403);
    await request(baseUrl)
      .get(`/match/analytics/${owner.profileId}?role=unknown`)
      .set('Cookie', owner.cookie)
      .expect(400);

    const analytics = await request(baseUrl)
      .get(`/match/analytics/${owner.profileId}?role=employee`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(analytics.body.totalFavorites).toBe(1);
  });

  it('keeps uploaded documents private and validates uploaded file types', async () => {
    await request(baseUrl)
      .post(`/user/employee/upload-resume/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .attach('resume', tinyPdf, {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const ownDocument = await request(baseUrl)
      .get(`/user/employee/${owner.profileId}/document/resume`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(ownDocument.headers['cache-control']).toMatch(/private/);
    expect(ownDocument.headers['content-disposition']).toMatch(/inline/);

    await request(baseUrl)
      .get(`/user/employee/${owner.profileId}/document/resume`)
      .set('Cookie', otherEmployee.cookie)
      .expect(403);
    await request(baseUrl)
      .get(`/user/employee/${owner.profileId}/document/resume`)
      .set('Cookie', company.cookie)
      .expect(200);

    await request(baseUrl)
      .post(`/user/employee/upload-avatar/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .attach('avatar', tinyPdf, {
        filename: 'not-an-image.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await request(baseUrl)
      .post(`/user/employee/upload-avatar/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .attach('avatar', tinyPng, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const refreshedProfile = await request(baseUrl)
      .get(`/user/employee/one/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await request(baseUrl).get(refreshedProfile.body.resume).expect(404);

    await request(baseUrl)
      .post(`/user/employee/remove-resume/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(201);
    await request(baseUrl)
      .get(`/user/employee/${owner.profileId}/document/resume`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });

  it('covers chat creation, attachment quarantine, and moderation workflows', async () => {
    /*
      Chat requires a mutual match. Two people who have not both said yes
      cannot open a conversation, which is the platform's core rule and is now
      enforced on the server rather than merely unexposed in the UI.
    */
    await request(baseUrl)
      .post('/chat/initiate')
      .set('Cookie', owner.cookie)
      .send({ receiverId: company.userId })
      .expect(403);

    await request(baseUrl)
      .post(`/match/employee/${owner.profileId}/like/${company.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(201);
    await request(baseUrl)
      .post(`/match/company/${company.profileId}/like/${owner.profileId}`)
      .set('Cookie', company.cookie)
      .expect(201);

    const chat = await request(baseUrl)
      .post('/chat/initiate')
      .set('Cookie', owner.cookie)
      .send({ receiverId: company.userId })
      .expect(201);
    expect(chat.body.chatId ?? chat.body.id).toBeDefined();

    const recent = await request(baseUrl)
      .get('/chat/recent')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(recent.body.length).toBeGreaterThanOrEqual(1);

    const uploaded = await request(baseUrl)
      .post('/chat/upload')
      .set('Cookie', owner.cookie)
      .attach('file', tinyPdf, {
        filename: 'chat-document.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(uploaded.body.url).toMatch(/^\/chat\/attachment\//);
    await request(baseUrl)
      .get(uploaded.body.url)
      .set('Cookie', owner.cookie)
      .expect(403);
    await request(baseUrl)
      .post('/chat/upload')
      .set('Cookie', owner.cookie)
      .attach('file', Buffer.from('executable'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);

    await request(baseUrl)
      .post(`/user/moderation/block/${otherEmployee.userId}`)
      .set('Cookie', owner.cookie)
      .expect(201);
    const status = await request(baseUrl)
      .get(`/user/moderation/block-status/${otherEmployee.userId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(status.body.isBlocked).toBe(true);
    const blocked = await request(baseUrl)
      .get('/user/moderation/blocked')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(blocked.body).toHaveLength(1);
    await request(baseUrl)
      .delete(`/user/moderation/block/${otherEmployee.userId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
  });

  it('covers job applications, company authorization, and interviews', async () => {
    const application = await request(baseUrl)
      .post('/job/application')
      .set('Cookie', owner.cookie)
      .send({ jobId, coverLetterNote: 'E2E application' })
      .expect(201);
    expect(application.body.id).toBeDefined();

    const mine = await request(baseUrl)
      .get('/job/application/mine')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(mine.body.some((item: any) => item.id === application.body.id)).toBe(
      true,
    );
    await request(baseUrl)
      .get(`/job/application/job/${jobId}/company/${company.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(403);
    await request(baseUrl)
      .get(`/job/application/job/${jobId}/company/${company.profileId}`)
      .set('Cookie', company.cookie)
      .expect(200);

    const employeeLike = await request(baseUrl)
      .post(`/match/employee/${owner.profileId}/like/${company.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(201);
    expect(employeeLike.body.employeeLiked).toBe(true);
    const mutualLike = await request(baseUrl)
      .post(`/match/company/${company.profileId}/like/${owner.profileId}`)
      .set('Cookie', company.cookie)
      .expect(201);
    expect(mutualLike.body.isMatched).toBe(true);

    const matchCount = await request(baseUrl)
      .get(`/match/current-employee-matching-count/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(matchCount.body.count).toBe(1);

    const interview = await request(baseUrl)
      .post('/match/interview')
      .set('Cookie', company.cookie)
      .send({
        employeeId: owner.profileId,
        companyId: company.profileId,
        title: 'E2E Interview',
        scheduledAt: '2030-01-02T10:00:00.000Z',
        durationMinutes: 30,
      })
      .expect(201);
    expect(interview.body.id).toBeDefined();
    await request(baseUrl)
      .get(`/match/interview/employee/${owner.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(200);

    await request(baseUrl)
      .delete(`/job/application/${application.body.id}`)
      .set('Cookie', otherEmployee.cookie)
      .expect(404);
    await request(baseUrl)
      .delete(`/job/application/${application.body.id}`)
      .set('Cookie', owner.cookie)
      .expect(200);

    await request(baseUrl)
      .delete(`/match/unmatch/${owner.profileId}/${company.profileId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
  });

  it('isolates notifications by the authenticated user', async () => {
    const created = await request(baseUrl)
      .post('/notification')
      .set('Cookie', owner.cookie)
      .send({ title: 'E2E notification', message: 'Private message' })
      .expect(201);
    expect(created.body.id).toBeDefined();

    const ownerList = await request(baseUrl)
      .get('/notification')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(
      ownerList.body.items.some((item: any) => item.id === created.body.id),
    ).toBe(true);
    const otherList = await request(baseUrl)
      .get('/notification')
      .set('Cookie', otherEmployee.cookie)
      .expect(200);
    expect(
      otherList.body.items.some((item: any) => item.id === created.body.id),
    ).toBe(false);

    await request(baseUrl)
      .patch(`/notification/${created.body.id}/read`)
      .set('Cookie', otherEmployee.cookie)
      .expect(404);
    await request(baseUrl)
      .patch(`/notification/${created.body.id}/read`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await request(baseUrl)
      .delete(`/notification/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .expect(200);
  });

  it('logs in, refreshes, and logs out without exposing tokens in JSON', async () => {
    const phone = `+8559${runId.slice(-6)}1`;
    const login = await request(baseUrl)
      .post('/auth/login')
      .send({ identifier: phone, password })
      .expect(200);
    expectSecureAuthBoundary(login);

    // Refresh credentials are signed JWTs too, but must never authorize normal
    // API requests as access tokens.
    await request(baseUrl)
      .get('/user/current-user')
      .set('Authorization', `Bearer ${cookieValue(login, 'refresh-token')}`)
      .expect(401);

    // A browser carrying auth cookies must not be able to mutate state from an
    // untrusted website, even though CORS would hide the response body.
    await request(baseUrl)
      .post('/auth/logout')
      .set('Cookie', cookieHeader(login))
      .set('Origin', 'https://attacker.example')
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);

    const refreshed = await request(baseUrl)
      .post('/auth/refresh')
      .set('Cookie', cookieHeader(login))
      .expect(200);
    expectSecureAuthBoundary(refreshed);

    const logout = await request(baseUrl)
      .post('/auth/logout')
      .set('Cookie', cookieHeader(refreshed))
      .expect(200);
    const rawSetCookie = logout.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : rawSetCookie
        ? [rawSetCookie]
        : [];
    expect(setCookie.join(';')).toMatch(
      /auth-token=.*Expires=Thu, 01 Jan 1970/i,
    );
  });

  it('applies security headers and a restrictive CORS policy', async () => {
    const live = await request(baseUrl).get('/health/live').expect(200);
    expect(live.headers['x-content-type-options']).toBe('nosniff');
    expect(live.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(live.headers['content-security-policy']).toBeDefined();

    const allowed = await request(baseUrl)
      .options('/user/current-user')
      .set('Origin', 'http://127.0.0.1:14000')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:14000',
    );

    const blocked = await request(baseUrl)
      .options('/user/current-user')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(blocked.status).toBeGreaterThanOrEqual(400);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('protects Prometheus metrics with a bearer token', async () => {
    const metricsToken = process.env.METRICS_TOKEN;
    expect(metricsToken).toBeTruthy();

    await request(baseUrl).get('/metrics').expect(401);
    await request(baseUrl).get(`/metrics?token=${metricsToken}`).expect(401);

    const metrics = await request(baseUrl)
      .get('/metrics')
      .set('Authorization', `Bearer ${metricsToken}`)
      .expect(200);
    expect(metrics.text).toContain('process_cpu_seconds_total');
  });
});
