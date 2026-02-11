import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

interface CreatePresignedUploadBody {
  contentType: string;
  type: 'garment' | 'post';
}

interface MarkCompleteBody {
  publicUrl: string;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presign')
  async createPresignedUpload(@Request() req: AuthRequest, @Body() body: CreatePresignedUploadBody) {
    const { contentType, type } = body;
    return this.uploadsService.createPresignedUpload(req.user.userId, contentType, type);
  }

  @Patch(':mediaId/complete')
  async markUploadComplete(
    @Request() req: AuthRequest,
    @Param('mediaId') mediaId: string,
    @Body() body: MarkCompleteBody
  ) {
    await this.uploadsService.markUploadComplete(req.user.userId, mediaId, body.publicUrl);
    return { success: true };
  }

  @Get(':mediaId/status')
  async getMediaStatus(@Request() req: AuthRequest, @Param('mediaId') mediaId: string) {
    return this.uploadsService.getMediaStatus(req.user.userId, mediaId);
  }
}
