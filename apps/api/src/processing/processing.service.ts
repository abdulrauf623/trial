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

@Injectable()
export class ProcessingService {
  constructor(_config: ConfigService) {}

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

    // Step 3: Remove background (simplified - just use the original for now)
    // In production, you'd call Replicate API or use a background removal model
    const processedBuffer = await this.removeBackground(image);

    // Step 4: Create thumbnail (400px)
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
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

  /**
   * Remove background from image
   * For now, just convert to PNG and return. In production, use Replicate API.
   */
  private async removeBackground(image: sharp.Sharp): Promise<Buffer> {
    // Simplified: Just convert to PNG for now
    // In production, you would:
    // 1. Save image to temp file
    // 2. Call Replicate API with background removal model
    // 3. Download result
    // 4. Return buffer

    console.log('[Processing] Background removal (simplified)');
    return image.png().toBuffer();
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(buffer: Buffer): Promise<string[]> {
    // Simple dominant color extraction
    // In production, use k-means clustering or a library like node-vibrant

    // For now, just return the dominant color from sharp's stats
    const stats = await sharp(buffer).stats();
    const colors = stats.channels.map((channel) => {
      const value = Math.round(channel.mean);
      return value.toString(16).padStart(2, '0');
    });

    const hexColor = `#${colors.join('')}`;
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
    // Simplified rule-based detection
    // In production, you would:
    // 1. Call OpenAI Vision API or Replicate
    // 2. Get category predictions with confidence scores
    // 3. Return top-3 categories

    const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 1;

    // Very basic heuristics
    if (aspectRatio > 1.2) {
      return { category: 'pants', confidence: 0.6 };
    } else if (aspectRatio < 0.8) {
      return { category: 'dress', confidence: 0.6 };
    } else {
      return { category: 'tshirt', confidence: 0.5 };
    }

    // In production, replace with:
    // const result = await this.callVisionAPI(buffer);
    // return { category: result.topCategory, confidence: result.topConfidence };
  }

  /**
   * Detect pattern, material, and occasion tags using AI (GPT-4 Vision)
   * For now, returns placeholder values. In production, call OpenAI API.
   */
  private async detectAIAttributes(
    _buffer: Buffer
  ): Promise<{ pattern: string | null; material: string | null; tags: string[] }> {
    // In production, you would:
    // 1. Convert buffer to base64
    // 2. Call OpenAI GPT-4 Vision API with a structured prompt
    // 3. Parse the JSON response with detected attributes
    //
    // Example prompt:
    // "Analyze this clothing item and return a JSON with:
    //  - pattern: solid, striped, floral, plaid, checkered, etc.
    //  - material: cotton, denim, wool, leather, silk, polyester, etc.
    //  - tags: array of occasion tags like casual, formal, business, athletic, summer, winter
    //  Be concise and only return the JSON."
    //
    // const base64Image = buffer.toString('base64');
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4-vision-preview',
    //   messages: [{
    //     role: 'user',
    //     content: [
    //       { type: 'text', text: 'Analyze this clothing...' },
    //       { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
    //     ]
    //   }],
    //   max_tokens: 300,
    // });
    // const result = JSON.parse(response.choices[0].message.content);
    // return { pattern: result.pattern, material: result.material, tags: result.tags };

    console.log('[Processing] AI attribute detection (placeholder)');

    // For now, return placeholder values
    return {
      pattern: 'solid',
      material: 'cotton',
      tags: ['casual'],
    };
  }
}
