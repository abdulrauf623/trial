import { Module } from '@nestjs/common';
import { UserPostsController } from './user-posts.controller';
import { UserPostsService } from './user-posts.service';

@Module({
  controllers: [UserPostsController],
  providers: [UserPostsService],
  exports: [UserPostsService],
})
export class UserPostsModule {}
