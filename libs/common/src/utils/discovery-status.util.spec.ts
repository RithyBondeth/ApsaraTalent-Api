import { activeUserSql, activeUserFindClauses } from './discovery-status.util';
import { EUserStatus } from '../database/enums/user-status.enum';

describe('activeUserSql', () => {
  it('matches ACTIVE, and matches SUSPENDED whose suspension has expired', () => {
    const sql = activeUserSql('u');
    expect(sql).toContain(`COALESCE("u"."status", 'active') = 'active'`);
    expect(sql).toContain(`"u"."status" = 'suspended'`);
    expect(sql).toContain(`"u"."suspendedUntil" <= now()`);
  });

  it('does not match BANNED even when suspendedUntil is set', () => {
    const sql = activeUserSql('u');
    expect(sql).not.toContain('banned');
  });

  it('uses the alias verbatim', () => {
    // If a caller writes .leftJoin('company.user', 'u') the fragment must
    // reference "u", not the entity's default table name.
    expect(activeUserSql('some_alias')).toMatch(/"some_alias"\."status"/);
  });
});

describe('activeUserFindClauses', () => {
  it('emits an OR pair covering ACTIVE and expired-SUSPENDED', () => {
    const clauses = activeUserFindClauses();
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toEqual({ status: EUserStatus.ACTIVE });
    expect(clauses[1].status).toBe(EUserStatus.SUSPENDED);
    // Just check the shape carries the LessThanOrEqual operator.
    expect(clauses[1]).toHaveProperty('suspendedUntil');
  });
});
