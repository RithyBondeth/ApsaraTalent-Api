import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './apps/chat-service/src/chat-service.module';
import { ChatServiceService } from './apps/chat-service/src/chat-service.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ChatServiceModule);
  const chatService = app.get(ChatServiceService);

  console.log('Testing getRecentChats...');
  try {
    // using a dummy uuid
    const result = await chatService.getRecentChats(
      '287bd2b6-dc07-4e98-a3ce-79e1eb1e4ebc',
    );
    console.log('Result:', result);
  } catch (e: any) {
    console.error('Error occurred:', e.message);
    if (e.query) console.error('Query:', e.query);
  }

  await app.close();
}

bootstrap();
