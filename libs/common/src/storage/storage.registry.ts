import { Logger } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * A static handle on the StorageService.
 *
 * Multer storage engines are constructed at decoration time — `new
 * UploadFileInterceptor(...)` runs while the class is being defined, long
 * before Nest has an injector — so they cannot receive StorageService through
 * normal DI. StorageModule publishes the instance here at boot and the engines
 * read it at request time, by which point it is always populated.
 *
 * Deliberately narrow: this is not a general-purpose service locator, and
 * nothing else should use it. Anything that *can* inject StorageService must.
 */
export class StorageRegistry {
  private static instance: StorageService | null = null;
  private static readonly logger = new Logger(StorageRegistry.name);

  static set(service: StorageService): void {
    this.instance = service;
  }

  static get(): StorageService {
    if (!this.instance) {
      // Reaching this means an upload was handled before StorageModule
      // initialized, which is a wiring bug rather than a runtime condition.
      this.logger.error(
        'StorageService requested before StorageModule was initialised.',
      );
      throw new Error('Storage is not initialised');
    }
    return this.instance;
  }

  /** True once StorageModule has booted. Used to pick an engine safely. */
  static isReady(): boolean {
    return this.instance !== null;
  }

  /** Test-only. */
  static reset(): void {
    this.instance = null;
  }
}
