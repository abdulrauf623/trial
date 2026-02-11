# Mobile User-Generated Content Implementation

## Overview

Complete mobile implementation for user-generated content featuring:

✅ **Upload Screen** - Camera + gallery + URL import with progress tracking
✅ **My Garments Screen** - Grid gallery with category filters
✅ **Garment Detail Screen** - Full details with edit/delete capabilities
✅ **Garment Confirmation Screen** - AI-powered attribute detection with user confirmation
✅ **Create Post Screen** - Image upload + caption + garment tagging
✅ **Real-time Processing Status** - Polling for image processing completion
✅ **AI Attribute Detection** - Pattern, material, and occasion tag detection

## Files Created

### Shared Contracts (`packages/shared/src/contracts/`)
- `uploads.ts` - Upload and media status types
- `user-garments.ts` - User garment types and responses
- `user-posts.ts` - User post types and responses

### API Client (`apps/mobile/src/services/api.ts`)
Added methods for:
- Upload management (presigned URLs, S3 upload, status polling)
- User garments CRUD
- User posts CRUD

### Mobile Screens (`apps/mobile/src/screens/`)
1. **UploadGarmentScreen.tsx** - Upload garment photos (camera/gallery/URL)
2. **GarmentConfirmationScreen.tsx** - Confirm and edit AI-detected attributes
3. **MyGarmentsScreen.tsx** - View and filter user's wardrobe
4. **GarmentDetailScreen.tsx** - View/edit garment details
5. **CreatePostScreen.tsx** - Create posts with garment tags

## Features Breakdown

### 1. Upload Garment Screen (`UploadGarmentScreen`)

**Features:**
- 📷 Take photo with camera
- 🖼️ Pick from gallery
- ✏️ Add optional notes
- 📊 Real-time upload progress
- ⏳ Automatic processing status polling
- ✅ Success confirmation with navigation options

**Flow:**
```
1. User picks/takes photo or imports from URL
2. Upload to S3 via presigned URL
3. Mark upload complete → Backend enqueues processing
4. Poll status every 2 seconds (max 2 minutes)
5. When ready → Navigate to confirmation screen with AI-detected attributes
6. User reviews/edits → Confirms → Creates garment record
7. Navigate to wardrobe or add another
```

**Progress Stages:**
- `selecting` - Image selected
- `uploading` - Uploading to S3
- `processing` - Server processing (resize, color extraction, etc.)
- `creating` - Creating garment record
- `done` - Complete

### 2. Garment Confirmation Screen (`GarmentConfirmationScreen`)

**Features:**
- 📸 Full-size image preview
- 🤖 AI-detected attributes displayed
- ✏️ Editable fields: category, pattern, material, brand, size, tags, notes
- 🎯 Category selector (required field)
- 🎨 Pattern selector (solid, striped, floral, plaid, checkered, graphic)
- 🧵 Material selector (cotton, denim, wool, leather, silk, polyester, linen)
- 🏷️ Multi-select occasion tags (casual, formal, business, athletic, party, summer, winter)
- 💾 Save to wardrobe with user-confirmed attributes

**User Experience:**
- AI detections are pre-selected but fully editable
- Required fields marked with asterisk
- Clean chip-based UI for selections
- Cancel/Save actions with validation
- Success dialog with navigation options

### 3. My Garments Screen (`MyGarmentsScreen`)

**Features:**
- Grid view (2 columns)
- Category filter chips
- Pull-to-refresh
- Auto-reload on tab focus
- Empty state with CTA
- Processing overlay for items still processing
- Color indicator badges
- Category badges

**Display:**
- Shows thumbnail/processed/original image (whichever available)
- Category badge in top-left
- Dominant color dot in bottom-right
- Processing overlay if status !== 'ready'

**Navigation:**
- Tap garment → Garment Detail Screen
- "Add" button → Upload Garment Screen

### 4. Garment Detail Screen (`GarmentDetailScreen`)

