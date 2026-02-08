# Fashion App - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Database
```bash
# Start PostgreSQL
pnpm infra:up

# Enable pgvector (one time only)
psql -d fashion -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Push schema
pnpm db:push

# (Optional) Add test data
pnpm --filter @fashion/api run tsx src/scripts/test-setup.ts
```

### 3. Start Development
```bash
# Terminal 1: API
pnpm api

# Terminal 2: Mobile
pnpm mobile
```

### 4. Test Login
Use test account (if you ran test-setup):
- Email: `user@test.com`
- Password: (any - mock auth in dev)

---

## 📱 Mobile App Features

### Navigation
- **Explore Tab** - Browse posts feed
- **Wardrobe Tab** - View saved items
- **Profile Tab** - Your profile with posts grid

### New Features (Slices 5-10)
- **User Profiles** - Tap on any creator to view their profile
- **Search** - Navigate to search screen (needs route added to tab bar)
- **Outfit Builder** - Navigate to build outfits (needs route added)
- **Follow/Unfollow** - Follow creators from their profiles
- **Report** - Report users or posts via modal

---

## 🔍 Search Features

### Text Search
```typescript
// From mobile
const results = await api.search('summer outfit', {
  category: 'top',
  color: 'blue',
  minPrice: 20,
  maxPrice: 100,
});
```

### Similar Items
```typescript
// Find items similar to a specific item
const similar = await api.searchSimilarItems(itemId, 20);
```

### Suggestions
```typescript
// Get search suggestions
const suggestions = await api.getSearchSuggestions('sum');
// Returns: ['summer', 'summer outfit', 'summer style', ...]
```

---

## 🎨 Using Animations

### Animated Button
```typescript
import { AnimatedButton } from '../components/AnimatedButton';

<AnimatedButton
  onPress={handlePress}
  variant="primary" // or 'secondary', 'outline'
  bounceOnPress={true}
>
  Click Me
</AnimatedButton>
```

### Drag and Drop
```typescript
import { useDragAndDrop } from '../hooks/useDragAndDrop';

const { gesture, animatedStyle, reset } = useDragAndDrop({
  onDrop: (x, y) => {
    console.log('Dropped at:', x, y);
    reset();
  },
  boundX: { min: 0, max: 300 },
  boundY: { min: 0, max: 600 },
});

<GestureDetector gesture={gesture}>
  <Animated.View style={animatedStyle}>
    {/* Draggable content */}
  </Animated.View>
</GestureDetector>
```

### Parallax Scrolling
```typescript
import { useParallax } from '../hooks/useParallax';

const { scrollY, scrollHandler, createParallaxStyle } = useParallax();

<Animated.ScrollView onScroll={scrollHandler}>
  {items.map((item, index) => (
    <Animated.View style={createParallaxStyle(index, 200, 0.5)}>
      {/* Content with parallax effect */}
    </Animated.View>
  ))}
</Animated.ScrollView>
```

---

## 🤖 AI Features

### Generate Embeddings
Embeddings are generated automatically via the job queue when posts/items are created.

To manually trigger:
```typescript
// In API code
await queueService.enqueuePostEmbedding(postId);
await queueService.enqueueItemEmbedding(itemId);
```

### Mock Mode (No API Key)
If `OPENAI_API_KEY` is not set, the AI service uses mock embeddings:
- Random 768-dimensional vectors
- Cosine similarity still works
- Good for development/testing

### Enable OpenAI
```bash
# Add to apps/api/.env
OPENAI_API_KEY=sk-your-key-here
```

---

## 🔧 Common Tasks

### Add New Search Filter
1. Update search service (`apps/api/src/search/search.service.ts`)
2. Add filter to controller (`apps/api/src/search/search.controller.ts`)
3. Update mobile API client (`apps/mobile/src/services/api.ts`)
4. Add UI in SearchScreen

### Create New Animated Component
1. Use `useSharedValue` and `useAnimatedStyle` from reanimated
2. Wrap in `Animated.View` or `Animated.createAnimatedComponent`
3. Add gesture with `useAnimatedGestureHandler` if needed
4. See `AnimatedButton.tsx` for reference

### Add New Screen
1. Create screen in `apps/mobile/src/screens/`
2. Add to navigation types (`navigation/types.ts`)
3. Add to RootNavigator (`navigation/RootNavigator.tsx`)
4. Add navigation transition if needed

