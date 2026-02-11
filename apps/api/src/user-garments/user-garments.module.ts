import { Module } from '@nestjs/common';
import { UserGarmentsController } from './user-garments.controller';
import { UserGarmentsService } from './user-garments.service';

@Module({
  controllers: [UserGarmentsController],
  providers: [UserGarmentsService],
  exports: [UserGarmentsService],
})
export class UserGarmentsModule {}
