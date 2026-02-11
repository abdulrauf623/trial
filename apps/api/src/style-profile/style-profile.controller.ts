import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { StyleProfileService } from './style-profile.service';
import { StyleProfileInputSchema } from '@fashion/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('style-profile')
@UseGuards(JwtAuthGuard)
export class StyleProfileController {
  constructor(private readonly styleProfileService: StyleProfileService) {}

  @Get()
  async getProfile(@Request() req: AuthRequest) {
    return this.styleProfileService.getProfile(req.user.userId);
  }

  @Post()
  async saveProfile(@Request() req: AuthRequest, @Body() body: unknown) {
    const input = StyleProfileInputSchema.parse(body);
    return this.styleProfileService.upsertProfile(req.user.userId, input);
  }
}
