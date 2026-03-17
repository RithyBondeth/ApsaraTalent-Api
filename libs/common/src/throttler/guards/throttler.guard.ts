<<<<<<< HEAD
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard as NestThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        return req.ip;
    }
}
=======
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip;
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
