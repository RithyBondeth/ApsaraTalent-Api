import { RpcException } from '@nestjs/microservices';

/**
 * Shared doubles for the three services MatchingService was split into. They
 * drive the same repositories and caches, so the fixtures live in one place
 * rather than being copied three ways and drifting apart.
 */
export function createMatchingFixtures() {
  const matching = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const employees = { findOne: jest.fn() };
  const companies = { findOne: jest.fn() };
  const employeeFavorites = { delete: jest.fn(), count: jest.fn() };
  const companyFavorites = { delete: jest.fn(), count: jest.fn() };
  const interviews = { delete: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const logger = { error: jest.fn(), warn: jest.fn() };
  const redis = {
    invalidateMatchingCaches: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    generateMatchingKey: jest.fn((kind, id) => `${kind}:${id}`),
    generateEmployeeFavoritesKey: jest.fn(() => 'employee-favorites'),
    generateEmployeeFavoriteCountKey: jest.fn(() => 'employee-favorite-count'),
    generateCompanyFavoritesKey: jest.fn(() => 'company-favorites'),
    generateCompanyFavoriteCountKey: jest.fn(() => 'company-favorite-count'),
  };
  const config = { get: jest.fn(() => 'test-key') };
  const notifications = { emit: jest.fn() };

  const employee = {
    id: 'employee-1',
    username: 'Applicant',
    avatar: 'employee.png',
    user: { id: 'employee-user', email: 'employee@example.com' },
    skills: [{ name: 'TypeScript' }, { name: 'Node.js' }],
  };
  const company = {
    id: 'company-1',
    name: 'Apsara',
    avatar: 'company.png',
    user: { id: 'company-user', email: 'company@example.com' },
    openPositions: [{ skillsRequired: 'TypeScript, PostgreSQL' }],
  };

  return {
    matching,
    employees,
    companies,
    employeeFavorites,
    companyFavorites,
    interviews,
    email,
    logger,
    redis,
    config,
    notifications,
    employee,
    company,
  };
}

export async function expectRpc(
  promise: Promise<unknown>,
  statusCode: number,
  message: string,
) {
  const error = (await promise.catch((caught) => caught)) as RpcException;
  expect(error).toBeInstanceOf(RpcException);
  expect(error.getError()).toEqual({ statusCode, message });
}
