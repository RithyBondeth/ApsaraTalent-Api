import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

/**
 * The platform's core rule — you can only talk to someone who has agreed to
 * talk to you — enforced on the server.
 *
 * It was previously a UI convention only: the web app surfaces chat from the
 * match list, but `POST /chat/initiate` and the `sendMessage` socket event both
 * accepted any authenticated user and any receiver id. Anyone who read the
 * network tab could message anyone on the platform.
 *
 * A match is the only thing checked, so both routes into one — a mutual swipe,
 * or an application the company shortlisted — unlock the conversation
 * identically.
 */
@Injectable()
export class ChatMatchGuardService {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  async areMatched(userIdA: string, userIdB: string): Promise<boolean> {
    if (!userIdA || !userIdB) return false;
    const result = await rpcCall<{ matched: boolean }>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.ARE_USERS_MATCHED,
      { userIdA, userIdB },
    );
    return result?.matched === true;
  }

  /**
   * Throws unless the two are matched. Used on the HTTP path, where a
   * `ForbiddenException` becomes the response; the socket path calls
   * `areMatched` directly and emits an error frame instead, because throwing
   * inside a socket handler would disconnect the client rather than tell them
   * why.
   */
  async assertMatched(userIdA: string, userIdB: string): Promise<void> {
    if (await this.areMatched(userIdA, userIdB)) return;
    throw new ForbiddenException(
      'You can only message someone you have matched with.',
    );
  }
}
