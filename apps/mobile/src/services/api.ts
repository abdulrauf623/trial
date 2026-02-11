import {
  LoginInput,
  RegisterInput,
  AuthResponse,
  FeedResponse,
  Post,
  WardrobeResponse,
  TrackEventInput,
  UserProfile,
  CreateReportInput,
  PresignedUploadRequest,
  PresignedUploadResponse,
  MediaStatusResponse,
  CreateUserGarment,
  UserGarment,
  ListUserGarmentsResponse,
  UpdateUserGarment,
  CreateUserPost,
  UserPost,
  ListUserPostsResponse,
  StyleProfileInput,
  StyleProfileResponse,
  GenerateOutfitsInput,
  GenerateOutfitsResponse,
  PersonalizedExploreFeedResponse,
  BuilderWardrobeItemSource,
  CreateOutfitInput,
  CreatedOutfit,
  GetBuilderWardrobeResponse,
  ListCreatedOutfitsResponse,
  RenderOutfitResponse,
  UpdateOutfitInput,
} from '@fashion/shared';
import { getToken, setToken, clearToken } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    await setToken(response.accessToken);
    return response;
  }

  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    await setToken(response.accessToken);
    return response;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async logout() {
    await clearToken();
  }

  async getFeed(limit: number = 20, cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor && { cursor }),
    });

    return this.request<FeedResponse>(`/feed?${params}`);
  }

  async getExploreFeed(limit: number = 20, cursor?: string): Promise<PersonalizedExploreFeedResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor && { cursor }),
    });

    return this.request<PersonalizedExploreFeedResponse>(`/explore/feed?${params}`);
  }

  async likePost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/feed/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async unlikePost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/feed/posts/${postId}/like`, {
      method: 'DELETE',
    });
  }

  async getPost(postId: string): Promise<Post> {
    return this.request<Post>(`/posts/${postId}`);
  }

  async savePost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/posts/${postId}/save`, {
      method: 'POST',
    });
  }

  async unsavePost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/posts/${postId}/save`, {
      method: 'DELETE',
    });
  }

  async trackEvent(data: TrackEventInput): Promise<{ success: boolean }> {
    return this.request('/analytics/track', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWardrobeFilters(): Promise<{ categories: string[]; colors: string[] }> {
    return this.request('/wardrobe/filters');
  }

  async getWardrobe(category?: string, color?: string): Promise<WardrobeResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (color) params.append('color', color);

    const queryString = params.toString();
    return this.request<WardrobeResponse>(`/wardrobe${queryString ? `?${queryString}` : ''}`);
  }

  async addToWardrobe(clothingItemId: string): Promise<{ success: boolean }> {
    return this.request(`/wardrobe/items/${clothingItemId}`, {
      method: 'POST',
    });
  }

  async removeFromWardrobe(itemId: string): Promise<{ success: boolean }> {
    return this.request(`/wardrobe/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${userId}/profile`);
  }

  async getUserPosts(userId: string, limit: number = 20, cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor && { cursor }),
    });

    return this.request<FeedResponse>(`/users/${userId}/posts?${params}`);
  }

  async getUserLikedPosts(userId: string, limit: number = 20, cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor && { cursor }),
    });

    return this.request<FeedResponse>(`/users/${userId}/liked-posts?${params}`);
  }

  async followUser(userId: string): Promise<{ success: boolean }> {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<{ success: boolean }> {
    return this.request(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  }

  async reportContent(data: CreateReportInput): Promise<{ success: boolean }> {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async search(
    query: string,
    options?: {
      type?: 'posts' | 'items';
      category?: string;
      color?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      limit?: number;
      cursor?: string;
    }
  ): Promise<FeedResponse> {
    const params = new URLSearchParams({
      q: query,
      ...(options?.category && { category: options.category }),
      ...(options?.color && { color: options.color }),
      ...(options?.minPrice !== undefined && { minPrice: options.minPrice.toString() }),
      ...(options?.maxPrice !== undefined && { maxPrice: options.maxPrice.toString() }),
      ...(options?.tags && { tags: options.tags.join(',') }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.cursor && { cursor: options.cursor }),
    });

    const endpoint = options?.type === 'items' ? '/search/items' : '/search/posts';
    return this.request<FeedResponse>(`${endpoint}?${params}`);
  }

  async searchSimilarItems(itemId: string, limit?: number): Promise<any[]> {
    const params = new URLSearchParams({
      ...(limit && { limit: limit.toString() }),
    });

    return this.request(`/search/similar/${itemId}?${params}`);
  }

  async getSearchSuggestions(query: string, limit?: number): Promise<string[]> {
    const params = new URLSearchParams({
      q: query,
      ...(limit && { limit: limit.toString() }),
    });

    return this.request(`/search/suggestions?${params}`);
  }

  // ===== UPLOADS =====

  async createPresignedUpload(data: PresignedUploadRequest): Promise<PresignedUploadResponse> {
    return this.request('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadToS3(uploadUrl: string, file: Blob, contentType: string): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  }

  async markUploadComplete(mediaId: string, publicUrl: string): Promise<{ success: boolean }> {
    return this.request(`/uploads/${mediaId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ publicUrl }),
    });
  }

  async getMediaStatus(mediaId: string): Promise<MediaStatusResponse> {
    return this.request(`/uploads/${mediaId}/status`);
  }

  // ===== STYLE PROFILE =====

  async getStyleProfile(): Promise<StyleProfileResponse> {
    return this.request<StyleProfileResponse>('/style-profile');
  }

  async saveStyleProfile(data: StyleProfileInput): Promise<StyleProfileResponse> {
    return this.request<StyleProfileResponse>('/style-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== USER GARMENTS =====

  async createUserGarment(data: CreateUserGarment): Promise<UserGarment> {
    return this.request('/user-garments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listUserGarments(category?: string, limit?: number): Promise<ListUserGarmentsResponse> {
    const params = new URLSearchParams({
      ...(category && { category }),
      ...(limit && { limit: limit.toString() }),
    });

    const queryString = params.toString();
    return this.request(`/user-garments${queryString ? `?${queryString}` : ''}`);
  }

  async getUserGarment(garmentId: string): Promise<UserGarment> {
    return this.request(`/user-garments/${garmentId}`);
  }

  async updateUserGarment(garmentId: string, data: UpdateUserGarment): Promise<UserGarment> {
    return this.request(`/user-garments/${garmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUserGarment(garmentId: string): Promise<{ success: boolean }> {
    return this.request(`/user-garments/${garmentId}`, {
      method: 'DELETE',
    });
  }

  // ===== OUTFIT RECOMMENDATIONS =====

  async generateOutfits(data: GenerateOutfitsInput): Promise<GenerateOutfitsResponse> {
    return this.request<GenerateOutfitsResponse>('/outfits/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSavedOutfits(): Promise<ListCreatedOutfitsResponse> {
    return this.request<ListCreatedOutfitsResponse>('/outfits', {
      method: 'GET',
    });
  }

  async listRecommendedOutfits(): Promise<{ outfits: any[] }> {
    return this.request<{ outfits: any[] }>('/outfits?kind=recommended', {
      method: 'GET',
    });
  }

  async getBuilderWardrobe(
    filter?: string,
    source?: BuilderWardrobeItemSource | 'all',
  ): Promise<GetBuilderWardrobeResponse> {
    const params = new URLSearchParams({
      mode: 'builder',
      ...(filter && { filter }),
      ...(source && { source }),
    });
    return this.request<GetBuilderWardrobeResponse>(`/wardrobe?${params}`);
  }

  async createOutfit(data: CreateOutfitInput): Promise<CreatedOutfit> {
    return this.request<CreatedOutfit>('/outfits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOutfit(outfitId: string): Promise<CreatedOutfit> {
    return this.request<CreatedOutfit>(`/outfits/${outfitId}`);
  }

  async updateOutfit(outfitId: string, data: UpdateOutfitInput): Promise<CreatedOutfit> {
    return this.request<CreatedOutfit>(`/outfits/${outfitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOutfit(outfitId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/outfits/${outfitId}`, {
      method: 'DELETE',
    });
  }

  async renderOutfit(outfitId: string): Promise<RenderOutfitResponse> {
    return this.request<RenderOutfitResponse>(`/outfits/${outfitId}/render`, {
      method: 'POST',
    });
  }

  // ===== USER POSTS =====

  async createUserPost(data: CreateUserPost): Promise<UserPost> {
    return this.request('/user-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listUserPosts(userId?: string, limit?: number, cursor?: string): Promise<ListUserPostsResponse> {
    const params = new URLSearchParams({
      ...(userId && { userId }),
      ...(limit && { limit: limit.toString() }),
      ...(cursor && { cursor }),
    });

    const queryString = params.toString();
    return this.request(`/user-posts${queryString ? `?${queryString}` : ''}`);
  }

  async getUserPost(postId: string): Promise<UserPost> {
    return this.request(`/user-posts/${postId}`);
  }

  async deleteUserPost(postId: string): Promise<{ success: boolean }> {
    return this.request(`/user-posts/${postId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
