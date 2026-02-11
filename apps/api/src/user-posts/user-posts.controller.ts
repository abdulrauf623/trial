import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UserPostsService, CreateUserPostDto } from './user-posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('user-posts')
export class UserPostsController {
  constructor(private userPostsService: UserPostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Request() req: AuthRequest, @Body() dto: CreateUserPostDto) {
    return this.userPostsService.createPost(req.user.userId, dto);
  }

  @Get()
  async listPosts(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.userPostsService.listPosts(userId, limitNum, cursor);
  }

  @Get(':postId')
  async getPost(@Param('postId') postId: string) {
    return this.userPostsService.getPost(postId);
  }

  @Delete(':postId')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Request() req: AuthRequest, @Param('postId') postId: string) {
    await this.userPostsService.deletePost(req.user.userId, postId);
    return { success: true };
  }
}
