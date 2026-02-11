import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { deriveFormalityScore, inferSeasonTags } from './garment-metadata.util';

export interface CreateUserGarmentDto {
  mediaUploadId: string;
  notes?: string;
  category?: string;
  subcategory?: string;
  colors?: string[];
  pattern?: string;
  patternType?: string;
  textureTags?: string[];
  formalityScore?: number;
  seasonTags?: string[];
  silhouetteTag?: string;
  material?: string;
  brand?: string;
  size?: string;
  tags?: string[];
}

export interface UpdateUserGarmentDto {
  notes?: string;
  category?: string;
  subcategory?: string;
  colors?: string[];
  pattern?: string;
  patternType?: string;
  textureTags?: string[];
  formalityScore?: number;
  seasonTags?: string[];
  silhouetteTag?: string;
  material?: string;
  brand?: string;
  size?: string;
  tags?: string[];
}

export interface UserGarmentResponse {
  id: string;
  userId: string;
  mediaUploadId: string;
  category: string | null;
  subcategory: string | null;
  colors: string[];
  dominantHex: string | null;
  confidence: number | null;
  pattern: string | null;
  patternType: string | null;
  textureTags: string[];
  formalityScore: number;
  seasonTags: string[];
  silhouetteTag: string | null;
  material: string | null;
  brand: string | null;
  size: string | null;
  tags: string[];
  notes: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  removedBgUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUserGarmentsResponse {
  garments: UserGarmentResponse[];
  total: number;
  categories: string[];
}

@Injectable()
export class UserGarmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a user garment from a processed media upload
   */
  async createGarment(userId: string, dto: CreateUserGarmentDto): Promise<UserGarmentResponse> {
    // Verify media upload exists and belongs to user
    const media = await this.prisma.mediaUpload.findUnique({
      where: { id: dto.mediaUploadId },
    });

    if (!media) {
      throw new NotFoundException('Media upload not found');
    }

    if (media.userId !== userId) {
      throw new BadRequestException('Not authorized to use this media');
    }

    if (media.status !== 'ready') {
      throw new BadRequestException(
        `Media is not ready yet. Current status: ${media.status}`
      );
    }

    // Extract metadata from media upload
    const metadata = (media.metadata as any) || {};
    const normalizedColors = normalizeColors(dto.colors || metadata.dominantColors || []);
    const patternType = dto.patternType || dto.pattern || metadata.detectedPattern || null;
    const textureTags = uniqueList(dto.textureTags || metadata.textureTags || []);
    const resolvedSubcategory = dto.subcategory || metadata.detectedSubcategory || null;
    const resolvedMaterial = dto.material || metadata.detectedMaterial || null;
    const resolvedTags = uniqueList(dto.tags || metadata.detectedTags || []);
    const resolvedFormalityScore =
      dto.formalityScore ??
      deriveFormalityScore({
        category: dto.category || metadata.detectedCategory || null,
        subcategory: resolvedSubcategory,
        material: resolvedMaterial,
        tags: resolvedTags,
      });
    const resolvedSeasonTags =
      dto.seasonTags && dto.seasonTags.length > 0
        ? uniqueList(dto.seasonTags)
        : inferSeasonTags({
            category: dto.category || metadata.detectedCategory || null,
            material: resolvedMaterial,
            textureTags,
          });

    // Create garment - user overrides take precedence over AI detections
    const garment = await this.prisma.userGarment.create({
      data: {
        userId,
        mediaUploadId: media.id,
        category: dto.category || metadata.detectedCategory || null,
        subcategory: resolvedSubcategory,
        colors: normalizedColors,
        dominantHex: metadata.dominantHex || null,
        confidence: metadata.confidence || null,
        pattern: dto.pattern || metadata.detectedPattern || null,
        patternType,
        textureTags,
        formalityScore: resolvedFormalityScore,
        seasonTags: resolvedSeasonTags,
        silhouetteTag: dto.silhouetteTag || metadata.detectedSilhouette || null,
        removedBgUrl: media.processedUrl || null,
        material: resolvedMaterial,
        brand: dto.brand || null,
        size: dto.size || null,
        tags: resolvedTags,
        notes: dto.notes,
      },
      include: {
        mediaUpload: true,
      },
    });

    console.log(`[UserGarments] Created garment ${garment.id} for user ${userId}`);

    return this.formatGarmentResponse(garment);
  }

