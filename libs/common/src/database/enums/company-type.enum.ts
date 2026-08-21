/**
 * The suggested company types, offered first wherever one is picked.
 *
 * Deliberately **not** a database enum or a validation constraint:
 * `Company.companyType` is varchar and accepts any short label, because the
 * list below does not cover every employer that uses the platform. Treat these
 * as the common cases, not the allowed ones.
 */
export enum ECompanyType {
  STARTUP = 'startup',
  SME = 'sme',
  ENTERPRISE = 'enterprise',
  NGO = 'ngo',
  GOVERNMENT = 'government',
}

/** Max stored length, matching the `companyType` column. */
export const COMPANY_TYPE_MAX_LENGTH = 50;
