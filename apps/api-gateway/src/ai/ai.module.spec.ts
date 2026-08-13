import 'reflect-metadata';
import { AiModule } from './ai.module';
import { AiQuotaController } from './ai-quota.controller';
import { AiStreamService } from './ai-stream.service';
import { SocketModule } from '../shared/socket/socket.module';
import { SocketBroadcastService } from '../shared/socket/socket-broadcast.service';

/**
 * AiStreamService and SocketBroadcastService are consumed from other feature
 * modules (resume-builder, job, chat) without those modules importing them, so
 * both providers depend on being exported from a @Global module. Dropping
 * @Global or the export would only fail at runtime, on the first request that
 * reaches one of those controllers — hence this metadata check.
 */
describe('gateway shared infrastructure modules', () => {
  const meta = (mod: unknown, key: string): unknown[] =>
    (Reflect.getMetadata(key, mod as object) as unknown[]) ?? [];
  const isGlobal = (mod: unknown): boolean =>
    Reflect.getMetadata('__module:global__', mod as object) === true;

  it.each([
    ['AiModule', AiModule, AiStreamService],
    ['SocketModule', SocketModule, SocketBroadcastService],
  ])('%s globally provides and exports its shared service', (_n, mod, svc) => {
    expect(meta(mod, 'providers')).toContain(svc);
    expect(meta(mod, 'exports')).toContain(svc);
    expect(isGlobal(mod)).toBe(true);
  });

  it('keeps the AI quota endpoint registered after the ai-stream merge', () => {
    expect(meta(AiModule, 'controllers')).toContain(AiQuotaController);
  });
});
