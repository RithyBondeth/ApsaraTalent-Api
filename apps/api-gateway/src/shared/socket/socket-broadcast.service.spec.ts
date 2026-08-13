import { SocketBroadcastService } from './socket-broadcast.service';

describe('SocketBroadcastService', () => {
  it('does nothing before initialization or for an empty user id', () => {
    const service = new SocketBroadcastService();
    expect(() => service.emitToUser('user-1', 'event', {})).not.toThrow();
    const server = { to: jest.fn() };
    service.setServer(server as any);
    service.emitToUser('', 'event', {});
    expect(server.to).not.toHaveBeenCalled();
  });

  it('emits only to the requested user room', () => {
    const emit = jest.fn();
    const server = { to: jest.fn().mockReturnValue({ emit }) };
    const service = new SocketBroadcastService();
    service.setServer(server as any);
    service.emitToUser('user-1', 'notification', { id: 'n-1' });
    expect(server.to).toHaveBeenCalledWith('user-1');
    expect(emit).toHaveBeenCalledWith('notification', { id: 'n-1' });
  });
});
