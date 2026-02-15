import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  BuilderWardrobeItemSourceSchema,
  CreateOutfitInputSchema,
  GenerateOutfitsInputSchema,
  UpdateOutfitInputSchema,
} from '@fashion/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OutfitsService } from './outfits.service';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('outfits')
@UseGuards(JwtAuthGuard)
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Get()
  async list(@Request() req: AuthRequest, @Query('kind') kind?: string) {
    if (kind === 'recommended') {
      return this.outfitsService.listUserOutfits(req.user.userId);
    }

    return this.outfitsService.listCreatedOutfits(req.user.userId);
  }

  @Post()
  async create(@Request() req: AuthRequest, @Body() body: unknown) {
    const input = CreateOutfitInputSchema.parse(body || {});
    return this.outfitsService.createOutfit(req.user.userId, input);
  }

  @Post('generate')
  async generate(@Request() req: AuthRequest, @Body() body: unknown) {
    const input = GenerateOutfitsInputSchema.parse(body || {});
    return this.outfitsService.generate(req.user.userId, input);
  }

  @Post('random')
  async createRandom(@Request() req: AuthRequest) {
    return this.outfitsService.createRandomOutfit(req.user.userId);
  }

  @Get('wardrobe')
  async getBuilderWardrobe(
    @Request() req: AuthRequest,
    @Query('filter') filter?: string,
    @Query('source') source?: string,
  ) {
    const normalizedSource =
      source && source !== 'all'
        ? BuilderWardrobeItemSourceSchema.parse(source)
        : source === 'all'
          ? 'all'
          : undefined;

    return this.outfitsService.getBuilderWardrobeItems(req.user.userId, filter, normalizedSource);
  }

  @Get(':id')
  async getById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.outfitsService.getCreatedOutfit(req.user.userId, id);
  }

  @Put(':id')
  async update(@Request() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateOutfitInputSchema.parse(body || {});
    return this.outfitsService.updateOutfit(req.user.userId, id, input);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    await this.outfitsService.deleteOutfit(req.user.userId, id);
    return { success: true };
  }

  @Post(':id/render')
  async render(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.outfitsService.renderOutfit(req.user.userId, id);
  }
}
