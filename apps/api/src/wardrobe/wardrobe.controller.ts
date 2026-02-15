import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BuilderWardrobeItemSourceSchema } from '@fashion/shared';
import { WardrobeService } from './wardrobe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('wardrobe')
@UseGuards(JwtAuthGuard)
export class WardrobeController {
  constructor(private wardrobeService: WardrobeService) {}

  @Get('worth')
  async getWardrobeWorth(@Request() req: AuthRequest) {
    return this.wardrobeService.getWardrobeWorth(req.user.userId);
  }

  @Get('filters')
  async getFilterOptions(@Request() req: AuthRequest) {
    return this.wardrobeService.getFilterOptions(req.user.userId);
  }

  @Get()
  async getWardrobe(
    @Request() req: AuthRequest,
    @Query('category') category?: string,
    @Query('color') color?: string,
    @Query('filter') filter?: string,
    @Query('source') source?: string,
    @Query('mode') mode?: string,
  ) {
    if (mode === 'builder' || filter !== undefined || source !== undefined) {
      const normalizedSource =
        source && source !== 'all'
          ? BuilderWardrobeItemSourceSchema.parse(source)
          : source === 'all'
            ? 'all'
            : undefined;

      return this.wardrobeService.getBuilderWardrobe(req.user.userId, filter, normalizedSource);
    }

    return this.wardrobeService.getWardrobe(req.user.userId, category, color);
  }

  @Post('items/:clothingItemId')
  async addToWardrobe(
    @Request() req: AuthRequest,
    @Param('clothingItemId') clothingItemId: string,
  ) {
    await this.wardrobeService.addToWardrobe(req.user.userId, clothingItemId);
    return { success: true };
  }

  @Delete('items/:itemId')
  async removeFromWardrobe(
    @Request() req: AuthRequest,
    @Param('itemId') itemId: string,
  ) {
    await this.wardrobeService.removeFromWardrobe(req.user.userId, itemId);
    return { success: true };
  }
}
