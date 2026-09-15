import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxMessage } from '../database/entities/outbox-message.entity';
import { OutboxService } from './outbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxMessage])],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
