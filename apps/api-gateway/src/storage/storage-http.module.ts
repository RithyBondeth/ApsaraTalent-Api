import { Module } from '@nestjs/common';
import { StorageModule } from '@app/common';
import { PublicStorageController } from './controllers/public-storage.controller';

/**
 * HTTP surface for stored files. Named to avoid confusion with the shared
 * StorageModule in libs/common, which provides the driver itself.
 */
@Module({
  imports: [StorageModule],
  controllers: [PublicStorageController],
})
export class StorageHttpModule {}
