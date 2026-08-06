import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Audit trail of authentication attempts, successful and failed.
 *
 * Written by the API gateway rather than auth-service: the gateway is the only
 * process that sees the HTTP request, so it is the only place the client IP and
 * user agent exist. Recording is best-effort and must never block or fail a
 * login.
 *
 * CONTAINS PERSONAL DATA (ip address, user agent). Rows older than 90 days are
 * deleted by LoginHistoryCleanupService — do not remove that job without
 * deciding on a retention policy first.
 */
@Entity()
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Null when the attempt failed before a user could be identified (unknown
   * email), which is exactly the case worth investigating.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  /** The identifier that was submitted, kept even when no user matched. */
  @Index()
  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  /** Length allows for IPv6 and comma-joined X-Forwarded-For chains. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @Column({ type: 'boolean' })
  success: boolean;

  /** Short machine-ish reason on failure ("invalid_credentials"), null on success. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  failureReason: string | null;

  /** Indexed: every query here is "recent activity" or "activity for a user". */
  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