  /**
   * List user's garments with optional filtering
   */
  async listGarments(
    userId: string,
    category?: string,
    limit: number = 50
  ): Promise<ListUserGarmentsResponse> {
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    const garments = await this.prisma.userGarment.findMany({
      where,
      include: {
        mediaUpload: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get unique categories
    const allGarments = await this.prisma.userGarment.findMany({
      where: { userId },
      select: { category: true },
    });

    const categories = [...new Set(allGarments.map((g: any) => g.category).filter(Boolean))] as string[];

    return {
      garments: garments.map((g: any) => this.formatGarmentResponse(g)),
      total: garments.length,
      categories: categories.sort(),
    };
  }

  /**
   * Get a single garment by ID
   */
  async getGarment(userId: string, garmentId: string): Promise<UserGarmentResponse> {
    const garment = await this.prisma.userGarment.findUnique({
      where: { id: garmentId },
      include: {
        mediaUpload: true,
      },
    });

    if (!garment) {
      throw new NotFoundException('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new BadRequestException('Not authorized to view this garment');
    }

    return this.formatGarmentResponse(garment);
  }

  /**
   * Update garment attributes
   */
  async updateGarment(
    userId: string,
    garmentId: string,
    updates: UpdateUserGarmentDto,
  ): Promise<UserGarmentResponse> {
    const garment = await this.prisma.userGarment.findUnique({
      where: { id: garmentId },
    });

    if (!garment) {
      throw new NotFoundException('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new BadRequestException('Not authorized to update this garment');
    }

    const normalizedUpdates: Record<string, any> = { ...updates };

    if (updates.colors) {
      normalizedUpdates.colors = normalizeColors(updates.colors);
    }

    if (updates.textureTags) {
      normalizedUpdates.textureTags = uniqueList(updates.textureTags);
    }

    if (updates.seasonTags) {
      normalizedUpdates.seasonTags = uniqueList(updates.seasonTags);
    }

    if (updates.tags) {
      normalizedUpdates.tags = uniqueList(updates.tags);
    }

    if (normalizedUpdates.formalityScore == null) {
      normalizedUpdates.formalityScore = deriveFormalityScore({
        category: updates.category ?? garment.category,
        subcategory: updates.subcategory ?? garment.subcategory,
        material: updates.material ?? garment.material,
        tags: updates.tags ?? garment.tags,
      });
    }

    if (!normalizedUpdates.seasonTags || normalizedUpdates.seasonTags.length === 0) {
      normalizedUpdates.seasonTags = inferSeasonTags({
        category: updates.category ?? garment.category,
        material: updates.material ?? garment.material,
        textureTags: updates.textureTags ?? garment.textureTags,
      });
    }

    const updated = await this.prisma.userGarment.update({
      where: { id: garmentId },
      data: normalizedUpdates,
      include: {
        mediaUpload: true,
      },
    });

    return this.formatGarmentResponse(updated);
  }

  /**
   * Delete a garment
   */
  async deleteGarment(userId: string, garmentId: string): Promise<void> {
    const garment = await this.prisma.userGarment.findUnique({
      where: { id: garmentId },
    });

    if (!garment) {
      throw new NotFoundException('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new BadRequestException('Not authorized to delete this garment');
    }

    await this.prisma.userGarment.delete({
      where: { id: garmentId },
    });

    console.log(`[UserGarments] Deleted garment ${garmentId}`);
  }

  private formatGarmentResponse(garment: any): UserGarmentResponse {
    return {
      id: garment.id,
      userId: garment.userId,
      mediaUploadId: garment.mediaUploadId,
      category: garment.category,
      subcategory: garment.subcategory || null,
      colors: garment.colors,
      dominantHex: garment.dominantHex,
      confidence: garment.confidence,
      pattern: garment.pattern,
      patternType: garment.patternType || garment.pattern || null,
      textureTags: garment.textureTags || [],
      formalityScore: garment.formalityScore || 3,
      seasonTags: garment.seasonTags || [],
      silhouetteTag: garment.silhouetteTag || null,
      material: garment.material,
      brand: garment.brand,
      size: garment.size,
      tags: garment.tags || [],
      notes: garment.notes,
      originalUrl: garment.mediaUpload?.originalUrl || null,
      processedUrl: garment.mediaUpload?.processedUrl || null,
      removedBgUrl: garment.removedBgUrl || garment.mediaUpload?.processedUrl || null,
      thumbnailUrl: garment.mediaUpload?.thumbnailUrl || null,
      status: garment.mediaUpload?.status || 'unknown',
      createdAt: garment.createdAt.toISOString(),
      updatedAt: garment.updatedAt.toISOString(),
    };
  }
}

function normalizeColors(values: string[]): string[] {
  return uniqueList(values.map((value) => value.toLowerCase()));
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
}
