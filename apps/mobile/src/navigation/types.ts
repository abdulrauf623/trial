import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Explore: undefined;
  Wardrobe: undefined;
  Calendar: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: { mode?: 'first_time' | 'edit' } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  Search:
    | {
        mode?: 'text' | 'similar';
        itemId?: string;
        sourcePostId?: string;
        initialQuery?: string;
      }
    | undefined;
  OutfitBuilder: undefined;
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
