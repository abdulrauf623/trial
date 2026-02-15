import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [StorageModule, QueueModule],
  controllers: [WardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService],
})
export class WardrobeModule {}
