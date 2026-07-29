import { StorageRegistry } from './storage.registry';

describe('StorageRegistry', () => {
  beforeEach(() => StorageRegistry.reset());
  afterAll(() => StorageRegistry.reset());

  it('reports readiness and returns the registered storage service', () => {
    const storage = { driverName: 'local' };
    expect(StorageRegistry.isReady()).toBe(false);
    StorageRegistry.set(storage as any);
    expect(StorageRegistry.isReady()).toBe(true);
    expect(StorageRegistry.get()).toBe(storage);
  });

  it('fails clearly when upload storage is requested before initialization', () => {
    expect(() => StorageRegistry.get()).toThrow('Storage is not initialised');
  });
});
