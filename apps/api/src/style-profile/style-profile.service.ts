import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StyleProfileInput, StyleProfileResponse } from '@fashion/shared';

@Injectable()
export class StyleProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string): Promise<StyleProfileResponse> {
    const model = this.prisma.styleProfile;
    if (!model || typeof model.findUnique !== 'function') {
      return { profile: null };
    }

    const profile = await model.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { profile: null };
    }

    return {
      profile: this.formatProfile(profile),
    };
  }

  async upsertProfile(userId: string, input: StyleProfileInput): Promise<StyleProfileResponse> {
    const model = this.prisma.styleProfile;
    if (!model || typeof model.upsert !== 'function') {
      throw new ServiceUnavailableException(
        'Style profile storage is unavailable. Run prisma generate and restart the API.',
      );
    }

    const profile = await model.upsert({
      where: { userId },
      update: {
        contexts: unique(input.contexts),
        dressCodes: unique(input.dressCodes),
        climate: input.climate,
        rainy: input.rainy ?? false,
        fitPreference: input.fitPreference,
        archetypes: unique(input.archetypes),
        riskLevel: input.riskLevel,
        preferredNeutrals: unique(input.preferredNeutrals),
        likedColors: unique(input.likedColors),
        avoidedColors: unique(input.avoidedColors),
        patternComfort: input.patternComfort,
        shoesPreference: unique(input.shoesPreference),
        accessoriesLevel: input.accessoriesLevel,
        comfortConstraints: unique(input.comfortConstraints),
        shoppingInterest: input.shoppingInterest,
        budgetBand: input.budgetBand,
        heightRange: input.heightRange || null,
        proportions: input.proportions || null,
        shoulderWidth: input.shoulderWidth || null,
      },
      create: {
        userId,
        contexts: unique(input.contexts),
        dressCodes: unique(input.dressCodes),
        climate: input.climate,
        rainy: input.rainy ?? false,
        fitPreference: input.fitPreference,
        archetypes: unique(input.archetypes),
        riskLevel: input.riskLevel,
        preferredNeutrals: unique(input.preferredNeutrals),
        likedColors: unique(input.likedColors),
        avoidedColors: unique(input.avoidedColors),
        patternComfort: input.patternComfort,
        shoesPreference: unique(input.shoesPreference),
        accessoriesLevel: input.accessoriesLevel,
        comfortConstraints: unique(input.comfortConstraints),
        shoppingInterest: input.shoppingInterest,
        budgetBand: input.budgetBand,
        heightRange: input.heightRange || null,
        proportions: input.proportions || null,
        shoulderWidth: input.shoulderWidth || null,
      },
    });

    return {
      profile: this.formatProfile(profile),
    };
  }

  private formatProfile(profile: any) {
    return {
      userId: profile.userId,
      contexts: profile.contexts || [],
      dressCodes: profile.dressCodes || [],
      climate: profile.climate,
      rainy: profile.rainy,
      fitPreference: profile.fitPreference,
      archetypes: profile.archetypes || [],
      riskLevel: profile.riskLevel,
      preferredNeutrals: profile.preferredNeutrals || [],
      likedColors: profile.likedColors || [],
      avoidedColors: profile.avoidedColors || [],
      patternComfort: profile.patternComfort,
      shoesPreference: profile.shoesPreference || [],
      accessoriesLevel: profile.accessoriesLevel,
      comfortConstraints: profile.comfortConstraints || [],
      shoppingInterest: profile.shoppingInterest,
      budgetBand: profile.budgetBand,
      heightRange: profile.heightRange,
      proportions: profile.proportions,
      shoulderWidth: profile.shoulderWidth,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}
