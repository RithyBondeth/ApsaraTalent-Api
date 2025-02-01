import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadfileService } from "./uploadfile.service";

@Injectable()
export class UploadFileInterceptor implements NestInterceptor {
    constructor(private readonly fileName: string, private readonly folderName: string) {}

    intercept(context: ExecutionContext, next: CallHandler) {
        const fileInterceptor = FileInterceptor(this.fileName, {
            storage: UploadfileService.storageOptions(this.folderName)
        });
        const fileInterceptorInstance = new (fileInterceptor as any)();
        return fileInterceptorInstance.intercept(context, next);
    }
}