import { User } from '@app/common/database/entities/user.entiry';
import { MinioService } from '@app/common/minio/minio.service';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserServiceService {
  constructor(
    private readonly minioService: MinioService,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async uploadAvatar(userId: string, avatar: { originalname: string, mimetype: string, buffer: string }): Promise<any> {
    if (!avatar || !avatar.buffer) throw new BadRequestException('No file provided.');

    try {
        // ✅ Convert Base64 back to Buffer
        const fileBuffer = Buffer.from(avatar.buffer, 'base64');

        // ✅ Upload file to MinIO
        const avatarUrl = await this.minioService.uploadFile(
          fileBuffer,             // ✅ Correctly pass file buffer
          avatar.originalname,    // ✅ Original filename
          avatar.mimetype,        // ✅ MIME type
          'avatars'               // ✅ Bucket/folder name
      );

        // ✅ Save avatar URL to user entity
        await this.userRepository.update(userId, { employee: { avatar: avatarUrl } });

        return { message: 'Avatar uploaded successfully.', avatarUrl };
    } catch (error) {
        throw new InternalServerErrorException('Avatar upload failed.');
    }
}
}