**Features:**
- Full-size image display
- Color palette visualization
- Category with confidence score
- Edit mode for notes and category
- Delete with confirmation
- Processing status banner

**Edit Mode:**
- Toggle with "Edit" button
- Inline editing of notes and category
- Save/Cancel buttons
- Optimistic updates

### 5. Create Post Screen (`CreatePostScreen`)

**Features:**
- Camera or gallery image picker
- S3 upload with progress
- Caption input (500 char limit)
- Horizontal scrollable garment picker
- Multi-select garment tagging
- Visual selection indicators
- Empty state with "Add Garment" CTA

**Garment Tagging:**
- Shows thumbnails of all ready garments
- Tap to select/deselect
- Checkmark overlay when selected
- Black border around selected items
- Category badges on thumbnails

## Navigation Setup

You need to add these routes to your React Navigation stack:

```typescript
// Add to your navigation types
type RootStackParamList = {
  // ... existing routes
  UploadGarment: undefined;
  MyGarments: undefined;
  GarmentDetail: { garmentId: string };
  GarmentConfirmation: {
    mediaId: string;
    imageUrl: string;
    detectedAttributes: {
      category: string | null;
      pattern: string | null;
      material: string | null;
      tags: string[];
    };
  };
  CreatePost: undefined;
};

// Add to your Stack.Navigator
<Stack.Screen
  name="UploadGarment"
  component={UploadGarmentScreen}
  options={{ title: 'Add Garment' }}
/>
<Stack.Screen
  name="MyGarments"
  component={MyGarmentsScreen}
  options={{ title: 'My Wardrobe' }}
/>
<Stack.Screen
  name="GarmentDetail"
  component={GarmentDetailScreen}
  options={{ title: 'Garment Details' }}
/>
<Stack.Screen
  name="GarmentConfirmation"
  component={GarmentConfirmationScreen}
  options={{ title: 'Confirm Details' }}
/>
<Stack.Screen
  name="CreatePost"
  component={CreatePostScreen}
  options={{ headerShown: false }}
/>
```

## Dependencies

Install required packages:

```bash
cd apps/mobile

# Image picker
npx expo install expo-image-picker

# Already installed:
# - @react-navigation/native
# - react-native-safe-area-context
```

## Usage Examples

### Navigate to Upload Screen
```typescript
navigation.navigate('UploadGarment');
```

### Navigate to My Wardrobe
```typescript
navigation.navigate('MyGarments');
```

### Navigate to Create Post
```typescript
navigation.navigate('CreatePost');
```

### View Garment Detail
```typescript
navigation.navigate('GarmentDetail', { garmentId: 'uuid-here' });
```

### Navigate to Confirmation Screen
```typescript
navigation.navigate('GarmentConfirmation', {
  mediaId: 'media-uuid',
  imageUrl: 'https://...',
  detectedAttributes: {
    category: 'tshirt',
    pattern: 'solid',
    material: 'cotton',
    tags: ['casual', 'summer']
  }
});
```

## API Flow Examples

### Upload & Create Garment
```typescript
// 1. Get presigned URL
const { uploadUrl, mediaId, publicUrl } = await api.createPresignedUpload({
  contentType: 'image/jpeg',
  type: 'garment'
});

// 2. Upload to S3
await api.uploadToS3(uploadUrl, imageBlob, 'image/jpeg');

// 3. Mark complete (triggers processing)
await api.markUploadComplete(mediaId, publicUrl);

// 4. Poll status
const status = await api.getMediaStatus(mediaId);
// status.status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed'

// 5. Create garment when ready with AI-detected attributes
await api.createUserGarment({
  mediaUploadId: mediaId,
  category: 'jacket',
  pattern: 'solid',
  material: 'leather',
  brand: 'Nike',
  size: 'M',
  tags: ['casual', 'winter'],
  notes: 'My favorite jacket'
});
```

### Create Post with Tagged Garments
```typescript
await api.createUserPost({
  imageUrl: publicUrl,
  mediaUploadId: mediaId,
  caption: 'Check out my outfit!',
  taggedGarmentIds: ['garment-id-1', 'garment-id-2']
});
```

