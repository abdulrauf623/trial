import { Controller, Get, Post, Delete, Query, Param, UseGuards, Request } from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  async getFeed(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const maxLimit = Math.min(parsedLimit, 50); // Cap at 50 posts per request

    return this.feedService.getFeed(req.user.userId, maxLimit, cursor);
  }

  @Post('posts/:postId/like')
  async likePost(@Request() req: AuthRequest, @Param('postId') postId: string) {
    await this.feedService.likePost(req.user.userId, postId);
    return { success: true };
  }

  @Delete('posts/:postId/like')
  async unlikePost(@Request() req: AuthRequest, @Param('postId') postId: string) {
    await this.feedService.unlikePost(req.user.userId, postId);
    return { success: true };
  }
}
