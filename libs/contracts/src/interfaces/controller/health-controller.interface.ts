import { HealthCheckResult } from '@nestjs/terminus';
import { LivenessResponseDTO } from '@app/contracts/dtos/health';

export interface IHealthController {
  checkHealth(): LivenessResponseDTO;
  checkReadiness(): Promise<HealthCheckResult>;
  checkLiveness(): LivenessResponseDTO;
}

export interface IHealthRpcController {
  checkHealth(): Promise<HealthCheckResult>;
}
