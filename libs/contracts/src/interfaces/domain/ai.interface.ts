export interface IAiQuotaUsage {
  daily: { used: number; limit: number; remaining: number };
  resetsAt: string;
}
