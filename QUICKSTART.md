# ⚡ Quick Start Guide - Fashion App (Slice 1)

## 🎯 What You're Building

A Pinterest-style fashion discovery app with:
- Mobile app (React Native + Expo)
- Backend API (NestJS + Postgres)
- Auth system (JWT)
- Seed data (3 users, 3 posts with clothing items)

---

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
# Make sure you're in the trial directory
cd /Users/abdul/trial

# Install all packages (takes ~2 minutes)
pnpm install
```

### Step 2: Build Shared Package

```bash
cd packages/shared
pnpm build
cd ../..
```

### Step 3: Start Infrastructure

```bash
# Start Postgres, Redis, MinIO
pnpm infra:up

# Wait 10 seconds, then verify
docker ps
# You should see 3 containers: fashion-postgres, fashion-redis, fashion-minio
```

### Step 4: Setup Database

```bash
cd apps/api

# Generate Prisma client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# Go back to root
cd ../..
```

### Step 5: Seed Database

```bash
pnpm db:seed

# You should see:
# ✅ Created 3 users
# ✅ Created 3 posts with clothing items
# ✅ Created wardrobe collection with 1 item
# 🎉 Seed complete!
```

### Step 6: Start API Server

```bash
# In terminal 1
pnpm api

# You should see:
# 🚀 API running on http://localhost:3000
```

### Step 7: Start Mobile App

```bash
# In terminal 2 (new terminal window)
pnpm mobile

# You'll see a QR code and options:
# - Scan QR with Expo Go app on your phone
# - Press 'i' for iOS Simulator
# - Press 'a' for Android Emulator
```

---

## ✅ Testing

1. **Login Screen** should appear
2. Default credentials are pre-filled: `user@example.com` / `password123`
3. Tap **Log In**
4. You should see **3 tabs**: Explore, Wardrobe, Profile
5. Tap **Profile** tab - see your name (Sam Taylor), email, and logout button
6. **Explore** and **Wardrobe** show placeholders (coming in Slice 2)

---

## 🧪 Test All 3 Accounts

```
User Account:
- Email: user@example.com
- Password: password123
- Type: Fashion Lover (can browse, save items)
- Premium: Yes

Creator 1:
- Email: creator1@example.com
- Password: password123
- Type: Creator (can post outfits)

Creator 2:
- Email: creator2@example.com
- Password: password123
- Type: Creator
```

---

## 📱 Mobile App on Physical Device

If testing on your phone (not simulator):

1. Install **Expo Go** from App Store / Play Store
2. Make sure phone and computer are on **same WiFi**
3. Update API URL in `apps/mobile/.env`:

```bash
# Find your computer's IP address
# Mac: System Settings > Network > WiFi > Details
# Or run: ipconfig getifaddr en0

# Update .env file:
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000  # Replace XXX with your IP
```

4. Restart mobile app: `pnpm mobile`

---

## 🐛 Common Issues

### "Cannot connect to API"
- **Simulator**: Use `http://localhost:3000` (default)
- **Physical device**: Use `http://YOUR_IP:3000`
- Check API is running: Open http://localhost:3000/auth/me in browser

### "Port 5432 already in use"
```bash
# Stop existing Postgres
brew services stop postgresql
# OR find and kill the process
lsof -ti:5432 | xargs kill -9
```

### Prisma errors
```bash
cd apps/api
rm -rf node_modules/.prisma
pnpm prisma:generate
```

### "Module not found: @fashion/shared"
```bash
cd packages/shared
pnpm build
cd ../..
```

---

## 📊 Database Inspection

Open Prisma Studio to browse data:

```bash
pnpm db:studio
# Opens in browser at http://localhost:5555
```

You'll see:
- 3 Users
- 3 Posts
- 6 ClothingItems (2 per post)
- 1 WardrobeCollection
- 1 WardrobeItem

---

## 🎬 What's Next?

**Slice 2**: Explore Feed
- Build feed API with pagination
- Redis caching
- Masonry grid UI
- Infinite scroll
- Image lazy loading

---

## 🛑 Stopping Everything

```bash
# Stop mobile app: Ctrl+C in terminal

# Stop API: Ctrl+C in terminal

# Stop Docker containers:
pnpm infra:down
```

---

**Need Help?** Check [README.md](./README.md) for full documentation.

**Slice 1 Status**: ✅ COMPLETE
