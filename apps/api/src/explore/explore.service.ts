import { Injectable } from '@nestjs/common';
import {
  PersonalizedExploreFeedResponse,
  PersonalizedFeedPost,
  StyleProfile,
} from '@fashion/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExploreService {
  constructor(private prisma: PrismaService) {}

  async getPersonalizedFeed(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PersonalizedExploreFeedResponse> {
    const styleProfile = await this.loadStyleProfile(userId);
    const cursorId = decodeCursor(cursor);

    const exploreRows = await this.loadExploreRows();

    if (exploreRows.length === 0) {
      return this.getLegacyFallback(userId, styleProfile, limit, cursorId);
    }

    const ranked: PersonalizedFeedPost[] = exploreRows
      .map((row: any): PersonalizedFeedPost => {
        const scored = scoreExploreRow(row, styleProfile);
        return {
          id: row.id,
          creator: row.author,
          caption: row.vibeKeywords?.length ? row.vibeKeywords.join(' · ') : null,
          imageUrls: [row.imageUrl],
          tags: [...(row.archetypes || []), ...(row.vibeKeywords || [])].slice(0, 6),
          likeCount: 0,
          isLikedByMe: false,
          createdAt: row.createdAt.toISOString(),
          personalizationScore: scored.score,
          personalizationReasons: scored.reasons,
        };
      })
      .sort(
        (a: PersonalizedFeedPost, b: PersonalizedFeedPost) =>
          b.personalizationScore - a.personalizationScore || b.createdAt.localeCompare(a.createdAt),
      );

    const paged = paginateRanked(ranked, limit, cursorId);

    return {
      posts: paged.items,
      nextCursor: encodeCursor(paged.nextCursor),
      hasMore: paged.hasMore,
    };
  }

  private async loadExploreRows(): Promise<any[]> {
    const model = this.prisma.explorePost;
    if (!model || typeof model.findMany !== 'function') {
      return [];
    }

    return model.findMany({
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
      },
    });
  }

  private async getLegacyFallback(
    userId: string,
    styleProfile: StyleProfile | null,
    limit: number,
    cursorId: string | null,
  ): Promise<PersonalizedExploreFeedResponse> {
    const rows = await this.prisma.post.findMany({
      take: 300,
      orderBy: [{ engagementScore: 'desc' }, { createdAt: 'desc' }],
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
        _count: {
          select: { likes: true },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    const ranked: PersonalizedFeedPost[] = rows
      .map((row: any): PersonalizedFeedPost => {
        const scored = scoreLegacyPost(row, styleProfile);
        return {
          id: row.id,
          creator: row.creator,
          caption: row.caption,
          imageUrls: row.imageUrls,
          tags: row.tags || [],
          likeCount: row._count.likes,
          isLikedByMe: row.likes.length > 0,
          createdAt: row.createdAt.toISOString(),
          personalizationScore: scored.score,
          personalizationReasons: scored.reasons,
        };
      })
      .sort(
        (a: PersonalizedFeedPost, b: PersonalizedFeedPost) =>
          b.personalizationScore - a.personalizationScore || b.createdAt.localeCompare(a.createdAt),
      );

    const paged = paginateRanked(ranked, limit, cursorId);

    return {
      posts: paged.items,
      nextCursor: encodeCursor(paged.nextCursor),
      hasMore: paged.hasMore,
    };
  }

  private async loadStyleProfile(userId: string): Promise<StyleProfile | null> {
    const model = this.prisma.styleProfile;
    if (!model || typeof model.findUnique !== 'function') {
      return null;
    }

    const row = await model.findUnique({ where: { userId } });
    if (!row) return null;

    return {
      userId: row.userId,
      contexts: row.contexts,
      dressCodes: row.dressCodes,
      climate: row.climate,
      rainy: row.rainy,
      fitPreference: row.fitPreference,
      archetypes: row.archetypes,
      riskLevel: row.riskLevel,
      preferredNeutrals: row.preferredNeutrals,
      likedColors: row.likedColors,
      avoidedColors: row.avoidedColors,
      patternComfort: row.patternComfort,
      shoesPreference: row.shoesPreference,
      accessoriesLevel: row.accessoriesLevel,
      comfortConstraints: row.comfortConstraints,
      shoppingInterest: row.shoppingInterest,
      budgetBand: row.budgetBand,
      heightRange: row.heightRange || undefined,
      proportions: row.proportions || undefined,
      shoulderWidth: row.shoulderWidth || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function scoreExploreRow(row: any, profile: StyleProfile | null): { score: number; reasons: string[] } {
  if (!profile) {
    return {
      score: 40,
      reasons: ['Cold-start fallback: showing recent and popular looks.'],
    };
  }

  const profileArchetypes = toLower(profile.archetypes);
  const profileLiked = toLower(profile.likedColors);
  const profileAvoided = toLower(profile.avoidedColors);
  const profileDressCodes = toLower(profile.dressCodes);
  const profileContexts = toLower(profile.contexts);
  const preferredSeason = inferSeason(profile.climate);
  const reasons: string[] = [];

  let score = 25;

  const rowArchetypes = toLower(row.archetypes || []);
  const rowColors = toLower(row.colors || []);
  const rowContexts = toLower([...(row.contextTags || []), ...(row.vibeKeywords || [])]);
  const rowDressCode = String(row.dressCode || '').toLowerCase();
  const rowSeason = String(row.season || '').toLowerCase();
  const patternLevel = String(row.patternLevel || 'low').toLowerCase();

  const archetypeMatches = rowArchetypes.filter((a: string) => profileArchetypes.includes(a));
  if (archetypeMatches.length > 0) {
    score += archetypeMatches.length * 10;
    reasons.push(`Matches your ${archetypeMatches.slice(0, 2).join(', ')} style archetype.`);
  }

  const likedMatches = rowColors.filter((color: string) => profileLiked.includes(color));
  if (likedMatches.length > 0) {
    score += likedMatches.length * 4;
    reasons.push(`Uses colors you like: ${likedMatches.slice(0, 2).join(', ')}.`);
  }

  const avoidedMatches = rowColors.filter((color: string) => profileAvoided.includes(color));
  if (avoidedMatches.length > 0) {
    score -= avoidedMatches.length * 12;
    reasons.push(`Penalized: includes avoided color ${avoidedMatches[0]}.`);
  }

  if (profileDressCodes.includes(rowDressCode)) {
    score += 8;
    reasons.push(`Aligned with your ${rowDressCode} dress-code preference.`);
  }

  if (rowSeason === preferredSeason) {
    score += 6;
    reasons.push(`Season fit: ${preferredSeason}.`);
  }

  const contextMatches = rowContexts.filter((context: string) => profileContexts.some((pc: string) => context.includes(pc.toLowerCase())));
  if (contextMatches.length > 0) {
    score += 6;
    reasons.push('Boosted for matching your frequent context/lifestyle moments.');
  }

  if (profile.patternComfort === 'Solids only' && patternLevel !== 'low') {
    score -= 10;
    reasons.push('Pattern level softened by your solids-first preference.');
  }

  if (profile.patternComfort === 'Some patterns' && patternLevel === 'high') {
    score -= 6;
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    reasons: reasons.length > 0 ? reasons.slice(0, 3) : ['General match from your style profile.'],
  };
}

function scoreLegacyPost(post: any, profile: StyleProfile | null): { score: number; reasons: string[] } {
  if (!profile) {
    return {
      score: Math.round(35 + Math.min(post._count.likes, 30) * 0.6),
      reasons: ['Cold-start fallback: trending and recent looks.'],
    };
  }

  const tags = toLower(post.tags || []);
  const profileArchetypes = toLower(profile.archetypes);
  const profileDressCodes = toLower(profile.dressCodes);
  const profileContexts = toLower(profile.contexts);

  let score = 20 + Math.min(post._count.likes, 20);
  const reasons: string[] = [];

  const archetypeMatches = tags.filter((tag: string) => profileArchetypes.some((a: string) => tag.includes(a)));
  if (archetypeMatches.length > 0) {
    score += archetypeMatches.length * 8;
    reasons.push(`Matched style tags: ${archetypeMatches.slice(0, 2).join(', ')}.`);
  }

  const dressCodeMatches = tags.filter((tag: string) => profileDressCodes.some((d: string) => tag.includes(d)));
  if (dressCodeMatches.length > 0) {
    score += 6;
    reasons.push('Dress-code tags match your preferences.');
  }

  const contextMatches = tags.filter((tag: string) => profileContexts.some((c: string) => tag.includes(c)));
  if (contextMatches.length > 0) {
    score += 4;
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    reasons: reasons.length > 0 ? reasons.slice(0, 3) : ['General match from your style profile.'],
  };
}

function paginateRanked<T extends { id: string }>(items: T[], limit: number, cursorId: string | null) {
  let start = 0;

  if (cursorId) {
    const idx = items.findIndex((item) => item.id === cursorId);
    if (idx >= 0) {
      start = idx + 1;
    }
  }

  const slice = items.slice(start, start + limit);
  const next = items[start + limit]?.id || null;

  return {
    items: slice,
    nextCursor: next,
    hasMore: next !== null,
  };
}

function encodeCursor(value: string | null): string | null {
  if (!value) return null;
  return Buffer.from(value).toString('base64');
}

function decodeCursor(value?: string): string | null {
  if (!value) return null;
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function inferSeason(climate: string): string {
  const value = climate.toLowerCase();
  if (value === 'hot') return 'summer';
  if (value === 'cold') return 'winter';
  if (value === 'mild') return 'spring';
  return 'fall';
}

function toLower(values: string[]): string[] {
  return values.map((value) => value.toLowerCase());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
