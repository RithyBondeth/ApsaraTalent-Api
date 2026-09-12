/**
 * Lifecycle of a single outbox row.
 *
 * PROCESSING is not a terminal claim: a worker that dies mid-dispatch leaves
 * the row here, and it becomes claimable again once its visibility timeout
 * lapses. The dispatcher therefore selects PENDING *and* PROCESSING rows whose
 * `availableAt` has passed — see `OutboxService.claimBatch`.
 */
export enum EOutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}
