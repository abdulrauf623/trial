import * as bcrypt from 'bcrypt';

const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any };
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.like.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.wardrobeItem.deleteMany();
  await prisma.wardrobeCollection.deleteMany();
  await prisma.createdOutfitItem.deleteMany();
  await prisma.createdOutfit.deleteMany();
  await prisma.userPostTag.deleteMany();
  await prisma.userPost.deleteMany();
  await prisma.userGarment.deleteMany();
  await prisma.mediaUpload.deleteMany();
  await prisma.outfit.deleteMany();
  await prisma.styleProfile.deleteMany();
  await prisma.explorePost.deleteMany();
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

  const creator3 = await prisma.user.upsert({
    where: { email: 'creator3@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Maya Rodriguez',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=44',
      stylePreferences: ['bohemian', 'vintage'],
    },
    create: {
      email: 'creator3@example.com',
      passwordHash: password,
      displayName: 'Maya Rodriguez',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=44',
      stylePreferences: ['bohemian', 'vintage'],
    },
  });

  const creator4 = await prisma.user.upsert({
    where: { email: 'creator4@example.com' },
    update: {
      passwordHash: password,
      displayName: 'David Kim',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=52',
      stylePreferences: ['formal', 'business'],
    },
    create: {
      email: 'creator4@example.com',
      passwordHash: password,
      displayName: 'David Kim',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=52',
      stylePreferences: ['formal', 'business'],
    },
  });

  const creator5 = await prisma.user.upsert({
    where: { email: 'creator5@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Emma Wilson',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=20',
      stylePreferences: ['minimalist', 'modern'],
    },
    create: {
      email: 'creator5@example.com',
      passwordHash: password,
      displayName: 'Emma Wilson',
      accountType: 'creator',
      avatarUrl: 'https://i.pravatar.cc/300?img=20',
      stylePreferences: ['minimalist', 'modern'],
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

  await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Jamie Park',
      accountType: 'user',
      stylePreferences: ['casual', 'minimalist'],
    },
    create: {
      email: 'user2@example.com',
      passwordHash: password,
      displayName: 'Jamie Park',
      accountType: 'user',
      stylePreferences: ['casual', 'minimalist'],
    },
  });

  await prisma.user.upsert({
    where: { email: 'user3@example.com' },
    update: {
      passwordHash: password,
      displayName: 'Riley Johnson',
      accountType: 'user',
      stylePreferences: ['vintage', 'bohemian'],
    },
    create: {
      email: 'user3@example.com',
      passwordHash: password,
      displayName: 'Riley Johnson',
      accountType: 'user',
      stylePreferences: ['vintage', 'bohemian'],
    },
  });

  console.log('✅ Created 8 users (5 creators, 3 regular users)');

  await prisma.styleProfile.upsert({
    where: { userId: user1.id },
    update: {
      contexts: ['Weekend casual', 'Travel'],
      dressCodes: ['Casual', 'Smart casual'],
      climate: 'Mixed',
      rainy: false,
      fitPreference: 'Regular',
      archetypes: ['Minimal', 'Streetwear'],
      riskLevel: 'Balanced',
      preferredNeutrals: ['Black', 'White', 'Grey', 'Navy'],
      likedColors: ['blue', 'olive'],
      avoidedColors: ['neon'],
      patternComfort: 'Some patterns',
      shoesPreference: ['Sneakers', 'Boots'],
      accessoriesLevel: 'Minimal',
      comfortConstraints: ['no heels'],
      shoppingInterest: 'Balanced',
      budgetBand: 'Mid',
    },
    create: {
      userId: user1.id,
      contexts: ['Weekend casual', 'Travel'],
      dressCodes: ['Casual', 'Smart casual'],
      climate: 'Mixed',
      rainy: false,
      fitPreference: 'Regular',
      archetypes: ['Minimal', 'Streetwear'],
      riskLevel: 'Balanced',
      preferredNeutrals: ['Black', 'White', 'Grey', 'Navy'],
      likedColors: ['blue', 'olive'],
      avoidedColors: ['neon'],
      patternComfort: 'Some patterns',
      shoesPreference: ['Sneakers', 'Boots'],
      accessoriesLevel: 'Minimal',
      comfortConstraints: ['no heels'],
      shoppingInterest: 'Balanced',
      budgetBand: 'Mid',
    },
  });
  console.log('✅ Seeded style profile for user@example.com');

  const starterGarmentSeeds = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900',
      category: 'tshirt',
      subcategory: 'crew-neck',
      colors: ['white'],
      dominantHex: '#f5f5f5',
      pattern: 'solid',
      patternType: 'solid',
      textureTags: ['cotton'],
      formalityScore: 2,
      seasonTags: ['spring', 'summer', 'fall'],
      silhouetteTag: 'regular',
      material: 'cotton',
      brand: 'Everlane',
      tags: ['casual', 'weekend'],
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900',
      category: 'pants',
      subcategory: 'straight',
      colors: ['black'],
      dominantHex: '#1f2937',
      pattern: 'solid',
      patternType: 'solid',
      textureTags: ['denim'],
      formalityScore: 3,
      seasonTags: ['spring', 'fall', 'winter'],
      silhouetteTag: 'straight',
      material: 'denim',
      brand: "Levi's",
      tags: ['casual', 'streetwear'],
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',
      category: 'sneakers',
      subcategory: 'low-top',
      colors: ['white'],
      dominantHex: '#f3f4f6',
      pattern: 'solid',
      patternType: 'solid',
      textureTags: ['leather'],
      formalityScore: 2,
      seasonTags: ['spring', 'summer', 'fall'],
      silhouetteTag: 'regular',
      material: 'leather',
      brand: 'Nike',
      tags: ['casual', 'sporty'],
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=900',
      category: 'jacket',
      subcategory: 'bomber',
      colors: ['olive'],
      dominantHex: '#556b2f',
      pattern: 'solid',
      patternType: 'solid',
      textureTags: ['nylon'],
      formalityScore: 3,
      seasonTags: ['fall', 'winter'],
      silhouetteTag: 'regular',
      material: 'nylon',
      brand: 'Alpha Industries',
      tags: ['streetwear', 'layering'],
    },
  ];

  const seededUploadedGarments: Array<{ garmentId: string; seed: (typeof starterGarmentSeeds)[number] }> = [];

  for (const seed of starterGarmentSeeds) {
    const upload = await prisma.mediaUpload.create({
      data: {
        userId: user1.id,
        status: 'ready',
        originalUrl: seed.imageUrl,
        processedUrl: seed.imageUrl,
        thumbnailUrl: seed.imageUrl,
        metadata: { seeded: true },
      },
    });

    const garment = await prisma.userGarment.create({
      data: {
        userId: user1.id,
        mediaUploadId: upload.id,
        category: seed.category,
        subcategory: seed.subcategory,
        colors: seed.colors,
        dominantHex: seed.dominantHex,
        pattern: seed.pattern,
        patternType: seed.patternType,
        textureTags: seed.textureTags,
        formalityScore: seed.formalityScore,
        seasonTags: seed.seasonTags,
        silhouetteTag: seed.silhouetteTag,
        material: seed.material,
        brand: seed.brand,
        tags: seed.tags,
        notes: 'Starter capsule garment seeded for outfit testing',
      },
    });

    seededUploadedGarments.push({
      garmentId: garment.id,
      seed,
    });
  }
  console.log('✅ Added starter uploaded garments (top, bottom, shoes, jacket) for user@example.com');

  const sampleOutfit = await prisma.createdOutfit.create({
    data: {
      ownerUserId: user1.id,
      name: 'Starter Capsule',
      backgroundStyle: 'paper',
      items: {
        create: seededUploadedGarments.slice(0, 4).map((entry, index) => ({
          wardrobeItemId: `upload:${entry.garmentId}`,
          sourceType: 'upload',
          sourceRefId: entry.garmentId,
          imageOriginalUrl: entry.seed.imageUrl,
          imageCutoutUrl: entry.seed.imageUrl,
          category: entry.seed.category,
          colors: entry.seed.colors,
          x: [0.36, 0.64, 0.58, 0.46][index] || 0.5,
          y: [0.34, 0.52, 0.78, 0.58][index] || 0.5,
          scale: [1.06, 0.94, 0.82, 0.9][index] || 1,
          rotation: [-4, 3, 0, 6][index] || 0,
          zIndex: index,
          mirror: false,
          labelText: entry.seed.brand || entry.seed.category,
          labelVisible: false,
        })),
      },
    },
  });
  console.log(`✅ Created sample collage outfit (${sampleOutfit.id}) for user@example.com`);

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

  const starterPostCapsule = await prisma.post.create({
    data: {
      creatorId: creator5.id,
      caption: '[STARTER] Core capsule look: tee + trousers + sneakers',
      imageUrls: [
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900',
      ],
      tags: ['#starter', '#outfitbuilder', '#capsule'],
      engagementScore: 99.9,
      clothingItems: {
        create: [
          {
            imageIndex: 0,
            bbox: { x: 0.24, y: 0.12, width: 0.5, height: 0.3 },
            category: 'tshirt',
            brand: 'Everlane',
            name: 'Starter White Tee',
            price: 28.0,
            color: 'white',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.24, y: 0.44, width: 0.5, height: 0.36 },
            category: 'pants',
            brand: "Levi's",
            name: 'Starter Black Trousers',
            price: 92.0,
            color: 'black',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.28, y: 0.81, width: 0.45, height: 0.16 },
            category: 'sneakers',
            brand: 'Nike',
            name: 'Starter White Sneakers',
            price: 110.0,
            color: 'white',
            pattern: 'solid',
            source: 'creator',
          },
        ],
      },
    },
  });

  const starterPostLayered = await prisma.post.create({
    data: {
      creatorId: creator1.id,
      caption: '[STARTER] Layered street look: hoodie + cargo + boots',
      imageUrls: [
        'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=900',
      ],
      tags: ['#starter', '#outfitbuilder', '#layered'],
      engagementScore: 97.5,
      clothingItems: {
        create: [
          {
            imageIndex: 0,
            bbox: { x: 0.24, y: 0.16, width: 0.5, height: 0.32 },
            category: 'hoodie',
            brand: 'Aritzia',
            name: 'Starter Grey Hoodie',
            price: 74.0,
            color: 'grey',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.25, y: 0.5, width: 0.5, height: 0.33 },
            category: 'pants',
            brand: 'Carhartt',
            name: 'Starter Olive Cargo',
            price: 98.0,
            color: 'olive',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.28, y: 0.83, width: 0.44, height: 0.15 },
            category: 'boots',
            brand: 'Dr. Martens',
            name: 'Starter Black Boots',
            price: 160.0,
            color: 'black',
            pattern: 'solid',
            source: 'creator',
          },
          {
            imageIndex: 0,
            bbox: { x: 0.2, y: 0.06, width: 0.58, height: 0.25 },
            category: 'jacket',
            brand: 'Alpha Industries',
            name: 'Starter Olive Bomber',
            price: 149.0,
            color: 'olive',
            pattern: 'solid',
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
    {
      creatorId: creator3.id,
      caption: 'Flowy bohemian maxi dress for summer festivals.',
      imageUrls: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'],
      tags: ['#bohemian', '#festival', '#summerstyle'],
      engagementScore: 25.3,
      clothingItems: [
        { imageIndex: 0, category: 'dress', brand: 'Free People', name: 'Floral Maxi Dress', price: 168.0, color: 'multicolor', pattern: 'floral' },
      ],
    },
    {
      creatorId: creator3.id,
      caption: 'Vintage leather jacket paired with mom jeans.',
      imageUrls: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'],
      tags: ['#vintage', '#leather', '#momjeans'],
      engagementScore: 28.9,
      clothingItems: [
        { imageIndex: 0, category: 'jacket', brand: 'Vintage', name: 'Brown Leather Jacket', price: 145.0, color: 'brown', pattern: 'solid' },
        { imageIndex: 0, category: 'pants', brand: "Levi's", name: 'Mom Jeans', price: 98.0, color: 'blue', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator4.id,
      caption: 'Sharp navy suit for the boardroom.',
      imageUrls: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800'],
      tags: ['#business', '#suit', '#professional'],
      engagementScore: 32.1,
      clothingItems: [
        { imageIndex: 0, category: 'suit', brand: 'Hugo Boss', name: 'Slim Fit Suit', price: 795.0, color: 'navy', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator4.id,
      caption: 'Business casual Friday with a crisp oxford shirt.',
      imageUrls: ['https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'],
      tags: ['#businesscasual', '#oxford', '#friday'],
      engagementScore: 24.7,
      clothingItems: [
        { imageIndex: 0, category: 'shirt', brand: 'Brooks Brothers', name: 'Oxford Button Down', price: 79.5, color: 'white', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator5.id,
      caption: 'Minimalist modern look with clean lines.',
      imageUrls: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'],
      tags: ['#minimalist', '#modern', '#cleanlines'],
      engagementScore: 27.8,
      clothingItems: [
        { imageIndex: 0, category: 'coat', brand: 'COS', name: 'Structured Wool Coat', price: 350.0, color: 'camel', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator5.id,
      caption: 'Monochrome perfection in shades of grey.',
      imageUrls: ['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800'],
      tags: ['#monochrome', '#grey', '#minimal'],
      engagementScore: 26.4,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Everlane', name: 'Cashmere Sweater', price: 135.0, color: 'grey', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator3.id,
      caption: 'Crochet top and high-waisted shorts for beach vibes.',
      imageUrls: ['https://images.unsplash.com/photo-1560243563-062bfc001d68?w=800'],
      tags: ['#beach', '#crochet', '#summer'],
      engagementScore: 21.5,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Urban Outfitters', name: 'Crochet Halter Top', price: 48.0, color: 'white', pattern: 'crochet' },
      ],
    },
    {
      creatorId: creator4.id,
      caption: 'Elegant evening wear with a modern twist.',
      imageUrls: ['https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=800'],
      tags: ['#evening', '#elegant', '#formal'],
      engagementScore: 33.2,
      clothingItems: [
        { imageIndex: 0, category: 'dress', brand: 'Armani', name: 'Silk Evening Gown', price: 1250.0, color: 'black', pattern: 'solid' },
      ],
    },
    {
      creatorId: creator5.id,
      caption: 'Sleek turtleneck and tailored pants combo.',
      imageUrls: ['https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800'],
      tags: ['#turtleneck', '#tailored', '#sleek'],
      engagementScore: 23.9,
      clothingItems: [
        { imageIndex: 0, category: 'top', brand: 'Uniqlo', name: 'Merino Turtleneck', price: 49.9, color: 'black', pattern: 'solid' },
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

  console.log(`✅ Created ${5 + additionalPostSeeds.length} posts with clothing items`);

  // Create wardrobe collection for user1
  const collection = await prisma.wardrobeCollection.create({
    data: {
      userId: user1.id,
      name: 'Winter Essentials',
      icon: 'coat',
      sortOrder: 0,
    },
  });

  const starterWardrobeItems = await prisma.clothingItem.findMany({
    where: {
      postId: { in: [starterPostCapsule.id, starterPostLayered.id, post1.id] },
    },
    include: {
      post: {
        select: {
          imageUrls: true,
        },
      },
    },
  });

  let starterAdded = 0;
  for (const clothingItem of starterWardrobeItems) {
    await prisma.wardrobeItem.create({
      data: {
        userId: user1.id,
        collectionId: collection.id,
        clothingItemId: clothingItem.id,
        snapshot: {
          id: clothingItem.id,
          postId: clothingItem.postId,
          imageIndex: clothingItem.imageIndex,
          category: clothingItem.category,
          brand: clothingItem.brand,
          name: clothingItem.name,
          price: clothingItem.price ? parseFloat(clothingItem.price.toString()) : null,
          color: clothingItem.color,
          pattern: clothingItem.pattern,
          imageUrls: clothingItem.post.imageUrls,
        },
        notes: 'Starter seeded wardrobe item',
      },
    });
    starterAdded += 1;
  }

  console.log(`✅ Created wardrobe collection with ${starterAdded} starter items`);
  console.log('✅ Starter posts to save manually in-app for testing:');
  console.log('   1) [STARTER] Core capsule look: tee + trousers + sneakers');
  console.log('   2) [STARTER] Layered street look: hoodie + cargo + boots');
  console.log('   Save either one to get top + bottom + shoes required for outfit generation.');
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