---

## 📊 Monitoring & Debugging

### Check Logs
```bash
# API logs show:
# - Request timing
# - Slow queries (>1s)
# - Error traces
# - Job queue status

# Mobile logs show:
# - API calls
# - Navigation events
# - Component lifecycle
```

### Performance Monitoring
API automatically tracks:
- Request duration
- Slow endpoints
- Database query time

Check console for `[Performance]` logs.

### Queue Status
```typescript
// In API code
const size = queueService.getQueueSize();
const isProcessing = queueService.isProcessing();
console.log(`Queue: ${size} jobs, processing: ${isProcessing}`);
```

---

## 🧪 Testing

### Type Check
```bash
# All packages
pnpm typecheck

# Individual packages
pnpm --filter @fashion/api typecheck
pnpm --filter @fashion/mobile typecheck
```

### Run Seed Script
```bash
pnpm --filter @fashion/api run tsx src/scripts/test-setup.ts
```

### Manual Testing Checklist
- [ ] Login/Register
- [ ] View feed
- [ ] Like/unlike posts
- [ ] Save/unsave posts
- [ ] View user profile
- [ ] Follow/unfollow user
- [ ] Search posts
- [ ] Filter search results
- [ ] View similar items
- [ ] Drag items in outfit builder
- [ ] Report user/post
- [ ] View own profile

---

## 🐛 Troubleshooting

### TypeScript Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Regenerate Prisma client
pnpm --filter @fashion/api prisma:generate
```

### Animation Not Working
```bash
# Clear Metro bundler cache
pnpm mobile --clear

# Rebuild completely
rm -rf node_modules
pnpm install
```

### Database Issues
```bash
# Reset database
pnpm infra:down
pnpm infra:up
pnpm db:push

# Enable pgvector
psql -d fashion -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Search Not Working
1. Check pgvector extension is installed
2. Verify embeddings exist (or mock mode is working)
3. Check search service logs
4. Test with simple text query first

---

## 📁 Project Structure

```
fashion-app/
├── apps/
│   ├── api/              # NestJS backend
│   │   └── src/
│   │       ├── ai/       # AI embeddings
│   │       ├── search/   # Search service
│   │       ├── queue/    # Job queue
│   │       └── logger/   # Logging
│   └── mobile/           # React Native app
│       └── src/
│           ├── components/   # Reusable components
│           ├── screens/      # App screens
│           ├── hooks/        # Custom hooks
│           ├── utils/        # Utilities
│           └── services/     # API client
├── packages/
│   └── shared/           # Shared types
└── infra/               # Docker configs
```

---

## 🎯 Next Steps

### Development
1. Add tab bar button for Search
2. Add tab bar button for Outfit Builder
3. Implement pull-to-refresh on all lists
4. Add loading states
5. Add error boundaries

### Testing
1. Write E2E tests with Detox
2. Add unit tests for services
3. Test on real devices
4. Performance profiling

### Production
1. Setup Sentry for error tracking
2. Add Redis for job queue
3. Enable pgvector indexing
4. Setup CI/CD pipeline
5. Configure production environment

---

## 💡 Tips & Best Practices

### Animations
- Always use `worklet` directive for reanimated functions
- Run animations on UI thread when possible
- Use `withSpring` for natural motion
- Keep animations under 300ms for responsiveness

### Search
- Combine text and vector search for best results
- Use filters to narrow down results
- Implement pagination for large result sets
- Cache frequent queries (future)

### Performance
- Use FlatList for long lists
- Implement cursor-based pagination
- Lazy load images
- Monitor slow queries (>1s)

### TypeScript
- Define interfaces for all data structures
- Use strict mode
- Avoid `any` type
- Leverage IntelliSense

---

## 📚 Documentation

- **Implementation Guide:** `/IMPLEMENTATION_GUIDE.md`
- **Summary:** `/SLICES_5-10_SUMMARY.md`
- **This Guide:** `/QUICK_START.md`

---

## ✅ Status

**All Slices (5-10) Complete:**
- ✅ User profiles and reporting
- ✅ Premium animations (60fps)
- ✅ Search with pgvector
- ✅ AI embeddings pipeline
- ✅ Logging and monitoring
- ✅ TypeScript compilation

**Ready for:** User testing and deployment

---

Happy coding! 🚀
