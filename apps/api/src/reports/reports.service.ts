import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_account'
  | 'intellectual_property'
  | 'other';

interface CreateReportDto {
  targetType: 'post' | 'user';
  targetId: string;
  reason: ReportReason;
  description?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(reporterId: string, data: CreateReportDto): Promise<void> {
    // Check if user already reported this target
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    });

    if (existing) {
      throw new Error('You have already reported this');
    }

    await this.prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        description: data.description,
      },
    });

    console.log(`[Report] User ${reporterId.substring(0, 8)} reported ${data.targetType} ${data.targetId.substring(0, 8)} for ${data.reason}`);
  }

  async getReports(limit = 50, cursor?: string) {
    const reports = await this.prisma.report.findMany({
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        reporter: {
          select: {
            id: true,
            displayName: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = reports.length > limit;
    const items = reports.slice(0, limit);

    return {
      reports: items.map((r: any) => ({
        id: r.id,
        reporter: r.reporter,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }
}
