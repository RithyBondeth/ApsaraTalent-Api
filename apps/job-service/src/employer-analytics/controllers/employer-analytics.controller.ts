import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  EmployerAnalyticsResponseDTO,
  I_EMPLOYER_ANALYTICS_SERVICE,
  IEmployerAnalyticsService,
} from '@app/contracts';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class EmployerAnalyticsController {
  constructor(
    @Inject(I_EMPLOYER_ANALYTICS_SERVICE)
    private readonly service: IEmployerAnalyticsService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_EMPLOYER_ANALYTICS)
  getEmployerAnalytics(
    @Payload('companyId') companyId: string,
  ): Promise<EmployerAnalyticsResponseDTO> {
    return this.service.getAnalytics(companyId);
  }
}
