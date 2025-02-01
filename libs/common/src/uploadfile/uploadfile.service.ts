import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage, StorageEngine } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadfileService {
    constructor(private readonly configService: ConfigService) {}

    static storageOptions = (folderName: string): StorageEngine => diskStorage({
        destination: `../../../../storage/${folderName}`,
        filename: (req, file, callback) => {
            const name = file.originalname.split('.')[0];
            const fileExtName = path.extname(file.originalname);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
         
            callback(null, `${name}-${uniqueSuffix}${fileExtName}`);
        }
    });

    getUploadFile(folderName: string, file: Express.Multer.File): string {
        return this.configService.get<string>('BASE_URL') + `storage/${folderName}/` + file.filename;
    }

    static deleteFile(filePath: string, fileType: string) {
        if(fs.existsSync(filePath)) {
            fs.unlink(filePath, (error) => {
                if(error) console.log(`Failed to delete ${fileType}:`, error)
                else console.log(`${fileType} Deleted Successfully`)
            });   
        } else {
            console.log(`${fileType} does not exist at path ${filePath}`);
        }
    }
}
