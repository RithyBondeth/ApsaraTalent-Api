export type TAiQuotaAction = 'cvGeneration';

export interface IAiQuotaBucket {
  used: number;
  limit: number;
  remaining: number;
}

export interface IAiQuotaUsage {
  daily: IAiQuotaBucket;
  actions: Record<TAiQuotaAction, IAiQuotaBucket>;
  resetsAt: string;
}
