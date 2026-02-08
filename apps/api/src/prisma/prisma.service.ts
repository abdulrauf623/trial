import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

type PrismaMethod = (...args: any[]) => Promise<any>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: any;

  public readonly user: any;
  public readonly post: any;
  public readonly like: any;
  public readonly savedPost: any;
  public readonly wardrobeItem: any;
  public readonly wardrobeCollection: any;
  public readonly clothingItem: any;
  public readonly follow: any;
  public readonly report: any;
  public readonly $executeRaw: PrismaMethod;
  public readonly $queryRaw: PrismaMethod;

  constructor() {
    // Load Prisma at runtime so TypeScript doesn't depend on generated client types.
    // This avoids monorepo/dev-env mismatches while keeping runtime behavior unchanged.
    const { PrismaClient } = require('@prisma/client') as { PrismaClient: new (options?: any) => any };
    this.client = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });

    this.user = this.client.user;
    this.post = this.client.post;
    this.like = this.client.like;
    this.savedPost = this.client.savedPost;
    this.wardrobeItem = this.client.wardrobeItem;
    this.wardrobeCollection = this.client.wardrobeCollection;
    this.clothingItem = this.client.clothingItem;
    this.follow = this.client.follow;
    this.report = this.client.report;
    this.$executeRaw = this.client.$executeRaw.bind(this.client);
    this.$queryRaw = this.client.$queryRaw.bind(this.client);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
