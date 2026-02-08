import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

interface Job {
  id: string;
  type: 'generate_post_embedding' | 'generate_item_embedding';
  data: any;
  retries: number;
  maxRetries: number;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private queue: Job[] = [];
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) {}

  onModuleInit() {
    // Start processing queue every 5 seconds
    setInterval(() => {
      this.processQueue();
    }, 5000);

    console.log('[Queue] Job queue service initialized');
  }

  async enqueuePostEmbedding(postId: string) {
    const job: Job = {
      id: `post-${postId}-${Date.now()}`,
      type: 'generate_post_embedding',
      data: { postId },
      retries: 0,
      maxRetries: 3,
    };

    this.queue.push(job);
    console.log(`[Queue] Enqueued job ${job.id}`);
  }

  async enqueueItemEmbedding(itemId: string) {
    const job: Job = {
      id: `item-${itemId}-${Date.now()}`,
      type: 'generate_item_embedding',
      data: { itemId },
      retries: 0,
      maxRetries: 3,
    };

    this.queue.push(job);
    console.log(`[Queue] Enqueued job ${job.id}`);
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const job = this.queue.shift();
      if (!job) return;

      console.log(`[Queue] Processing job ${job.id}`);

      try {
        await this.processJob(job);
        console.log(`[Queue] Job ${job.id} completed`);
      } catch (error) {
        console.error(`[Queue] Job ${job.id} failed:`, error);

        if (job.retries < job.maxRetries) {
          job.retries++;
          this.queue.push(job);
          console.log(`[Queue] Job ${job.id} requeued (retry ${job.retries}/${job.maxRetries})`);
        } else {
          console.error(`[Queue] Job ${job.id} failed permanently after ${job.maxRetries} retries`);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: Job) {
    switch (job.type) {
      case 'generate_post_embedding':
        await this.generatePostEmbedding(job.data.postId);
        break;
      case 'generate_item_embedding':
        await this.generateItemEmbedding(job.data.itemId);
        break;
      default:
        console.warn(`[Queue] Unknown job type: ${job.type}`);
    }
  }

  private async generatePostEmbedding(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        clothingItems: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const embedding = await this.aiService.generatePostEmbedding({
      caption: post.caption,
      tags: post.tags,
      clothingItems: post.clothingItems,
    });

    const vectorString = this.aiService.formatVectorForPostgres(embedding);

    await this.prisma.$executeRaw`
      UPDATE posts
      SET embedding = ${vectorString}::vector
      WHERE id = ${postId}::uuid
    `;

    console.log(`[Queue] Generated embedding for post ${postId}`);
  }

  private async generateItemEmbedding(itemId: string) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const embedding = await this.aiService.generateItemEmbedding({
      category: item.category,
      brand: item.brand,
      name: item.name,
      color: item.color,
      pattern: item.pattern,
    });

    const vectorString = this.aiService.formatVectorForPostgres(embedding);

    await this.prisma.$executeRaw`
      UPDATE clothing_items
      SET embedding = ${vectorString}::vector
      WHERE id = ${itemId}::uuid
    `;

    console.log(`[Queue] Generated embedding for item ${itemId}`);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}
