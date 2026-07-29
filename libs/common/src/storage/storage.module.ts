import { Global, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import { STORAGE_DRIVER, StorageDriver } from './storage-driver.interface';
import { StorageRegistry } from './storage.registry';
import { StorageService } from './storage.service';

/**
 * Global so that any service can inject StorageService without each module
 * re-importing it — the same treatment RedisModule already gets.
 *
 * The driver is chosen once at boot from STORAGE_DRIVER. Anything other than
 * 's3' resolves to the local filesystem driver, which keeps the default
 * behaviour identical to before this module existed.
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): StorageDriver => {
        const logger = new Logger('StorageModule');
        const driver = configService.get<string>('storage.driver');

        if (driver !== 's3') {
          logger.log('Storage driver: local (filesystem)');
          return new LocalStorageDriver();
        }

        const bucket = configService.get<string>('storage.s3.bucket');
        const region = configService.get<string>('storage.s3.region');
        const accessKeyId = configService.get<string>('storage.s3.accessKeyId');
        const secretAccessKey = configService.get<string>(
          'storage.s3.secretAccessKey',
        );

        // Joi validation already enforces these when STORAGE_DRIVER=s3. This is
        // a second line of defence: silently falling back to local storage here
        // would write uploads to an ephemeral container disk and look fine
        // until the next redeploy loses them.
        if (!bucket || !region || !accessKeyId || !secretAccessKey) {
          throw new Error(
            'STORAGE_DRIVER=s3 but S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not all set.',
          );
        }

        const endpoint = configService.get<string>('storage.s3.endpoint');
        logger.log(
          `Storage driver: s3 (bucket=${bucket}, endpoint=${endpoint ?? 'aws-default'})`,
        );

        return new S3StorageDriver({
          bucket,
          region,
          accessKeyId,
          secretAccessKey,
          endpoint,
          forcePathStyle: configService.get<boolean>(
            'storage.s3.forcePathStyle',
          ),
          publicBaseUrl: configService.get<string>('storage.s3.publicBaseUrl'),
          signedUrlExpirySeconds: configService.get<number>(
            'storage.s3.signedUrlExpirySeconds',
          ),
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_DRIVER],
})
export class StorageModule implements OnModuleInit {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Publish the instance for multer engines, which are built at decoration time
   * and so cannot be injected into. See StorageRegistry.
   */
  onModuleInit(): void {
    StorageRegistry.set(this.storageService);
  }
}
