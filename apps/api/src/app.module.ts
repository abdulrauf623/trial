import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeedModule } from './feed/feed.module';
import { PostsModule } from './posts/posts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { QueueModule } from './queue/queue.module';
import { LoggerModule } from './logger/logger.module';
import { StorageModule } from './storage/storage.module';
import { ProcessingModule } from './processing/processing.module';
import { UploadsModule } from './uploads/uploads.module';
import { UserGarmentsModule } from './user-garments/user-garments.module';
import { UserPostsModule } from './user-posts/user-posts.module';
import { StyleProfileModule } from './style-profile/style-profile.module';
import { OutfitsModule } from './outfits/outfits.module';
import { ExploreModule } from './explore/explore.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceInterceptor } from './common/performance.interceptor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),
    AuthModule,
    UsersModule,
    FeedModule,
    PostsModule,
    AnalyticsModule,
    WardrobeModule,
    ReportsModule,
    SearchModule,
    AiModule,
    QueueModule,
    LoggerModule,
    StorageModule,
    ProcessingModule,
    UploadsModule,
    UserGarmentsModule,
    UserPostsModule,
    StyleProfileModule,
    OutfitsModule,
    ExploreModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