## UI/UX Highlights

### Upload Progress
- Clean progress bar with percentage
- Stage-based messaging
- Loading spinners during async operations
- Success/error alerts with contextual actions

### Garment Gallery
- Responsive grid layout
- Category filtering with chips
- Pull-to-refresh for instant updates
- Processing indicators
- Empty states with clear CTAs

### Post Creation
- Intuitive image selection
- Character counter for captions
- Visual garment selection
- Upload feedback
- Validation before posting

## Error Handling

All screens include comprehensive error handling:

1. **Permission Errors** - Alert user to grant camera/gallery access
2. **Upload Errors** - Clear error messages, allow retry
3. **Network Errors** - Caught and displayed with context
4. **Validation Errors** - Inline validation with helpful messages

## Performance Optimizations

1. **Image Loading** - Uses ResizeMode cover for consistent display
2. **List Rendering** - FlatList for efficient scrolling
3. **Pull-to-Refresh** - Manual refresh on demand
4. **Focus-based Loading** - Auto-reload on tab focus
5. **Optimistic Updates** - Instant UI feedback
6. **Polling Strategy** - 2-second intervals with 2-minute timeout

## Testing Checklist

- [ ] Upload garment via camera
- [ ] Upload garment via gallery
- [ ] Import garment from URL
- [ ] Image upload progress displays correctly
- [ ] Processing status updates in real-time
- [ ] AI attribute detection works (pattern, material, tags)
- [ ] Confirmation screen shows detected attributes
- [ ] Edit attributes on confirmation screen
- [ ] Category selection (required field)
- [ ] Pattern, material, and tag selection
- [ ] Brand and size input (optional)
- [ ] Notes input on confirmation screen
- [ ] Save garment from confirmation screen
- [ ] Garment appears in My Wardrobe with all attributes
- [ ] Category filters work
- [ ] Pull-to-refresh reloads data
- [ ] Edit garment attributes in detail screen
- [ ] Delete garment with confirmation
- [ ] Create post with image
- [ ] Tag multiple garments in post
- [ ] Caption validation (500 chars)
- [ ] Empty states display correctly
- [ ] Error handling for failed uploads
- [ ] Error handling for invalid URLs
- [ ] Permissions prompts work

## Future Enhancements

### Short Term
- [ ] Batch upload multiple garments
- [ ] Share posts to social media
- [ ] Add filters/effects to photos before upload
- [ ] Drag-to-reorder garment tags in posts
- [ ] Offline queue support for uploads
- [ ] Image cropping before upload
- [ ] Upgrade to GPT-4 Vision API for production AI detection
- [ ] Real background removal using Replicate API

### Long Term
- [ ] AI-powered outfit suggestions based on wardrobe
- [ ] Virtual try-on using uploaded garments
- [ ] Seasonal wardrobe organization
- [ ] Style analytics and insights (most worn, color preferences)
- [ ] Collaborative outfit building
- [ ] Wardrobe value tracking
- [ ] Sustainability metrics (cost per wear)

## Troubleshooting

### Images Not Uploading
- Check S3 endpoint in .env
- Verify presigned URL expiration (1 hour)
- Check network connectivity
- Verify image size < 10MB

### Processing Stuck
- Check backend queue is running
- Verify Sharp library installed
- Check backend logs for errors
- Processing should complete in < 30 seconds

### Garments Not Appearing
- Ensure status polling completed
- Check API response for errors
- Verify garment creation succeeded
- Try pull-to-refresh

### Navigation Errors
- Ensure all screens registered in Stack.Navigator
- Check TypeScript route params match
- Verify @react-navigation packages installed

## Support

For issues or questions:
1. Check backend logs: `pnpm api:logs`
2. Check mobile logs: Metro bundler console
3. Verify environment variables
4. Check network requests in debugger
5. Review USER_GENERATED_CONTENT.md for backend details
