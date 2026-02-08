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
}

export const api = new ApiClient();
