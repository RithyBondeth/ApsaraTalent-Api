import 'reflect-metadata';
import { CHAT_WEBSOCKET_EVENTS } from '@app/contracts';
import { CallGateway } from './call.gateway';

describe('CallGateway', () => {
  const notifications = {
    getCallerProfile: jest.fn(),
    emitCallLogMessage: jest.fn(),
    resolveCallEndContent: jest.fn(),
  };
  const gateway = new CallGateway(notifications as any);
  const roomEmit = jest.fn();
  const server = { to: jest.fn(() => ({ emit: roomEmit })) } as any;

  function client(userId?: string) {
    return { data: { userId }, emit: jest.fn() } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    gateway.server = server;
    notifications.getCallerProfile.mockResolvedValue({
      name: 'Sok',
      avatar: 'a.png',
    });
    notifications.resolveCallEndContent.mockReturnValue('Call ended');
  });

  it('rejects unauthorized and malformed call offers', async () => {
    const anonymous = client();
    await expect(
      gateway.handleCallOffer(anonymous, {} as any),
    ).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(anonymous.emit).toHaveBeenCalledWith('error', {
      message: 'Unauthorized',
    });

    const authenticated = client('caller');
    await gateway.handleCallOffer(authenticated, {} as any);
    expect(authenticated.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid call offer payload',
    });
  });

  it('forwards a valid offer with the authenticated caller identity', async () => {
    const result = await gateway.handleCallOffer(client('caller'), {
      callId: 'call-1',
      receiverId: 'receiver',
      offer: { type: 'offer', sdp: 'sdp' },
    } as any);
    expect(server.to).toHaveBeenCalledWith('receiver');
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.INCOMING_CALL,
      expect.objectContaining({ callerId: 'caller', callerName: 'Sok' }),
    );
    expect(result.success).toBe(true);
  });

  it('forwards answers and ICE candidates only with valid payloads', async () => {
    await gateway.handleCallAnswer(client('receiver'), {
      callId: 'call-1',
      callerId: 'caller',
      answer: { type: 'answer', sdp: 'sdp' },
    } as any);
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.CALL_ANSWERED,
      expect.objectContaining({ callId: 'call-1' }),
    );

    await gateway.handleIceCandidate(client('caller'), {
      callId: 'call-1',
      targetUserId: 'receiver',
      candidate: { candidate: 'ice' },
    } as any);
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.REMOTE_ICE_CANDIDATE,
      expect.objectContaining({ callId: 'call-1' }),
    );
  });

  it('records a declined call after notifying the caller', async () => {
    const result = await gateway.handleCallDecline(client('receiver'), {
      callId: 'call-1',
      callerId: 'caller',
    });
    expect(roomEmit).toHaveBeenCalledWith(CHAT_WEBSOCKET_EVENTS.CALL_DECLINED, {
      callId: 'call-1',
    });
    expect(notifications.emitCallLogMessage).toHaveBeenCalledWith(server, {
      senderId: 'receiver',
      receiverId: 'caller',
      content: 'Call declined',
    });
    expect(result.success).toBe(true);
  });

  it('maps and records call-end reasons', async () => {
    await gateway.handleCallEnd(client('caller'), {
      callId: 'call-1',
      targetUserId: 'receiver',
      reason: 'missed',
    });
    expect(notifications.resolveCallEndContent).toHaveBeenCalledWith('missed');
    expect(notifications.emitCallLogMessage).toHaveBeenCalledWith(server, {
      senderId: 'caller',
      receiverId: 'receiver',
      content: 'Call ended',
    });
  });

  it.each([
    ['handleCallAnswer', 'Invalid call answer payload'],
    ['handleIceCandidate', 'Invalid ICE candidate payload'],
    ['handleCallDecline', 'Invalid call decline payload'],
    ['handleCallEnd', 'Invalid call end payload'],
  ])(
    'rejects unauthorized and malformed payloads in %s',
    async (method, message) => {
      const anonymous = client();
      await expect((gateway as any)[method](anonymous, {})).resolves.toEqual(
        expect.objectContaining({ success: false }),
      );
      expect(anonymous.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized',
      });

      const authenticated = client('user-1');
      await expect(
        (gateway as any)[method](authenticated, {}),
      ).resolves.toEqual(expect.objectContaining({ success: false }));
      expect(authenticated.emit).toHaveBeenCalledWith('error', { message });
    },
  );
});
