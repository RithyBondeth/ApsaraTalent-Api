import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LoggerModule } from '../logger/logger.module';
import { VectorColumnsService } from './vector-columns.service';

@Module({
  imports: [LoggerModule, EmbeddingModule],
  providers: [VectorColumnsService],
  exports: [VectorColumnsService],
})
export class VectorColumnsModule {}
