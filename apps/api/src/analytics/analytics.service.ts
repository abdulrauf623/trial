import { Injectable } from '@nestjs/common';

interface AnalyticsEvent {
  userId: string;
  eventName: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  trackEvent(userId: string, eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      userId,
      eventName,
      properties,
      timestamp: new Date(),
    };

    this.events.push(event);

    // Log for MVP (in production, send to analytics service like Mixpanel)
    console.log('[Analytics]', {
      user: userId.substring(0, 8),
      event: eventName,
      ...properties,
    });

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  getEvents(userId?: string): AnalyticsEvent[] {
    if (userId) {
      return this.events.filter((e) => e.userId === userId);
    }
    return this.events;
  }
}
