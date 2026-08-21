import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { RESUME } from '@app/contracts/constants/domain/resume.constant';
import { IImageService } from '@app/contracts/interfaces/service';
import {
  DATA_IMAGE_PATTERN,
  MAX_DECODED_AVATAR_BYTES,
  ALLOWED_IMAGE_FORMATS,
} from '@app/contracts';

@Injectable()
export class ImageService implements IImageService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ImageService.name);
  }

  async optimizeProfilePicture(imageData: string): Promise<string> {
    try {
      // Remote URLs are intentionally not fetched by the PDF service. This keeps
      // user-controlled resume data from becoming a server-side request primitive.
      if (!imageData.startsWith('data:image/')) {
        this.logger.warn('Ignoring non-data profile picture.');
        return '';
      }

      const match = imageData.match(DATA_IMAGE_PATTERN);
      if (!match) throw new Error('Unsupported profile picture format');

      const imageBuffer = Buffer.from(match[1], 'base64');
      if (
        imageBuffer.length === 0 ||
        imageBuffer.length > MAX_DECODED_AVATAR_BYTES
      ) {
        throw new Error('Profile picture is too large');
      }

      const image = sharp(imageBuffer, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
      });
      const metadata = await image.metadata();
      if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
        throw new Error('Unsupported profile picture format');
      }

      const optimizedBuffer = await image
        .rotate()
        .resize(RESUME.AVATAR_SIZE, RESUME.AVATAR_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Unknown image optimization error',
      );
      throw new Error(
        (error as Error).message || 'Failed to optimize profile picture',
      );
    }
  }
}
