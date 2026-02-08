import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_account'
  | 'intellectual_property'
  | 'other';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

interface CreateReportBody {
  targetType: 'post' | 'user';
  targetId: string;
  reason: ReportReason;
  description?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  async createReport(@Request() req: AuthRequest, @Body() body: CreateReportBody) {
    await this.reportsService.createReport(req.user.userId, body);
    return { success: true };
  }

  @Get()
  async getReports(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.reportsService.getReports(limit ? parseInt(limit) : 50, cursor);
  }
}
