import { LandingStatsResponseDTO } from '@app/contracts/dtos/user';

export interface IPublicUserController {
  getLandingStats(): Promise<LandingStatsResponseDTO>;
}
