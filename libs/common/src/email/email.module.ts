import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { EmailService } from './email.service';
import { MailerService } from './mailer.service';

@Module({
  imports: [OutboxModule],
  providers: [EmailService, MailerService],
  exports: [EmailService, MailerService],
})
export class EmailModule {}
