import { ForbiddenException } from '@nestjs/common';
import { EUserRole } from '../database/enums/user-role.enum';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function context(request: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  }

  it('allows administrators', () => {
    expect(
      guard.canActivate(context({ user: { role: EUserRole.ADMIN } })),
    ).toBe(true);
  });

  it.each([undefined, {}, { user: undefined }, { user: { role: 'employee' } }])(
    'rejects a non-administrator request %#',
    (request) => {
      expect(() => guard.canActivate(context(request))).toThrow(
        new ForbiddenException('Administrator access is required'),
      );
    },
  );
});
