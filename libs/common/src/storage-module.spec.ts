import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { STORAGE_DRIVER } from './storage/storage-driver.interface';
import { LocalStorageDriver } from './storage/local-storage.driver';
import { S3StorageDriver } from './storage/s3-storage.driver';
import { StorageModule } from './storage/storage.module';
import { StorageRegistry } from './storage/storage.registry';

describe('StorageModule', () => {
  const providers = Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    StorageModule,
  ) as any[];
  const driverProvider = providers.find(
    (provider) => provider.provide === STORAGE_DRIVER,
  );

  function config(values: Record<string, unknown>) {
    return { get: jest.fn((key: string) => values[key]) } as any;
  }

  it('uses local storage unless S3 is explicitly selected', () => {
    expect(driverProvider.useFactory(config({}))).toBeInstanceOf(
      LocalStorageDriver,
    );
  });

  it('fails closed when any required S3 setting is absent', () => {
    expect(() =>
      driverProvider.useFactory(
        config({
          'storage.driver': 's3',
          'storage.s3.bucket': 'bucket',
          'storage.s3.region': 'ap-southeast-1',
          'storage.s3.accessKeyId': 'key',
        }),
      ),
    ).toThrow('STORAGE_DRIVER=s3');
  });

  it('constructs S3 storage with optional endpoint settings', () => {
    const driver = driverProvider.useFactory(
      config({
        'storage.driver': 's3',
        'storage.s3.bucket': 'bucket',
        'storage.s3.region': 'ap-southeast-1',
        'storage.s3.accessKeyId': 'key',
        'storage.s3.secretAccessKey': 'secret',
        'storage.s3.endpoint': 'https://s3.example.com',
        'storage.s3.forcePathStyle': true,
        'storage.s3.publicBaseUrl': 'https://cdn.example.com',
        'storage.s3.signedUrlExpirySeconds': 300,
      }),
    );
    expect(driver).toBeInstanceOf(S3StorageDriver);
  });

  it('publishes the injected storage service during module initialization', () => {
    const storage = { getObject: jest.fn() };
    const set = jest.spyOn(StorageRegistry, 'set').mockImplementation();
    new StorageModule(storage as any).onModuleInit();
    expect(set).toHaveBeenCalledWith(storage);
  });
});
