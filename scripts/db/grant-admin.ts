/**
 * Grant or revoke the ADMIN role on a user account.
 *
 * `EUserRole.ADMIN` has always existed and `AdminGuard` has always checked for
 * it, but no code path ever assigned it: registration only ever produces
 * EMPLOYEE, COMPANY or NONE. That left every admin-guarded endpoint reachable
 * by nobody at all. This script is the missing path, and it is deliberately a
 * script rather than an endpoint — promoting an account is a privileged act
 * that should leave a trace in someone's shell history, not sit behind a
 * button that a compromised admin session could press.
 *
 * Usage:
 *   npm run admin:grant -- --email a@b.com                    # dry run
 *   npm run admin:grant -- --email a@b.com --apply            # promote existing
 *   ADMIN_PASSWORD='…' npm run admin:grant -- --email a@b.com --create --apply
 *   npm run admin:grant -- --email a@b.com --revoke --apply   # back to their profile role
 *   npm run admin:grant -- --list                             # who is an admin today
 *
 * Dry run is the default, matching db:bootstrap-local and migration:baseline:
 * these commands read DATABASE_URL, and DATABASE_URL is very often not the
 * database you meant.
 *
 * --revoke restores the role implied by the account's own profile rows
 * (employee -> EMPLOYEE, company -> COMPANY, neither -> NONE) rather than
 * remembering a previous value, so it is correct however the account got here.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from '@app/common/database/config/database.config';
import { User } from '@app/common/database/entities/user.entity';
import { EUserRole } from '@app/common/database/enums/user-role.enum';

/* ---------------------------------- Args ---------------------------------- */
type Options = {
  email: string | null;
  apply: boolean;
  create: boolean;
  revoke: boolean;
  list: boolean;
};

function parseArgs(argv: string[]): Options {
  const valueOf = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    if (index === -1) return null;
    const value = argv[index + 1];
    return value && !value.startsWith('--') ? value : null;
  };

  return {
    email: valueOf('--email')?.trim().toLowerCase() ?? null,
    apply: argv.includes('--apply'),
    create: argv.includes('--create'),
    revoke: argv.includes('--revoke'),
    list: argv.includes('--list'),
  };
}

/* --------------------------------- Helpers -------------------------------- */
function describeTarget(url: string): string {
  const target = new URL(url);
  return `${target.host}${target.pathname}  (user: ${target.username})`;
}

/**
 * The role an account should hold when it is not an admin. Derived from the
 * profile rows rather than stored, so it stays right no matter how the account
 * was created.
 */
function roleFromProfile(user: User): EUserRole {
  if (user.employee) return EUserRole.EMPLOYEE;
  if (user.company) return EUserRole.COMPANY;
  return EUserRole.NONE;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set — refusing to run.');
  }
  if (!options.list && !options.email) {
    throw new Error(
      'Pass --email <address>, or --list to see the current admins.',
    );
  }
  if (options.create && options.revoke) {
    throw new Error('--create and --revoke are mutually exclusive.');
  }

  console.log(`\nTarget database: ${describeTarget(url)}`);
  console.log(
    options.apply ? 'Mode: APPLY\n' : 'Mode: DRY RUN (pass --apply to write)\n',
  );

  // The whole entity list, taken from the Nest database config the same way
  // db:bootstrap-local does. A hand-picked [User, Employee, Company] looks
  // sufficient and is not: TypeORM resolves the entire relation graph at
  // metadata build time, so loading a User with its employee relation fails
  // with "Entity metadata for Employee#skills was not found".
  const config = await databaseConfig({
    get: (key: string) =>
      key === 'database.url'
        ? url
        : key === 'database.synchronize'
          ? false
          : undefined,
  } as never);

  const dataSource = new DataSource({
    ...config,
    synchronize: false,
    logging: ['error'],
  });

  await dataSource.initialize();

  try {
    const userRepo = dataSource.getRepository(User);

    if (options.list) {
      const admins = await userRepo.find({
        where: { role: EUserRole.ADMIN },
        select: { id: true, email: true, lastLoginAt: true },
        order: { createdAt: 'ASC' },
      });
      if (admins.length === 0) {
        console.log('No admin accounts exist.');
      } else {
        console.log(`${admins.length} admin account(s):`);
        for (const admin of admins) {
          const seen = admin.lastLoginAt
            ? admin.lastLoginAt.toISOString()
            : 'never signed in';
          console.log(`  ${admin.email ?? '(no email)'}  ${admin.id}  ${seen}`);
        }
      }
      if (!options.email) return;
    }

    const email = options.email as string;
    const existing = await userRepo.findOne({
      where: { email },
      relations: ['employee', 'company'],
    });

    /* ------------------------------- Create -------------------------------- */
    if (!existing) {
      if (!options.create) {
        throw new Error(
          `No account with email ${email}. Pass --create to make one, ` +
            'with ADMIN_PASSWORD set in the environment.',
        );
      }

      const password = process.env.ADMIN_PASSWORD;
      if (!password || password.length < 12) {
        throw new Error(
          'Set ADMIN_PASSWORD (at least 12 characters) in the environment. ' +
            'It is read from the environment rather than a flag so the ' +
            'password does not land in shell history.',
        );
      }

      console.log(
        `Would create ${email} as ADMIN (no employee/company profile).`,
      );
      if (!options.apply) return;

      // isEmailVerified: an admin created here has no mailbox round-trip to
      // complete, and login rejects unverified email identifiers.
      // profileCompleted: there is no admin onboarding flow to send them to.
      const created = userRepo.create({
        email,
        password,
        role: EUserRole.ADMIN,
        isEmailVerified: true,
        profileCompleted: true,
      });
      const saved = await userRepo.save(created);
      console.log(`Created admin ${email} (${saved.id}).`);
      return;
    }

    /* ------------------------------- Revoke -------------------------------- */
    if (options.revoke) {
      const restored = roleFromProfile(existing);
      if (existing.role !== EUserRole.ADMIN) {
        console.log(
          `${email} is not an admin (role: ${existing.role}). Nothing to do.`,
        );
        return;
      }
      console.log(`Would set ${email} from admin back to ${restored}.`);
      if (!options.apply) return;

      await userRepo.update({ id: existing.id }, { role: restored });
      console.log(`Revoked admin from ${email} (now ${restored}).`);
      return;
    }

    /* -------------------------------- Grant -------------------------------- */
    if (existing.role === EUserRole.ADMIN) {
      console.log(`${email} is already an admin. Nothing to do.`);
      return;
    }

    if (existing.employee || existing.company) {
      console.log(
        `WARNING: ${email} still has a ${existing.employee ? 'employee' : 'company'} ` +
          'profile. It is kept, but the signed-in app routes on role, so this ' +
          'account will land in the admin panel rather than its own profile. ' +
          'Prefer a dedicated admin account created with --create.',
      );
    }

    console.log(`Would promote ${email} from ${existing.role} to admin.`);
    if (!options.apply) return;

    // update(), not save(): save() runs the entity's BeforeUpdate hook over a
    // fully-hydrated row, and a partial select would blank columns it did not
    // load. A targeted UPDATE touches one column and nothing else.
    await userRepo.update({ id: existing.id }, { role: EUserRole.ADMIN });
    console.log(`Promoted ${email} (${existing.id}) to admin.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(`\n${(error as Error).message}\n`);
  process.exit(1);
});
