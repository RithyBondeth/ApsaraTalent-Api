import { HealthCheckResult } from '@nestjs/terminus';
import { LivenessResponseDTO } from '@app/contracts/dtos/health';

export interface IHealthController {
  checkHealth(): Promise<HealthCheckResult>;
  checkReadiness(): Promise<HealthCheckResult>;
  checkLiveness(): LivenessResponseDTO;
}
