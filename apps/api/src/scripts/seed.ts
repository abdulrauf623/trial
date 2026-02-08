import * as bcrypt from 'bcrypt';

const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any };
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.like.deleteMany();
  await prisma.wardrobeItem.deleteMany();
  await prisma.wardrobeCollection.deleteMany();
  await prisma.clothingItem.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();

  // Create users
  const password = await bcrypt.hash('password123', 12);

  const creator1 = await prisma.user.upsert({
    where: { email: 'creator1@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Alex Chen',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=12',
      stylePreferences: ['minimalist', 'streetwear'],
    },
    create: {
      email: 'creator1@example.com',
      passwordHash: password,
      displayName: 'Alex Chen',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=12',
      stylePreferences: ['minimalist', 'streetwear'],
    },
  });

  const creator2 = await prisma.user.upsert({
    where: { email: 'creator2@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Jordan Lee',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=33',
      stylePreferences: ['vintage', 'casual'],
    },
    create: {
      email: 'creator2@example.com',
      passwordHash: password,
      displayName: 'Jordan Lee',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=33',
      stylePreferences: ['vintage', 'casual'],
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Sam Taylor',
      accountType: 'user',
      isPremium: true,
      stylePreferences: ['streetwear', 'sporty'],
    },
    create: {
      email: 'user@example.com',
      passwordHash: password,
      displayName: 'Sam Taylor',
      accountType: 'user',
      isPremium: true,
      stylePreferences: ['streetwear', 'sporty'],
    },
  });

  console.log('✅ Created 3 users');

  // Create posts with clothing items
  const post1 = await prisma.post.create({
    data: {
      creatorId: creator1.id,
      caption: 'All black everything 🖤 Leather bomber jacket season',
      imageUrls: [
        'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800',
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
      ],
      tags: ['#ootd', '#streetwear', '#allblack'],
      engagementScore: 15.2,
      clothingItems: {
        create: [
          {
            imageIndex: 0,
            bbox: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 },
            category: 'jacket',
            brand: 'SPRMRKT',
            name: 'Black Leather Bomber Jacket',
            price: 189.99,
            color: 'black',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.3, y: 0.65, width: 0.4, height: 0.3 },
            category: 'pants',
            brand: 'Uniqlo',
            name: 'Slim Fit Black Trousers',
            price: 49.99,
            color: 'black',
            source: 'creator',
          },
        ],
      },
    },
  });

  // Additional posts for variety (not used directly, just for seeding)
  await prisma.post.create({
    data: {
      creatorId: creator1.id,
      caption: 'Wide leg pants are back 👌',
      imageUrls: [
        'https://images.unsplash.com/photo-1594938291221-94f18cbb5660?w=800',
      ],
      tags: ['#fashion', '#minimalist'],
      engagementScore: 22.5,
      clothingItems: {
        create: [
          {
            imageIndex: 0,
            bbox: { x: 0.2, y: 0.3, width: 0.6, height: 0.5 },
            category: 'pants',
            brand: 'SHEIN USA',
            name: 'Woven Casual Loose Wide Leg Pants',
            price: 35.99,
            color: 'beige',
            pattern: 'solid',
            productUrl: 'https://example.com/product/123',
            source: 'creator',
          },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      creatorId: creator2.id,
      caption: 'Cozy fall vibes 🍂☕',
      imageUrls: [
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
      ],
      tags: ['#fall', '#cozy'],
      engagementScore: 18.7,
      clothingItems: {
        create: [
          {
            imageIndex: 0,
            bbox: { x: 0.3, y: 0.25, width: 0.4, height: 0.35 },
            category: 'sweater',
            brand: 'Amazon',
            name: 'Ribbed Turtleneck Sweater',
            price: 42.00,
            color: 'cream',
            pattern: 'ribbed',
            source: 'creator',
          },
        ],
      },
    },
  });

  const additionalPostSeeds = [
    {
      creatorId: creator1.id,
      caption: 'Monochrome layers for a rainy day.',
      imageUrls: ['https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800'],
      tags: ['#monochrome', '#rainyday', '#layering'],
      engagementScore: 24.4,
      clothingItems: [
        { imageIndex: 0, category: 'coat', brand: 'COS', name: 'Charcoal Overcoat', price: 229.0, color: 'charcoal', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Weekend denim with a clean white tee.',
      imageUrls: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
      tags: ['#denim', '#casual', '#weekendfit'],
      engagementScore: 19.8,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Everlane', name: 'Organic Cotton Tee', price: 28.0, color: 'white', pattern: 'solid' },
        { imageIndex: 0, category: 'pants', brand: "Levi's", name: 'Straight Blue Denim', price: 89.0, color: 'blue', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Coffee run fit with neutral tones.',
      imageUrls: ['https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800'],
      tags: ['#neutral', '#coffeerun', '#ootd'],
      engagementScore: 16.2,
      clothingItems: [
        { imageIndex: 0, category: 'hoodie', brand: 'Aritzia', name: 'Fleece Zip Hoodie', price: 74.0, color: 'beige', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Sporty set for errands and brunch.',
      imageUrls: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'],
      tags: ['#athleisure', '#sporty', '#brunchfit'],
      engagementScore: 21.1,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Nike', name: 'Ribbed Crop Top', price: 39.0, color: 'black', pattern: 'solid' },
        { imageIndex: 0, category: 'pants', brand: 'Alo', name: 'High-Waist Leggings', price: 118.0, color: 'black', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Office-ready blazer and relaxed trousers.',
      imageUrls: ['https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800'],
      tags: ['#workwear', '#blazer', '#smartcasual'],
      engagementScore: 28.6,
      clothingItems: [
        { imageIndex: 0, category: 'blazer', brand: 'Theory', name: 'Classic Tailored Blazer', price: 295.0, color: 'navy', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Retro sneakers and loose cargo pants.',
      imageUrls: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800'],
      tags: ['#streetwear', '#retro', '#sneakers'],
      engagementScore: 26.5,
      clothingItems: [
        { imageIndex: 0, category: 'pants', brand: 'Carhartt', name: 'Loose Cargo Pant', price: 98.0, color: 'olive', pattern: 'solid' },
        { imageIndex: 0, category: 'shoes', brand: 'New Balance', name: '530 Sneakers', price: 109.0, color: 'gray', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Date night satin slip and cropped jacket.',
      imageUrls: ['https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800'],
      tags: ['#datenight', '#satin', '#evening'],
      engagementScore: 31.9,
      clothingItems: [
        { imageIndex: 0, category: 'dress', brand: 'Reformation', name: 'Satin Slip Dress', price: 198.0, color: 'emerald', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Airport layers that still look sharp.',
      imageUrls: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'],
      tags: ['#travelstyle', '#layers', '#minimal'],
      engagementScore: 23.3,
      clothingItems: [
        { imageIndex: 0, category: 'jacket', brand: 'Uniqlo', name: 'Packable Puffer', price: 79.9, color: 'black', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Bold color blocking for spring.',
      imageUrls: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800'],
      tags: ['#spring', '#colorblock', '#statement'],
      engagementScore: 20.7,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Zara', name: 'Colorblock Knit Top', price: 49.9, color: 'multicolor', pattern: 'colorblock' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Clean all-white summer setup.',
      imageUrls: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800'],
      tags: ['#summer', '#allwhite', '#cleanfit'],
      engagementScore: 27.4,
      clothingItems: [
        { imageIndex: 0, category: 'shirt', brand: 'LinenCo', name: 'Linen Button Shirt', price: 64.0, color: 'white', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Throwback varsity vibe this week.',
      imageUrls: ['https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=800'],
      tags: ['#varsity', '#vintage', '#campus'],
      engagementScore: 17.6,
      clothingItems: [
        { imageIndex: 0, category: 'jacket', brand: 'Champion', name: 'Varsity Bomber', price: 120.0, color: 'green', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Minimal black dress with silver accents.',
      imageUrls: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'],
      tags: ['#minimal', '#blackdress', '#nightout'],
      engagementScore: 29.7,
      clothingItems: [
        { imageIndex: 0, category: 'dress', brand: 'Mango', name: 'Sleeveless Midi Dress', price: 89.0, color: 'black', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Utility vest and straight-leg denim combo.',
      imageUrls: ['https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800'],
      tags: ['#utility', '#denim', '#streetstyle'],
      engagementScore: 18.9,
      clothingItems: [
        { imageIndex: 0, category: 'vest', brand: 'H&M', name: 'Utility Pocket Vest', price: 45.0, color: 'khaki', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator2.id,
      caption: 'Pleated skirt and chunky knit pairing.',
      imageUrls: ['https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800'],
      tags: ['#knitwear', '#pleated', '#fallstyle'],
      engagementScore: 22.2,
      clothingItems: [
        { imageIndex: 0, category: 'skirt', brand: 'Uniqlo', name: 'Pleated Midi Skirt', price: 59.9, color: 'tan', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator1.id,
      caption: 'Sunday lounge set, soft and oversized.',
      imageUrls: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800'],
      tags: ['#loungewear', '#comfy', '#weekend'],
      engagementScore: 14.8,
      clothingItems: [
        { imageIndex: 0, category: 'set', brand: 'Skims', name: 'Soft Lounge Set', price: 96.0, color: 'gray', pattern: 'solid' },
      ],
    },
  ];

  for (const seed of additionalPostSeeds) {
    await prisma.post.create({
      data: {
        creatorId: seed.creatorId,
        caption: seed.caption,
        imageUrls: seed.imageUrls,
        tags: seed.tags,
        engagementScore: seed.engagementScore,
        clothingItems: {
          create: seed.clothingItems.map((item) => ({
            ...item,
            source: 'creator',
          })),
        },
      },
    });
  }

  console.log(`✅ Created ${3 + additionalPostSeeds.length} posts with clothing items`);

  // Create wardrobe collection for user1
  const collection = await prisma.wardrobeCollection.create({
    data: {
      userId: user1.id,
      name: 'Winter Essentials',
      icon: '🧥',
      sortOrder: 0,
    },
  });

  // Add item to wardrobe
  const item1 = await prisma.clothingItem.findFirst({ where: { postId: post1.id } });
  if (item1) {
    await prisma.wardrobeItem.create({
      data: {
        userId: user1.id,
        collectionId: collection.id,
        clothingItemId: item1.id,
        snapshot: { name: item1.name, brand: item1.brand, price: item1.price },
        notes: 'Love this bomber jacket!',
      },
    });
  }

  console.log('✅ Created wardrobe collection with 1 item');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
