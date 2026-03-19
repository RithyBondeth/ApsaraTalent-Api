import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { diskStorage, StorageEngine } from 'multer';
import * as path from 'path';

@Injectable()
export class UploadfileService {
  constructor() {}

  static storageOptions = (folderName: string): StorageEngine => {
    // Use relative path from project root
    const storagePath = path.join(process.cwd(), 'storage', folderName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    return diskStorage({
      destination: storagePath, // Use absolute path
      filename: (req, file, callback) => {
        const name = file.originalname.split('.')[0];
        const fileExtName = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `${name}-${uniqueSuffix}${fileExtName}`);
      },
    });
  };
  getUploadFile(folderName: string, file: Express.Multer.File): string {
    // Store a relative public path in DB so environments can move freely
    // (localhost / staging / production) without hardcoded hostnames.
    return `/storage/${folderName}/${file.filename}`;
  }

  static deleteFile(filePath: string, fileType: string) {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (error) => {
        if (error) console.log(`Failed to delete ${fileType}:`, error);
        else console.log(`${fileType} Deleted Successfully`);
      });
    } else {
      console.log(`${fileType} does not exist at path ${filePath}`);
    }
  }
}
