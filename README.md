# Fashion App - Pinterest Clone

A full-stack fashion discovery app with React Native mobile client and NestJS backend.

## 🏗️ Architecture

```
/apps/mobile           - React Native + Expo mobile app
/apps/api              - NestJS backend API
/packages/shared       - Shared types & contracts (Zod schemas)
/packages/ui           - Shared React Native UI components
/packages/config       - Shared TypeScript config
/infra                 - Docker Compose (Postgres, Redis, MinIO)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.11+ (use `nvm use` to match .nvmrc)
- **pnpm** 8.15+ (`npm install -g pnpm@8.15.1`)
- **Docker Desktop** (for infra services)
- **Expo Go** app on your phone OR iOS Simulator/Android Emulator

### Setup Instructions

```bash
# 1. Install all dependencies
pnpm install

# 2. Build shared package
cd packages/shared && pnpm build && cd ../..

# 3. Start infrastructure (Postgres, Redis, MinIO)
pnpm infra:up

# Wait ~10 seconds for containers to initialize, then verify:
docker ps  # Should show 3 healthy containers

# 4. Setup database
cd apps/api
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:push      # Push schema to database
cd ../..

# 5. Seed database with sample data
pnpm db:seed

# 6. Start API (in one terminal)
pnpm api
# Should see: 🚀 API running on http://localhost:3000

# 7. Start mobile app (in another terminal)
pnpm mobile
# Scan QR code with Expo Go app on your phone
# OR press 'i' for iOS simulator, 'a' for Android emulator
```

## 🧪 Testing the App

### Default Test Accounts

After seeding, you can log in with:

- **User account**: `user@example.com` / `password123`
- **Creator 1**: `creator1@example.com` / `password123`
- **Creator 2**: `creator2@example.com` / `password123`

### Expected Behavior (Slice 1)

✅ Login screen with pre-filled credentials
✅ Register new account (choose Creator or User)
✅ Navigate to Main app after login
✅ See 3 tabs: Explore, Wardrobe, Profile
✅ Profile tab shows your info + logout button
✅ Explore & Wardrobe show "Coming in Slice X" placeholders

## 📦 Available Scripts

### Root Commands

```bash
pnpm api              # Start API server
pnpm mobile           # Start mobile app with Expo
pnpm infra:up         # Start Docker containers
pnpm infra:down       # Stop Docker containers
pnpm db:push          # Push Prisma schema to DB
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Seed database
pnpm typecheck        # Type check all packages
```

### API-Specific Commands

```bash
cd apps/api
pnpm start:dev        # Start in watch mode
pnpm prisma:generate  # Generate Prisma client
pnpm seed             # Run seed script
```

### Mobile-Specific Commands

```bash
cd apps/mobile
pnpm start            # Start Expo dev server
pnpm ios              # Open iOS simulator
pnpm android          # Open Android emulator
pnpm web              # Open in web browser
```

## 🗄️ Database Schema

### Users
- `id`, `email`, `passwordHash`, `accountType` (creator/user)
- `displayName`, `avatarUrl`, `stylePreferences[]`
- `isPremium`, `premiumExpiresAt`

### Posts
- `id`, `creatorId`, `caption`, `imageUrls[]`, `tags[]`
- `engagementScore` (cached metric)

### ClothingItems
- `id`, `postId`, `imageIndex`, `bbox` (bounding box)
- `category`, `brand`, `name`, `price`, `color`, `pattern`
- `source` (creator/ai_detected), `confidence`

### WardrobeCollections & WardrobeItems
- Collections have `name`, `icon`, `sortOrder`
- Items reference `clothingItemId` with `snapshot` (denormalized)

### Likes & Follows
- Many-to-many relationships

## 🔧 Configuration

### Environment Variables

**API** (`apps/api/.env`):
```env
DATABASE_URL=postgresql://fashion:fashion123@localhost:5433/fashion_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

**Mobile** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

> **Note**: When testing on a physical device, change `localhost` to your computer's local IP address (e.g., `http://192.168.1.100:3000`)

## 🐛 Troubleshooting

### Docker containers won't start
```bash
# Check if ports are already in use
lsof -i :5432  # Postgres
lsof -i :6379  # Redis
lsof -i :9000  # MinIO

# Restart Docker
pnpm infra:down
docker system prune -f
pnpm infra:up
```

### Prisma errors
```bash
# Regenerate Prisma client
cd apps/api
rm -rf node_modules/.prisma
pnpm prisma:generate
```

### Mobile app can't connect to API
- If using physical device, update `EXPO_PUBLIC_API_URL` to your machine's IP
- Check firewall isn't blocking port 3000
- Verify API is running: `curl http://localhost:3000/auth/me`

### Module resolution errors in mobile
```bash
# Clear caches
cd apps/mobile
rm -rf node_modules .expo
cd ../..
pnpm install
pnpm mobile --clear
```

## 📝 API Endpoints

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user (requires JWT)
- `POST /auth/refresh` - Refresh token

### Coming in Slice 2+
- Feed endpoints
- Post CRUD
- Wardrobe endpoints
- Follow/Like endpoints

## 🧩 Tech Stack

### Mobile
- React Native 0.73
- Expo 50
- React Navigation 6
- Zod for validation
- Expo Secure Store for token storage

### Backend
- NestJS 10
- Prisma ORM
- Postgres 15 + pgvector
- Redis 7
- JWT authentication
- Bcrypt for password hashing

### Shared
- TypeScript 5.3
- pnpm workspaces
- Zod schemas for contract-first development

## 🎯 Next Steps (Slice 2)

- [ ] Implement Explore feed API with pagination
- [ ] Add feed caching with Redis
- [ ] Build masonry-style grid UI
- [ ] Skeleton loading states
- [ ] Image lazy loading
- [ ] Pull-to-refresh

---

**Slice 1 Complete** ✅
Auth, navigation, placeholder tabs, seed data working end-to-end.
