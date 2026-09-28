import 'reflect-metadata';
import {
  CHAT_ALLOW_ALL_CORS,
  CHAT_ALLOWED_ORIGINS,
  CHAT_WEBSOCKET_EVENTS,
} from '@app/contracts';
import { GATEWAY_OPTIONS } from '@nestjs/websockets/constants';
import { CallGateway } from './call.gateway';
import { CallSessionService } from '../services/call-session.service';

describe('CallGateway', () => {
  const notifications = {
    getCallerProfile: jest.fn(),
    emitCallLogMessage: jest.fn(),
    resolveCallEndContent: jest.fn(),
  };
  const matchGuard = { areMatched: jest.fn() };
  let sessions: CallSessionService;
  let gateway: CallGateway;
  const roomEmit = jest.fn();
  const server = { to: jest.fn(() => ({ emit: roomEmit })) } as any;

  function client(userId?: string) {
    return {
      id: userId ? `socket-${userId}` : 'socket-anonymous',
      data: { userId },
      emit: jest.fn(),
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    sessions = new CallSessionService();
    gateway = new CallGateway(
      notifications as any,
      matchGuard as any,
      sessions,
    );
    gateway.server = server;
    notifications.getCallerProfile.mockResolvedValue({
      name: 'Sok',
      avatar: 'a.png',
    });
    notifications.resolveCallEndContent.mockReturnValue('Call ended');
    matchGuard.areMatched.mockResolvedValue(true);
  });

  it('applies the configured signaling CORS policy', () => {
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, CallGateway);
    const headerless = jest.fn();
    options.cors.origin(undefined, headerless);
    expect(headerless).toHaveBeenCalledWith(null, true);

    const untrusted = jest.fn();
    options.cors.origin('https://untrusted.example', untrusted);
    if (CHAT_ALLOW_ALL_CORS || CHAT_ALLOWED_ORIGINS.length === 0) {
      expect(untrusted).toHaveBeenCalledWith(null, true);
    } else {
      expect(untrusted).toHaveBeenCalledWith(expect.any(Error), false);
    }
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

  it('refuses a call offer when the users are not matched', async () => {
    matchGuard.areMatched.mockResolvedValue(false);
    const socket = client('caller');

    const result = await gateway.handleCallOffer(socket, {
      callId: 'call-1',
      receiverId: 'receiver',
      offer: { type: 'offer', sdp: 'sdp' },
    } as any);

    expect(matchGuard.areMatched).toHaveBeenCalledWith('caller', 'receiver');
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'You can only call someone you have matched with.',
    });
    expect(server.to).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('forwards answers and ICE candidates only with valid payloads', async () => {
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
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
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
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
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
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

  it.each([
    [{ receiverId: 'receiver', offer: { type: 'offer' } }, 'callId'],
    [{ callId: 'call-1', offer: { type: 'offer' } }, 'receiverId'],
    [{ callId: 'call-1', receiverId: 'receiver' }, 'offer'],
  ])('rejects call offers missing %s', async (payload, missingField) => {
    expect(missingField).toBeTruthy();
    const socket = client('caller');
    await expect(
      gateway.handleCallOffer(socket, payload as any),
    ).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(server.to).not.toHaveBeenCalled();
  });

  it.each([
    ['handleCallAnswer', { callerId: 'caller', answer: {} }],
    ['handleCallAnswer', { callId: 'call-1', answer: {} }],
    ['handleCallAnswer', { callId: 'call-1', callerId: 'caller' }],
    ['handleIceCandidate', { targetUserId: 'receiver', candidate: {} }],
    ['handleIceCandidate', { callId: 'call-1', candidate: {} }],
    ['handleIceCandidate', { callId: 'call-1', targetUserId: 'receiver' }],
  ])('rejects partial signaling payloads in %s', async (method, payload) => {
    await expect(
      (gateway as any)[method](client('user-1'), payload),
    ).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(server.to).not.toHaveBeenCalled();
  });

  it('does not emit an incoming call when caller-profile lookup fails', async () => {
    notifications.getCallerProfile.mockRejectedValueOnce(
      new Error('profile unavailable'),
    );
    await expect(
      gateway.handleCallOffer(client('caller'), {
        callId: 'call-1',
        receiverId: 'receiver',
        offer: { type: 'offer', sdp: 'sdp' },
      } as any),
    ).rejects.toThrow('profile unavailable');
    expect(server.to).not.toHaveBeenCalled();

    notifications.getCallerProfile.mockResolvedValueOnce({
      name: 'Sok',
      avatar: 'a.png',
    });
    await expect(
      gateway.handleCallOffer(client('caller'), {
        callId: 'call-2',
        receiverId: 'receiver',
        offer: { type: 'offer', sdp: 'sdp' },
      } as any),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
  });

  it('surfaces call-log persistence failures after notifying the peer', async () => {
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
    notifications.emitCallLogMessage.mockRejectedValueOnce(
      new Error('chat persistence unavailable'),
    );
    await expect(
      gateway.handleCallDecline(client('receiver'), {
        callId: 'call-1',
        callerId: 'caller',
      }),
    ).rejects.toThrow('chat persistence unavailable');
    expect(roomEmit).toHaveBeenCalledWith(CHAT_WEBSOCKET_EVENTS.CALL_DECLINED, {
      callId: 'call-1',
    });
  });

  it('rejects forged signaling and does not create a call log', async () => {
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
    const attacker = client('attacker');

    const ice = await gateway.handleIceCandidate(attacker, {
      callId: 'call-1',
      targetUserId: 'receiver',
      candidate: { candidate: 'ice' },
    } as any);
    const ended = await gateway.handleCallEnd(attacker, {
      callId: 'call-1',
      targetUserId: 'receiver',
      reason: 'ended',
    });

    expect(ice.success).toBe(false);
    expect(ended.success).toBe(false);
    expect(attacker.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid or expired call session.',
    });
    expect(server.to).not.toHaveBeenCalled();
    expect(notifications.emitCallLogMessage).not.toHaveBeenCalled();
  });

  it('rejects an answer from anyone except the offered receiver', async () => {
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
    const attacker = client('attacker');

    const result = await gateway.handleCallAnswer(attacker, {
      callId: 'call-1',
      callerId: 'caller',
      answer: { type: 'answer', sdp: 'sdp' },
    } as any);

    expect(result.success).toBe(false);
    expect(server.to).not.toHaveBeenCalled();
  });

  it('rejects concurrent calls involving an already busy participant', async () => {
    await gateway.handleCallOffer(client('caller'), {
      callId: 'call-1',
      receiverId: 'receiver',
      offer: { type: 'offer', sdp: 'sdp' },
    } as any);
    jest.clearAllMocks();
    matchGuard.areMatched.mockResolvedValue(true);

    const busyCaller = client('other-caller');
    const result = await gateway.handleCallOffer(busyCaller, {
      callId: 'call-2',
      receiverId: 'receiver',
      offer: { type: 'offer', sdp: 'sdp' },
    } as any);

    expect(result.success).toBe(false);
    expect(busyCaller.emit).toHaveBeenCalledWith('error', {
      message: 'One of the participants is already in a call.',
    });
    expect(server.to).not.toHaveBeenCalled();
  });

  it('releases a call and notifies its peer when a signaling socket disconnects', async () => {
    sessions.register('call-1', 'caller', 'receiver', 'socket-caller');
    sessions.answer('call-1', 'receiver', 'caller', 'socket-receiver');

    await gateway.handleDisconnect(client('receiver'));

    expect(server.to).toHaveBeenCalledWith('caller');
    expect(roomEmit).toHaveBeenCalledWith(CHAT_WEBSOCKET_EVENTS.CALL_ENDED, {
      callId: 'call-1',
      reason: 'disconnected',
    });
    expect(notifications.emitCallLogMessage).toHaveBeenCalledWith(server, {
      senderId: 'receiver',
      receiverId: 'caller',
      content: 'Call ended',
    });
    expect(
      sessions.register('call-2', 'caller', 'receiver', 'new-socket'),
    ).toBe(true);
  });
});
