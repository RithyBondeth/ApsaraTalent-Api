import { DataSource } from 'typeorm';
import { Chat } from './libs/common/src/database/entities/chat.entity';

const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://neondb_owner:npg_j2TiZhSnC0Lu@ep-jolly-cherry-a8xuwuw5-pooler.eastus2.azure.neon.tech/neondb?sslmode=require',
  entities: [Chat, __dirname + '/libs/common/src/database/entities/**/*.ts'],
});

ds.initialize().then(async () => {
    try {
        const qb = ds.getRepository(Chat).createQueryBuilder('chat');
        qb.leftJoin('chat.sender', 'sender').leftJoin('chat.receiver', 'receiver');
        qb.select(['chat.id', 'chat.content', 'chat.sentAt', 'chat.isRead', 'sender.id', 'sender.email', 'receiver.id', 'receiver.email']);
        qb.where('chat.sender.id = :userId', { userId: '123' });
        
        qb.orderBy('"chat"."sentAt"', 'DESC');
        console.log("Quoted SQL:", qb.getSql());
        await qb.getMany();
        console.log("Success with quoted!");
    } catch(e) {
        console.error("Error:", e.message);
    } finally {
        await ds.destroy();
    }
});
