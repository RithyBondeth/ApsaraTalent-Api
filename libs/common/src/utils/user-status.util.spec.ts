import { EUserStatus } from '../database/enums/user-status.enum';
import {
  describeAccountStatus,
  isUserActive,
  resolveEffectiveStatus,
} from './user-status.util';

const DAY = 24 * 60 * 60 * 1000;

describe('user status', () => {
  it('treats an active account as active', () => {
    expect(isUserActive({ status: EUserStatus.ACTIVE })).toBe(true);
  });

  it('treats a missing status as active', () => {
    // A partial select that forgot the column must not lock everyone out.
    expect(isUserActive({} as never)).toBe(true);
  });

  it('keeps an open-ended suspension in force', () => {
    expect(
      resolveEffectiveStatus({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: null,
      }),
    ).toBe(EUserStatus.SUSPENDED);
  });

  it('holds a suspension that has not yet expired', () => {
    expect(
      isUserActive({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: new Date(Date.now() + DAY),
      }),
    ).toBe(false);
  });

  it('lets an expired suspension lapse without a sweep', () => {
    // Nothing rewrites the row when the term ends, so the expiry has to be
    // evaluated on read or a timed suspension would never actually lift.
    expect(
      isUserActive({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: new Date(Date.now() - DAY),
      }),
    ).toBe(true);
  });

  it('reads an expiry that survived a JSON hop as a date', () => {
    // The Redis session cache and every RPC payload stringify the Date.
    expect(
      isUserActive({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: new Date(Date.now() - DAY).toISOString(),
      }),
    ).toBe(true);
  });

  it('keeps a suspension in force when the expiry is unparseable', () => {
    expect(
      isUserActive({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: 'not a date',
      }),
    ).toBe(false);
  });

  it('never lets a ban expire', () => {
    expect(
      isUserActive({
        status: EUserStatus.BANNED,
        suspendedUntil: new Date(Date.now() - DAY),
      }),
    ).toBe(false);
  });

  it('tells the user why they were turned away', () => {
    const message = describeAccountStatus({
      status: EUserStatus.BANNED,
      statusReason: 'Repeated harassment reports',
    });
    expect(message).toContain('permanently banned');
    expect(message).toContain('Repeated harassment reports');
  });

  it('names the reinstatement date on a timed suspension', () => {
    const until = new Date(Date.now() + 3 * DAY);
    expect(
      describeAccountStatus({
        status: EUserStatus.SUSPENDED,
        suspendedUntil: until,
      }),
    ).toContain(until.toISOString().slice(0, 10));
  });
});
