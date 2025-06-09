import { Injectable } from '@nestjs/common';

@Injectable()
export class JobServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
