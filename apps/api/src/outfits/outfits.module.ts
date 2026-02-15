import { Module } from '@nestjs/common';
import { OutfitsController } from './outfits.controller';
import { OutfitsService } from './outfits.service';
import { StorageModule } from '../storage/storage.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [StorageModule, ProcessingModule],
  controllers: [OutfitsController],
  providers: [OutfitsService],
  exports: [OutfitsService],
})
export class OutfitsModule {}
