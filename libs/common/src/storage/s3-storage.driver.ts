import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import {
  GetUrlOptions,
  PutOptions,
  StorageDriver,
  StorageKey,
  StorageObject,
} from './storage-driver.interface';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Custom endpoint for S3-compatible providers (Cloudflare R2, MinIO, B2). */
  endpoint?: string;
  /** Required by MinIO and some self-hosted gateways. */
  forcePathStyle?: boolean;
  /**
   * Public base URL for world-readable objects (a CDN or R2 public bucket
   * domain). When unset, public objects fall back to presigned URLs, which
   * still work but are neither cacheable nor stable.
   */
  publicBaseUrl?: string;
  /** Lifetime of generated presigned URLs. */
  signedUrlExpirySeconds: number;
}

/**
 * S3-compatible driver. Works with AWS S3, Cloudflare R2, Backblaze B2 and
 * MinIO — the differences are all expressible as endpoint + path-style config,
 * which is why this is one driver rather than several.
 */
@Injectable()
export class S3StorageDriver implements StorageDriver {
  readonly name = 's3' as const;

  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(
    key: StorageKey,
    body: Buffer,
    options?: PutOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType,
        // Only set an ACL for public objects. Many buckets (and R2 entirely)
        // reject ACLs, so sending one unconditionally would break private
        // uploads on providers that manage access at the bucket level.
        ...(options?.publicRead ? { ACL: 'public-read' as const } : {}),
      }),
    );
  }

  async get(key: StorageKey): Promise<StorageObject> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return {
        stream: result.Body as Readable,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      };
    } catch (error: any) {
      if (this.isNotFound(error)) {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return true;
    } catch (error: any) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  async delete(key: StorageKey): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
    } catch (error: any) {
      // S3 delete is already idempotent, but some gateways surface a 404.
      if (!this.isNotFound(error)) throw error;
    }
  }

  async getUrl(
    key: StorageKey,
    options?: GetUrlOptions,
  ): Promise<string | null> {
    if (options?.publicRead && this.config.publicBaseUrl) {
      const base = this.config.publicBaseUrl.replace(/\/+$/, '');
      // Encode each segment separately so slashes stay as path separators.
      const encoded = key.split('/').map(encodeURIComponent).join('/');
      return `${base}/${encoded}`;
    }

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          ResponseContentDisposition: options?.responseContentDisposition,
        }),
        {
          expiresIn:
            options?.expiresInSeconds ?? this.config.signedUrlExpirySeconds,
        },
      );
    } catch (error: any) {
      // Falling back to streaming is slower but correct, so a signing failure
      // degrades rather than breaks the request.
      this.logger.error(
        `Failed to presign ${key}: ${error?.message ?? error}. Falling back to streaming.`,
      );
      return null;
    }
  }

  private isNotFound(error: any): boolean {
    const status = error?.$metadata?.httpStatusCode;
    const name = error?.name ?? error?.Code;
    return status === 404 || name === 'NoSuchKey' || name === 'NotFound';
  }
}
