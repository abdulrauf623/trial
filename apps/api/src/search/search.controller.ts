import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('posts')
  async searchPosts(
    @Request() req: AuthRequest,
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('color') color?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const searchOptions = {
      query: query || '',
      category,
      color,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? parseInt(limit) : 20,
      cursor,
    };

    return this.searchService.searchPosts(req.user.userId, searchOptions);
  }

  @Get('items')
  async searchItems(
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('color') color?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const searchOptions = {
      query: query || '',
      category,
      color,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit) : 20,
      cursor,
    };

    return this.searchService.searchItems(searchOptions);
  }

  @Get('similar/:itemId')
  async searchSimilar(
    @Param('itemId') itemId: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchSimilarItems(
      itemId,
      limit ? parseInt(limit) : 20
    );
  }

  @Get('suggestions')
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.getSuggestions(
      query || '',
      limit ? parseInt(limit) : 5
    );
  }
}
