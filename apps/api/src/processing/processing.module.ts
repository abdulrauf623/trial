import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
