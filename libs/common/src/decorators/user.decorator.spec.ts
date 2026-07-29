import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { NotFoundException } from '@nestjs/common';
import { EUserRole } from '../database/enums/user-role.enum';
import { User } from './user.decorator';

describe('@User decorator', () => {
  class TestController {
    handle(@User() user: unknown): void {
      void user;
    }
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'handle',
  );
  const factory = Object.values(metadata)[0]['factory'] as (
    data: unknown,
    context: unknown,
  ) => unknown;

  function context(request: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    };
  }

  it('returns the authenticated request user unchanged', () => {
    const user = {
      id: 'user-1',
      role: EUserRole.EMPLOYEE,
      iat: 1,
      exp: 2,
    };
    expect(factory(undefined, context({ user }))).toBe(user);
  });

  it('rejects requests without an authenticated user', () => {
    expect(() => factory(undefined, context({}))).toThrow(
      new NotFoundException("There's no token found."),
    );
  });
});
