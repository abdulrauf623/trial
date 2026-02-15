import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CreateUserGarmentSchema, UpdateUserGarmentSchema } from '@fashion/shared';
import { UserGarmentsService } from './user-garments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('user-garments')
@UseGuards(JwtAuthGuard)
export class UserGarmentsController {
  constructor(private userGarmentsService: UserGarmentsService) {}

  @Post()
  async createGarment(@Request() req: AuthRequest, @Body() body: unknown) {
    const dto = CreateUserGarmentSchema.parse(body);
    return this.userGarmentsService.createGarment(req.user.userId, dto);
  }

  @Get()
  async listGarments(
    @Request() req: AuthRequest,
    @Query('category') category?: string,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.userGarmentsService.listGarments(req.user.userId, category, limitNum);
  }

  @Get(':garmentId')
  async getGarment(@Request() req: AuthRequest, @Param('garmentId') garmentId: string) {
    return this.userGarmentsService.getGarment(req.user.userId, garmentId);
  }

  @Patch(':garmentId')
  async updateGarment(
    @Request() req: AuthRequest,
    @Param('garmentId') garmentId: string,
    @Body() body: unknown
  ) {
    const updates = UpdateUserGarmentSchema.parse(body);
    return this.userGarmentsService.updateGarment(req.user.userId, garmentId, updates);
  }

  @Delete(':garmentId')
  async deleteGarment(@Request() req: AuthRequest, @Param('garmentId') garmentId: string) {
    await this.userGarmentsService.deleteGarment(req.user.userId, garmentId);
    return { success: true };
  }

  @Post(':garmentId/ai-render')
  async generateAiRender(@Request() req: AuthRequest, @Param('garmentId') garmentId: string) {
    const garment = await this.userGarmentsService.generateAiRender(req.user.userId, garmentId);
    return { garment };
  }
}
