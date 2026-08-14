import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { RegisterService } from './register.service';
import {
  findOrCreateBenefits,
  findOrCreateCareerScopes,
  findOrCreateSkills,
  findOrCreateValues,
} from '../utils/reference-data.util';

describe('RegisterService', () => {
  const users = { exists: jest.fn() };
  const config = { get: jest.fn(() => 'https://app.example.com') };
  const jwt = {
    generateEmailVerificationToken: jest.fn(),
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };
  const email = { sendEmail: jest.fn() };
  const logger = { error: jest.fn() };
  const manager = {
    create: jest.fn((Entity: any, data: any) => ({
      ...(Entity.name === 'User'
        ? { id: 'user-1' }
        : { id: `${Entity.name}-1` }),
      ...data,
    })),
    save: jest.fn(async (_Entity: any, value: any) => value),
    find: jest.fn(async () => []),
  };
  const runner = {
    manager,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };
  const dataSource = { createQueryRunner: jest.fn(() => runner) };
  const service = new RegisterService(
    users as any,
    config as any,
    jwt as any,
    email as any,
    logger as any,
    dataSource as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    users.exists.mockResolvedValue(false);
    jwt.generateEmailVerificationToken.mockResolvedValue('verify-token');
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');
    email.sendEmail.mockResolvedValue({ messageId: 'email-1' });
    manager.find.mockResolvedValue([]);
    manager.save.mockImplementation(async (_Entity, value) => value);
  });

  it.each(['companyRegister', 'employeeRegister'] as const)(
    '%s rejects an already registered credential before opening a transaction',
    async (method) => {
      users.exists.mockResolvedValue(true);
      const error = (await service[method]({
        authEmail: true,
        email: 'person@example.com',
      } as any).catch((caught) => caught)) as RpcException;
      expect(error.getError()).toEqual({
        message: 'This credential already registered!',
        statusCode: 401,
      });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    },
  );

  it('registers an employee atomically and issues credentials', async () => {
    const result = await service.employeeRegister({
      authEmail: true,
      email: 'employee@example.com',
      phone: '+85512345678',
      password: 'hash',
      firstname: 'Sok',
      lastname: 'Dara',
      username: 'sok',
      skills: [],
      educations: [],
      experiences: [],
      careerScopes: [],
      socials: [],
    } as any);

    expect(runner.connect).toHaveBeenCalled();
    expect(runner.startTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
    expect(jwt.generateToken).toHaveBeenCalledWith({
      id: 'user-1',
      info: 'employee@example.com',
      role: 'employee',
    });
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'employee@example.com' }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
  });

  it('registers a phone-authenticated company without sending verification email', async () => {
    const result = await service.companyRegister({
      authEmail: false,
      email: null,
      phone: '+85512345678',
      password: 'hash',
      name: 'Apsara',
      jobs: [],
      benefits: [],
      values: [],
      careerScopes: [],
      socials: [],
    } as any);

    expect(users.exists).toHaveBeenCalledWith({
      where: { phone: '+85512345678' },
    });
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(jwt.generateToken).toHaveBeenCalledWith(
      expect.objectContaining({ info: '+85512345678', role: 'company' }),
    );
    expect(result.message).toBe('Signup as company successfully.');
  });

  it('rolls back and releases the transaction when persistence fails', async () => {
    manager.save.mockRejectedValueOnce(new Error('database unavailable'));
    const error = (await service
      .employeeRegister({
        authEmail: false,
        phone: '+85512345678',
        skills: [],
      } as any)
      .catch((caught) => caught)) as RpcException;

    expect(error.getError()).toEqual({
      message: 'database unavailable',
      statusCode: 500,
    });
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
    expect(jwt.generateToken).not.toHaveBeenCalled();
  });

  it('bulk reuses existing lookup rows and creates only missing values', async () => {
    manager.find
      .mockResolvedValueOnce([{ id: 1, label: 'Remote' }])
      .mockResolvedValueOnce([{ id: 2, label: 'Growth' }])
      .mockResolvedValueOnce([{ id: 'scope-1', name: 'Software' }])
      .mockResolvedValueOnce([{ id: 'skill-1', name: 'TypeScript' }]);
    const benefits = await findOrCreateBenefits(
      ['Remote', 'Insurance'],
      runner as any,
    );
    const values = await findOrCreateValues(
      ['Growth', 'Integrity'],
      runner as any,
    );
    const scopes = await findOrCreateCareerScopes(
      ['Software', 'Design'],
      runner as any,
    );
    const skills = await findOrCreateSkills(
      [{ name: 'TypeScript' }, { name: 'Node.js', description: 'Backend' }],
      runner as any,
    );
    expect(benefits).toHaveLength(2);
    expect(values).toHaveLength(2);
    expect(scopes).toHaveLength(2);
    expect(skills).toHaveLength(2);
    expect(manager.create).toHaveBeenCalledWith(expect.any(Function), {
      label: 'Insurance',
    });
    expect(manager.create).toHaveBeenCalledWith(expect.any(Function), {
      name: 'Node.js',
      description: 'Backend',
    });
  });

  it('returns empty lookup collections without querying the database', async () => {
    await expect(findOrCreateBenefits([], runner as any)).resolves.toEqual([]);
    await expect(findOrCreateValues([], runner as any)).resolves.toEqual([]);
    await expect(findOrCreateCareerScopes([], runner as any)).resolves.toEqual(
      [],
    );
    await expect(findOrCreateSkills([], runner as any)).resolves.toEqual([]);
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('registers all company profile collections atomically', async () => {
    const result = await service.companyRegister({
      authEmail: true,
      email: 'company@example.com',
      phone: '+85512345678',
      password: 'hash',
      name: 'Apsara',
      jobs: [{ title: 'Developer' }],
      benefits: [{ label: 'Remote' }],
      values: [{ label: 'Growth' }],
      careerScopes: [{ name: 'Software' }],
      socials: [
        { platform: 'linkedin', url: 'https://linkedin.invalid/company' },
      ],
    } as any);
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ title: 'Developer' }),
    );
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'company@example.com' }),
    );
    expect(result.message).toContain('verify your email');
  });

  it('rolls back company registration failures and uses a defensive error message', async () => {
    manager.save.mockRejectedValueOnce(null);

    const error = (await service
      .companyRegister({
        authEmail: false,
        phone: '+85512345678',
        name: 'Apsara',
      } as any)
      .catch((caught) => caught)) as RpcException;

    expect(error.getError()).toEqual({
      message: 'An error occurred while registering company.',
      statusCode: 500,
    });
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });

  it('creates every employee relation collection in the same transaction', async () => {
    await service.employeeRegister({
      authEmail: false,
      phone: '+85512345678',
      password: 'hash',
      firstname: 'Sok',
      lastname: 'Dara',
      username: 'sok',
      educations: [{ school: 'RUPP', degree: 'BSc' }],
      skills: [{ name: 'TypeScript' }],
      experiences: [{ company: 'Apsara', title: 'Engineer' }],
      careerScopes: [{ name: 'Software' }],
      socials: [{ platform: 'github', url: 'https://github.com/sok' }],
    } as any);

    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ school: 'RUPP' }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ company: 'Apsara' }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ platform: 'github' }),
    );
    expect(runner.commitTransaction).toHaveBeenCalled();
  });

  it.each(['companyRegister', 'employeeRegister'] as const)(
    '%s releases its transaction when a database error has no message',
    async (method) => {
      manager.save.mockRejectedValueOnce({});
      const payload =
        method === 'companyRegister'
          ? { authEmail: false, phone: '+85511111111', name: 'Apsara' }
          : {
              authEmail: false,
              phone: '+85511111111',
              firstname: 'Sok',
              username: 'sok',
            };

      const failure = (await service[method](payload as any).catch(
        (caught) => caught,
      )) as RpcException;

      expect((failure.getError() as any).message).toContain(
        method === 'companyRegister' ? 'company' : 'employee',
      );
      expect(runner.rollbackTransaction).toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalled();
    },
  );

  it('contains verification-email delivery failure after a committed registration', async () => {
    email.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));

    await expect(
      service.employeeRegister({
        authEmail: true,
        email: 'employee@example.com',
        phone: '+85512345678',
        firstname: 'Sok',
        username: 'sok',
      } as any),
    ).resolves.toEqual(expect.objectContaining({ accessToken: 'access' }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send verification email: SMTP unavailable',
    );
  });

  it('does not roll back committed data when credential issuance fails', async () => {
    jwt.generateToken.mockRejectedValueOnce(new Error('signing unavailable'));

    await expect(
      service.companyRegister({
        authEmail: false,
        phone: '+85512345678',
        name: 'Apsara',
      } as any),
    ).rejects.toThrow('signing unavailable');

    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });
});
