# Premium Animations Implementation Guide

## Overview

This guide documents the premium animation system implemented across the app, featuring slow, smooth, buttery transitions that create a luxurious user experience.

## What Was Enhanced

### 1. Post Expansion Animation (Explore → Post Detail)

**File:** `apps/mobile/src/transitions/AnimatedPostTransitionProvider.tsx`

**Changes:**
- **Open Duration:** Optimized to **650ms** (premium feel with stability)
- **Close Duration:** Optimized to **550ms** (smooth and responsive)
- **Open Easing:** Enhanced from `bezier(0.22, 1, 0.36, 1)` → `bezier(0.16, 1, 0.3, 1)` (smoother acceleration)
- **Close Easing:** Enhanced from `bezier(0.4, 0, 0.2, 1)` → `bezier(0.32, 0, 0.15, 1)` (smoother deceleration)

**Result:** Post cards now expand luxuriously into full-screen detail view with an ultra-smooth, Pinterest-like animation.

### 2. Navigation Transitions

**File:** `apps/mobile/src/navigation/RootNavigator.tsx`

**Global Navigator Settings:**
```typescript
screenOptions={{
  headerShown: false,
  animation: 'slide_from_right',
  customAnimationOnGesture: true,
  fullScreenGestureEnabled: true,
}}
```

**Screen-Specific Enhancements:**

| Screen | Animation | Duration | Effect |
|--------|-----------|----------|--------|
| OutfitBuilder | Modal slide up | 500ms | Smooth modal entrance |
| Search | Fade | 400ms | Gentle fade transition |
| CreatePost | Modal slide up | 500ms | Premium modal feel |
| Onboarding | Modal slide up | 500ms | Smooth onboarding experience |

### 3. Interactive Elements (Press Animations)

**File:** `apps/mobile/src/components/ExplorePhotoTile.tsx`

**Press Animation:**
```typescript
// Press down: scale to 96% of original size
onPressIn: scale → 0.96 (spring animation)

// Release: scale back to 100%
onPressOut: scale → 1.0 (spring animation)

Spring Config:
- damping: 20 (smooth, not bouncy)
- stiffness: 300 (responsive feedback)
```

**Result:** Every tap feels responsive with subtle, satisfying visual feedback.

### 4. Reusable Animation Component

**File:** `apps/mobile/src/components/AnimatedPressable.tsx`

**Features:**
- Drop-in replacement for `Pressable` or `TouchableOpacity`
- Configurable press scale (default: 0.95)
- Smooth spring animations
- Reusable across the app

**Usage Example:**
```typescript
import { AnimatedPressableComponent } from '../components/AnimatedPressable';

<AnimatedPressableComponent onPress={handlePress} pressScale={0.96}>
  <YourContent />
</AnimatedPressableComponent>
```

## Animation Philosophy

### Timing
- **Fast:** 200ms (rare, only for instant feedback)
- **Normal:** 350-400ms (standard UI interactions)
- **Slow:** 500-550ms (screen transitions, modals)
- **Premium:** 600-700ms (hero animations like post expansion, optimized for stability)

### Easing Curves
All animations use carefully chosen bezier curves for maximum smoothness:

- **Standard:** `bezier(0.25, 0.1, 0.25, 1)` - Material Design standard
- **Ease Out:** `bezier(0.16, 1, 0.3, 1)` - Smooth deceleration (entering)
- **Ease In:** `bezier(0.32, 0, 0.15, 1)` - Smooth acceleration (exiting)

### Spring Physics
For press interactions, we use spring animations instead of timing:

```typescript
{
  damping: 20,    // Prevents bouncing, feels controlled
  stiffness: 300, // Quick response time
  mass: 1,        // Standard weight
}
```

## Key Principles

1. **Slow is Premium** - Animations should never feel rushed
2. **Consistent Timing** - Similar actions use similar durations
3. **Smooth Curves** - No linear animations, always use easing
4. **Subtle Feedback** - Press animations are noticeable but not exaggerated
5. **Respect Physics** - Spring animations feel natural

## Testing the Animations

### Post Expansion
1. Go to Explore tab
2. Tap any post card
3. **Watch:** Card smoothly expands over 900ms into detail view
4. Swipe down to close
5. **Watch:** Smooth 700ms collapse back to grid

### Navigation
1. Navigate between screens
2. **Notice:** Smooth slide transitions (not abrupt)
3. Open modals (Outfit Builder, Create Post)
4. **Notice:** Gentle slide-up with 500ms duration

### Press Feedback
1. Press and hold on any post card
2. **Notice:** Subtle scale down to 96%
3. Release
4. **Notice:** Smooth spring back to 100%

## Performance Considerations

All animations run on the **native thread** using React Native Reanimated:
- 60 FPS (or 120 FPS on ProMotion displays)
- No JavaScript thread blocking
- Smooth even during heavy computation

## Future Enhancements

### Potential Additions
- [ ] Parallax scrolling effects
- [ ] Staggered list animations (cascading entrance)
- [ ] Micro-interactions (e.g., like button bounce)
- [ ] Page curl transitions for certain flows
- [ ] Haptic feedback integration

### Global Animation System
Consider creating a global animation config:

```typescript
// apps/mobile/src/config/animations.ts
export const GLOBAL_ANIMATION_CONFIG = {
  durations: {
    instant: 0,
    fast: 200,
    normal: 400,
    slow: 700,
    verySlow: 900,
  },
  springs: {
    gentle: { damping: 20, stiffness: 300 },
    bouncy: { damping: 15, stiffness: 400 },
  },
};
```

## Troubleshooting

### Animations Feel Laggy
- Check device performance
- Ensure animations run on native thread (using `worklet`)
- Reduce parallel animations

### Animations Too Slow
- Adjust durations in respective files
- Consider user preference settings

### Inconsistent Feel
- Audit all animations for similar timing
- Standardize easing curves across screens

## Files Modified

1. `apps/mobile/src/transitions/AnimatedPostTransitionProvider.tsx` - Post expansion
2. `apps/mobile/src/navigation/RootNavigator.tsx` - Screen transitions
3. `apps/mobile/src/components/ExplorePhotoTile.tsx` - Press animations
4. `apps/mobile/src/components/AnimatedPressable.tsx` - Reusable component

## Metrics

- **Average Open Animation:** 650ms (optimized for premium feel + stability)
- **Average Close Animation:** 550ms (smooth and responsive)
- **Modal Transitions:** 400-500ms (was instant) - **New premium feel**
- **Press Feedback:** 96% scale (subtle, not jarring)

---

**Result:** The app now feels significantly more premium, with every interaction providing smooth, satisfying visual feedback that matches the expectations of high-end consumer applications.
