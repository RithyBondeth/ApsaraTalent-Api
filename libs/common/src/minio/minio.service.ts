import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService {
    private readonly logger = new Logger(MinioService.name);
    private minioClient: Client;

    constructor(private readonly configService: ConfigService) {
        this.minioClient = new Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT') || '127.0.0.1',
            port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
            useSSL: false,
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
        });
    }

    async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, folder: string): Promise<string> {
        try {
            const bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'avatars';
            const objectName = `${folder}/${fileName}`.replace(/\/+/g, '/');
    
            // Ensure bucket exists
            const bucketExists = await this.minioClient.bucketExists(bucketName);
            if (!bucketExists) {
                this.logger.warn(`Bucket ${bucketName} does not exist. Creating...`);
                await this.minioClient.makeBucket(bucketName, 'us-east-1');
            }
    
            // Upload file
            await this.minioClient.putObject(
                bucketName,
                objectName, 
                fileBuffer,
                fileBuffer.length,
                { 'Content-Type': mimeType }
            );
    
            this.logger.log(`File uploaded successfully: ${objectName}`);
    
            // ✅ Ensure correct URL format
            const minioHost = this.configService.get<string>('MINIO_PUBLIC_URL') || 'http://127.0.0.1:9000';
            return `${minioHost}/${bucketName}/${objectName}`;
        } catch (error) {
            this.logger.error(`MinIO Upload Error: ${error.message}`, error);
            throw new InternalServerErrorException('File upload failed.');
        }
    }
}
