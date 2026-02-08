import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
// Note: Using in-memory cache for MVP. For production, add Redis:
// import { redisStore } from 'cache-manager-redis-yet';
// CacheModule.registerAsync({ useFactory: async () => ({ store: await redisStore(...) }) })
