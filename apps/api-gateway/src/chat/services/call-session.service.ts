import { Injectable } from '@nestjs/common';

export type CallSessionState = 'ringing' | 'active';

export interface CallSession {
  callId: string;
  callerId: string;
  receiverId: string;
  state: CallSessionState;
  expiresAt: number;
  callerSocketId: string;
  receiverSocketId?: string;
}

export interface DisconnectedCall {
  session: CallSession;
  disconnectedUserId: string;
  peerId: string;
}

/**
 * Authoritative signaling state for this gateway process. Socket rooms identify
 * where to deliver an event; they do not prove that its sender belongs to the
 * call. Sessions expire lazily so abandoned calls cannot keep users busy.
 */
@Injectable()
export class CallSessionService {
  private static readonly RINGING_TTL_MS = 2 * 60 * 1000;
  private static readonly ACTIVE_TTL_MS = 4 * 60 * 60 * 1000;

  private readonly sessions = new Map<string, CallSession>();
  private readonly callByUser = new Map<string, string>();

  register(
    callId: string,
    callerId: string,
    receiverId: string,
    callerSocketId: string,
  ): boolean {
    this.prune();
    if (
      callerId === receiverId ||
      this.sessions.has(callId) ||
      this.callByUser.has(callerId) ||
      this.callByUser.has(receiverId)
    ) {
      return false;
    }

    const session: CallSession = {
      callId,
      callerId,
      receiverId,
      state: 'ringing',
      expiresAt: Date.now() + CallSessionService.RINGING_TTL_MS,
      callerSocketId,
    };
    this.sessions.set(callId, session);
    this.callByUser.set(callerId, callId);
    this.callByUser.set(receiverId, callId);
    return true;
  }

  answer(
    callId: string,
    receiverId: string,
    callerId: string,
    receiverSocketId: string,
  ): boolean {
    const session = this.get(callId);
    if (
      !session ||
      session.state !== 'ringing' ||
      session.receiverId !== receiverId ||
      session.callerId !== callerId
    ) {
      return false;
    }
    session.state = 'active';
    session.expiresAt = Date.now() + CallSessionService.ACTIVE_TTL_MS;
    session.receiverSocketId = receiverSocketId;
    return true;
  }

  canSignal(callId: string, senderId: string, targetId: string): boolean {
    const session = this.get(callId);
    if (!session) return false;
    const validDirection =
      (session.callerId === senderId && session.receiverId === targetId) ||
      (session.receiverId === senderId && session.callerId === targetId);
    if (!validDirection) return false;

    const ttl =
      session.state === 'active'
        ? CallSessionService.ACTIVE_TTL_MS
        : CallSessionService.RINGING_TTL_MS;
    session.expiresAt = Date.now() + ttl;
    return true;
  }

  decline(callId: string, receiverId: string, callerId: string): boolean {
    const session = this.get(callId);
    if (
      !session ||
      session.state !== 'ringing' ||
      session.receiverId !== receiverId ||
      session.callerId !== callerId
    ) {
      return false;
    }
    this.remove(session);
    return true;
  }

  end(callId: string, senderId: string, targetId: string): boolean {
    const session = this.get(callId);
    if (!session) return false;
    const validDirection =
      (session.callerId === senderId && session.receiverId === targetId) ||
      (session.receiverId === senderId && session.callerId === targetId);
    if (!validDirection) return false;
    this.remove(session);
    return true;
  }

  cancel(callId: string): void {
    const session = this.sessions.get(callId);
    if (session) this.remove(session);
  }

  disconnect(socketId: string): DisconnectedCall[] {
    this.prune();
    const disconnected: DisconnectedCall[] = [];
    for (const session of this.sessions.values()) {
      if (session.callerSocketId === socketId) {
        disconnected.push({
          session: { ...session },
          disconnectedUserId: session.callerId,
          peerId: session.receiverId,
        });
        this.remove(session);
      } else if (session.receiverSocketId === socketId) {
        disconnected.push({
          session: { ...session },
          disconnectedUserId: session.receiverId,
          peerId: session.callerId,
        });
        this.remove(session);
      }
    }
    return disconnected;
  }

  private get(callId: string): CallSession | undefined {
    this.prune();
    return this.sessions.get(callId);
  }

  private prune(): void {
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (session.expiresAt <= now) this.remove(session);
    }
  }

  private remove(session: CallSession): void {
    this.sessions.delete(session.callId);
    if (this.callByUser.get(session.callerId) === session.callId)
      this.callByUser.delete(session.callerId);
    if (this.callByUser.get(session.receiverId) === session.callId)
      this.callByUser.delete(session.receiverId);
  }
}
