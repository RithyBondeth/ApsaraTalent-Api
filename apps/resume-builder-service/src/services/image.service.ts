import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import * as sharp from "sharp";

@Injectable()
export class ImageService {
     private readonly logger: PinoLogger;

    async optimizeProfilePicture(imageData: string): Promise<string>  {
       try {
            // Remove data:image/xyz;base64, prefix
            const base64Data = imageData.split(';base64,').pop();
            const imageBuffer = Buffer.from(base64Data, 'base64');

            const optimizedBuffer = await sharp(imageBuffer)
            .resize(300, 300, { fit: 'cover', position: 'center'})
            .jpeg({ quality: 85 })
            .toBuffer();

            // Convert optimized buffer to base64
            const optimizedBase64 = optimizedBuffer.toString('base64');

            // Return with data URL prefix
            return `data:image/jpeg;base64,${optimizedBase64}`;
       } catch (error) {
            this.logger.error(error.message);
            throw new Error('Failed to optimize profile picture');
       }
    }
}