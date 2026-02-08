import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':userId/profile')
  async getProfile(@Param('userId') userId: string, @Request() req: AuthRequest) {
    return this.usersService.getProfile(userId, req.user.userId);
  }

  @Get(':userId/posts')
  async getUserPosts(
    @Param('userId') userId: string,
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.usersService.getUserPosts(
      userId,
      req.user.userId,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }

  @Post(':userId/follow')
  async followUser(@Param('userId') userId: string, @Request() req: AuthRequest) {
    await this.usersService.followUser(req.user.userId, userId);
    return { success: true };
  }

  @Delete(':userId/follow')
  async unfollowUser(@Param('userId') userId: string, @Request() req: AuthRequest) {
    await this.usersService.unfollowUser(req.user.userId, userId);
    return { success: true };
  }

  @Get(':userId/followers')
  async getFollowers(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.usersService.getFollowers(userId, limit ? parseInt(limit) : 50, cursor);
  }

  @Get(':userId/following')
  async getFollowing(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.usersService.getFollowing(userId, limit ? parseInt(limit) : 50, cursor);
  }
}
