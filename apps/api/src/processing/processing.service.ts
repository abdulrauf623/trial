import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ConfigService } from '../config/config.service';

export interface ProcessingResult {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  dominantColors: string[];
  dominantHex: string;
  detectedCategory: string;
  confidence: number;
  detectedPattern: string | null;
  detectedMaterial: string | null;
  detectedTags: string[];
}

const BG_REMOVAL_TIMEOUT_MS = 30_000;

@Injectable()
export class ProcessingService {
  constructor(private config: ConfigService) {}

  /**
   * Isolate a garment/object for collage rendering.
   * Returns a PNG buffer; falls back to the original image if isolation fails.
   */
  async isolateForOutfit(imageBuffer: Buffer): Promise<Buffer> {
    const normalized = await sharp(imageBuffer).rotate().png().toBuffer();
    return this.removeBackground(normalized);
  }

  /**
   * Process a garment image: resize, remove background, extract colors
   */
  async processGarmentImage(originalBuffer: Buffer): Promise<ProcessingResult> {
    console.log('[Processing] Starting image processing');

    // Step 1: Auto-orient and validate
    let image = sharp(originalBuffer).rotate(); // Auto-rotate based on EXIF

    const metadata = await image.metadata();
    console.log('[Processing] Image metadata:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    });

    // Step 2: Resize to max 2048px while maintaining aspect ratio
    const MAX_SIZE = 2048;
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > MAX_SIZE) {
        image = image.resize(MAX_SIZE, MAX_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        });
        console.log('[Processing] Resized image to fit within 2048px');
      }
    }

    // Step 3: Remove background using rembg (primary) or remove.bg (fallback)
    const resizedBuffer = await image.png().toBuffer();
    const processedBuffer = await this.removeBackground(resizedBuffer);

    // Step 4: Create thumbnail (400px)
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    console.log('[Processing] Created thumbnail');

    // Step 5: Extract dominant colors from non-transparent pixels
    const colors = await this.extractDominantColors(processedBuffer);
    console.log('[Processing] Extracted colors:', colors);

    // Step 6: Detect category (simplified rule-based)
    const { category, confidence } = await this.detectCategory(processedBuffer, metadata);
    console.log('[Processing] Detected category:', category, 'confidence:', confidence);

    // Step 7: Detect pattern, material, and occasion tags using AI
    const aiAttributes = await this.detectAIAttributes(processedBuffer);
    console.log('[Processing] AI attributes:', aiAttributes);

    return {
      processedBuffer,
      thumbnailBuffer,
      dominantColors: colors.slice(0, 5), // Top 5 colors
      dominantHex: colors[0] || '#000000',
      detectedCategory: category,
      confidence,
      detectedPattern: aiAttributes.pattern,
      detectedMaterial: aiAttributes.material,
      detectedTags: aiAttributes.tags,
    };
  }

  private async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    // Try rembg (self-hosted Docker service) first
    const rembgResult = await this.removeBackgroundWithRembg(imageBuffer);
    if (rembgResult) return rembgResult;

    // Fall back to remove.bg cloud API
    const removeBgResult = await this.removeBackgroundWithRemoveBg(imageBuffer);
    if (removeBgResult) return removeBgResult;

    // Last resort: return original as PNG (no background removal)
    console.warn('[Processing] All background removal services unavailable, returning original image');
    return imageBuffer;
  }

  /**
   * Remove background using self-hosted rembg service
   */
  private async removeBackgroundWithRembg(imageBuffer: Buffer): Promise<Buffer | null> {
    const rembgUrl = this.config.rembgUrl;
    if (!rembgUrl) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BG_REMOVAL_TIMEOUT_MS);

    try {
      console.log(`[Processing] Calling rembg at ${rembgUrl}/api/remove`);

      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');

      const response = await fetch(`${rembgUrl}/api/remove`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(`[Processing] rembg returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const result = Buffer.from(arrayBuffer);
      console.log(`[Processing] rembg success, output size: ${result.length} bytes`);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[Processing] rembg request timed out');
      } else {
        console.error('[Processing] rembg failed:', error.message);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Remove background using remove.bg cloud API (fallback)
   */
  private async removeBackgroundWithRemoveBg(imageBuffer: Buffer): Promise<Buffer | null> {
    const apiKey = this.config.removeBgApiKey;
    if (!apiKey) {
      console.log('[Processing] remove.bg API key not configured, skipping fallback');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BG_REMOVAL_TIMEOUT_MS);

    try {
      console.log('[Processing] Calling remove.bg API (fallback)');

      const formData = new FormData();
      formData.append('image_file', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
      formData.append('size', 'auto');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        console.error(`[Processing] remove.bg returned ${response.status}: ${errorText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const result = Buffer.from(arrayBuffer);
      console.log(`[Processing] remove.bg success, output size: ${result.length} bytes`);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[Processing] remove.bg request timed out');
      } else {
        console.error('[Processing] remove.bg failed:', error.message);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(buffer: Buffer): Promise<string[]> {
    const stats = await sharp(buffer).stats();
    const colors = stats.channels.map((channel) => {
      const value = Math.round(channel.mean);
      return value.toString(16).padStart(2, '0');
    });

    const hexColor = `#${colors.slice(0, 3).join('')}`;
    return [hexColor];
  }

  /**
   * Detect garment category using simple rules
   * In production, use a vision AI model
   */
  private async detectCategory(
    _buffer: Buffer,
    metadata: sharp.Metadata
  ): Promise<{ category: string; confidence: number }> {
    const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 1;

    if (aspectRatio > 1.2) {
      return { category: 'pants', confidence: 0.6 };
    } else if (aspectRatio < 0.8) {
      return { category: 'dress', confidence: 0.6 };
    } else {
      return { category: 'tshirt', confidence: 0.5 };
    }
  }

  /**
   * Detect pattern, material, and occasion tags using AI (GPT-4 Vision)
   * For now, returns placeholder values. In production, call OpenAI API.
   */
  private async detectAIAttributes(
    _buffer: Buffer
  ): Promise<{ pattern: string | null; material: string | null; tags: string[] }> {
    console.log('[Processing] AI attribute detection (placeholder)');

    return {
      pattern: 'solid',
      material: 'cotton',
      tags: ['casual'],
    };
  }
}
