import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    forwardRef(() => StorageModule),
    forwardRef(() => ProcessingModule),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
