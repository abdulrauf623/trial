import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExploreService } from './explore.service';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('explore')
@UseGuards(JwtAuthGuard)
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('feed')
  async getFeed(
    @Request() req: AuthRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit = Math.min(Math.max(parsedLimit, 1), 50);
    return this.exploreService.getPersonalizedFeed(req.user.userId, safeLimit, cursor);
  }
}
