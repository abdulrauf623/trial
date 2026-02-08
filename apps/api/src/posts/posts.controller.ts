import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get(':id')
  async getPost(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.postsService.getPostById(id, req.user.userId);
  }

  @Post(':id/save')
  async savePost(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.postsService.savePost(req.user.userId, id);
    return { success: true };
  }

  @Delete(':id/save')
  async unsavePost(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.postsService.unsavePost(req.user.userId, id);
    return { success: true };
  }
}
