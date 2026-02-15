import { Module } from '@nestjs/common';
import { UserGarmentsController } from './user-garments.controller';
import { UserGarmentsService } from './user-garments.service';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AiModule, StorageModule],
  controllers: [UserGarmentsController],
  providers: [UserGarmentsService],
  exports: [UserGarmentsService],
})
export class UserGarmentsModule {}
