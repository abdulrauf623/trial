import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

interface TrackEventDto {
  eventName: string;
  properties?: Record<string, any>;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('track')
  async trackEvent(@Request() req: AuthRequest, @Body() dto: TrackEventDto) {
    this.analyticsService.trackEvent(req.user.userId, dto.eventName, dto.properties);
    return { success: true };
  }
}
