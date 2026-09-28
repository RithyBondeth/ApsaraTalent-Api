import { CallSessionService } from './call-session.service';

describe('CallSessionService', () => {
  let sessions: CallSessionService;

  beforeEach(() => {
    jest.restoreAllMocks();
    sessions = new CallSessionService();
  });

  it('allows only the receiver to answer the offered call', () => {
    expect(
      sessions.register('call-1', 'caller', 'receiver', 'caller-socket'),
    ).toBe(true);
    expect(
      sessions.answer('call-1', 'attacker', 'caller', 'attacker-socket'),
    ).toBe(false);
    expect(
      sessions.answer('call-1', 'receiver', 'attacker', 'receiver-socket'),
    ).toBe(false);
    expect(
      sessions.answer('call-1', 'receiver', 'caller', 'receiver-socket'),
    ).toBe(true);
    expect(
      sessions.answer('call-1', 'receiver', 'caller', 'receiver-socket'),
    ).toBe(false);
  });

  it('allows ICE only between the two registered participants', () => {
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    expect(sessions.canSignal('call-1', 'caller', 'receiver')).toBe(true);
    expect(sessions.canSignal('call-1', 'receiver', 'caller')).toBe(true);
    expect(sessions.canSignal('call-1', 'attacker', 'receiver')).toBe(false);
    expect(sessions.canSignal('call-1', 'caller', 'attacker')).toBe(false);
  });

  it('permits only the receiver to decline a ringing call', () => {
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    expect(sessions.decline('call-1', 'caller', 'receiver')).toBe(false);
    expect(sessions.decline('call-1', 'receiver', 'caller')).toBe(true);
    expect(sessions.canSignal('call-1', 'caller', 'receiver')).toBe(false);
  });

  it('ends once, in either valid participant direction', () => {
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    expect(sessions.end('call-1', 'receiver', 'caller')).toBe(true);
    expect(sessions.end('call-1', 'caller', 'receiver')).toBe(false);
  });

  it('prevents duplicate call IDs and concurrent calls for either user', () => {
    expect(sessions.register('call-1', 'caller', 'receiver', 'socket-1')).toBe(
      true,
    );
    expect(sessions.register('call-1', 'other-1', 'other-2', 'socket-2')).toBe(
      false,
    );
    expect(sessions.register('call-2', 'caller', 'other-2', 'socket-2')).toBe(
      false,
    );
    expect(sessions.register('call-3', 'other-1', 'receiver', 'socket-3')).toBe(
      false,
    );
    expect(sessions.register('call-4', 'same', 'same', 'socket-4')).toBe(false);
  });

  it('expires abandoned ringing sessions and releases both users', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    jest.spyOn(Date, 'now').mockReturnValue(121_001);

    expect(sessions.canSignal('call-1', 'caller', 'receiver')).toBe(false);
    expect(
      sessions.register('call-2', 'caller', 'receiver', 'caller-socket'),
    ).toBe(true);
  });

  it('keeps answered calls longer than unanswered calls', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    sessions.answer('call-1', 'receiver', 'caller', 'receiver-socket');
    jest.spyOn(Date, 'now').mockReturnValue(121_001);

    expect(sessions.canSignal('call-1', 'caller', 'receiver')).toBe(true);
  });

  it('removes a session when either bound signaling socket disconnects', () => {
    sessions.register('call-1', 'caller', 'receiver', 'caller-socket');
    sessions.answer('call-1', 'receiver', 'caller', 'receiver-socket');

    expect(sessions.disconnect('unrelated-socket')).toEqual([]);
    expect(sessions.disconnect('receiver-socket')).toEqual([
      expect.objectContaining({
        disconnectedUserId: 'receiver',
        peerId: 'caller',
      }),
    ]);
    expect(sessions.canSignal('call-1', 'caller', 'receiver')).toBe(false);
  });
});
