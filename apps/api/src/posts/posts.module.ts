import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [StorageModule, QueueModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
