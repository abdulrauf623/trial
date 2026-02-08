import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/embeddings';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // If no API key, return a mock embedding (for development)
    if (!this.apiKey) {
      console.warn('[AI] No OpenAI API key found, returning mock embedding');
      return this.generateMockEmbedding();
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
          dimensions: 768,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('[AI] Failed to generate embedding:', error);
      // Fallback to mock embedding on error
      return this.generateMockEmbedding();
    }
  }

  async generatePostEmbedding(post: {
    caption?: string | null;
    tags: string[];
    clothingItems?: Array<{
      category?: string | null;
      brand?: string | null;
      name?: string | null;
      color?: string | null;
      pattern?: string | null;
    }>;
  }): Promise<number[]> {
    const textParts: string[] = [];

    if (post.caption) {
      textParts.push(post.caption);
    }

    if (post.tags.length > 0) {
      textParts.push(post.tags.join(' '));
    }

    if (post.clothingItems) {
      post.clothingItems.forEach((item) => {
        const itemParts: string[] = [];
        if (item.category) itemParts.push(item.category);
        if (item.brand) itemParts.push(item.brand);
        if (item.name) itemParts.push(item.name);
        if (item.color) itemParts.push(item.color);
        if (item.pattern) itemParts.push(item.pattern);
        if (itemParts.length > 0) {
          textParts.push(itemParts.join(' '));
        }
      });
    }

    const text = textParts.join('. ');
    return this.generateEmbedding(text || 'fashion post');
  }

  async generateItemEmbedding(item: {
    category?: string | null;
    brand?: string | null;
    name?: string | null;
    color?: string | null;
    pattern?: string | null;
  }): Promise<number[]> {
    const textParts: string[] = [];

    if (item.category) textParts.push(item.category);
    if (item.brand) textParts.push(item.brand);
    if (item.name) textParts.push(item.name);
    if (item.color) textParts.push(item.color);
    if (item.pattern) textParts.push(item.pattern);

    const text = textParts.join(' ');
    return this.generateEmbedding(text || 'clothing item');
  }

  private generateMockEmbedding(): number[] {
    // Generate a random 768-dimensional vector for development
    const embedding: number[] = [];
    for (let i = 0; i < 768; i++) {
      embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
    }
    return embedding;
  }

  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async findSimilarVectors(
    targetVector: number[],
    candidates: Array<{ id: string; vector: number[] }>,
    topK = 10
  ): Promise<Array<{ id: string; similarity: number }>> {
    const similarities = await Promise.all(
      candidates.map(async (candidate) => ({
        id: candidate.id,
        similarity: await this.cosineSimilarity(targetVector, candidate.vector),
      }))
    );

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  formatVectorForPostgres(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  parseVectorFromPostgres(vectorString: string): number[] {
    // Remove brackets and parse comma-separated values
    return vectorString
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((v) => parseFloat(v.trim()));
  }
}
