const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any };

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('Setting up test data...');

  // Clean up existing data
  await prisma.like.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.wardrobeItem.deleteMany();
  await prisma.clothingItem.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.report.deleteMany();
  await prisma.wardrobeCollection.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const creator = await prisma.user.create({
    data: {
      email: 'creator@test.com',
      passwordHash: '$2b$10$test', // Mock hash
      displayName: 'Test Creator',
      accountType: 'creator',
      avatarUrl: 'https://via.placeholder.com/150',
      isPremium: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@test.com',
      passwordHash: '$2b$10$test',
      displayName: 'Test User',
      accountType: 'user',
      avatarUrl: 'https://via.placeholder.com/150',
    },
  });

  // Create test posts
  const post1 = await prisma.post.create({
    data: {
      creatorId: creator.id,
      caption: 'Summer outfit inspiration',
      imageUrls: [
        'https://via.placeholder.com/600x800',
        'https://via.placeholder.com/600x800',
      ],
      tags: ['summer', 'casual', 'streetwear'],
      engagementScore: 100,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      creatorId: creator.id,
      caption: 'Winter wardrobe essentials',
      imageUrls: ['https://via.placeholder.com/600x800'],
      tags: ['winter', 'formal', 'layering'],
      engagementScore: 85,
    },
  });

  // Create clothing items
  await prisma.clothingItem.createMany({
    data: [
      {
        postId: post1.id,
        imageIndex: 0,
        category: 'top',
        brand: 'Nike',
        name: 'Classic White T-Shirt',
        price: 29.99,
        color: 'white',
        pattern: 'solid',
        source: 'creator',
      },
      {
        postId: post1.id,
        imageIndex: 0,
        category: 'bottom',
        brand: 'Levi\'s',
        name: 'Blue Jeans',
        price: 79.99,
        color: 'blue',
        pattern: 'solid',
        source: 'creator',
      },
      {
        postId: post2.id,
        imageIndex: 0,
        category: 'outerwear',
        brand: 'Canada Goose',
        name: 'Winter Jacket',
        price: 299.99,
        color: 'black',
        pattern: 'solid',
        source: 'creator',
      },
    ],
  });

  // Create some interactions
  await prisma.like.create({
    data: {
      userId: user.id,
      postId: post1.id,
    },
  });

  await prisma.savedPost.create({
    data: {
      userId: user.id,
      postId: post1.id,
    },
  });

  await prisma.follow.create({
    data: {
      followerId: user.id,
      followingId: creator.id,
    },
  });

  console.log('Test data setup complete!');
  console.log('Created:');
  console.log(`- Creator: ${creator.email}`);
  console.log(`- User: ${user.email}`);
  console.log(`- Posts: 2`);
  console.log(`- Clothing Items: 3`);
}

setupTestData()
  .catch((e) => {
    console.error('Error setting up test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
