import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { getOnboardingSkipped } from '../services/storage';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ExploreScreen } from '../screens/tabs/ExploreScreen';
import { WardrobeScreen } from '../screens/tabs/WardrobeScreen';
import { CalendarScreen } from '../screens/tabs/CalendarScreen';
import { ProfileScreen } from '../screens/tabs/ProfileScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { OutfitBuilderScreen } from '../screens/OutfitBuilderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { UploadGarmentScreen } from '../screens/UploadGarmentScreen';
import { MyGarmentsScreen } from '../screens/MyGarmentsScreen';
import { GarmentDetailScreen } from '../screens/GarmentDetailScreen';
import { GarmentConfirmationScreen } from '../screens/GarmentConfirmationScreen';
import { CreatePostScreen } from '../screens/CreatePostScreen';
import { StyleOnboardingScreen } from '../screens/StyleOnboardingScreen';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from './types';
import { useAppTheme } from '../theme';
import { Icon } from '../components/Icon';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { theme } = useAppTheme();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          color: theme.colors.textPrimary,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
        sceneContainerStyle: {
          backgroundColor: theme.colors.background,
        },
        tabBarIcon: ({ color }) => {
          if (route.name === 'Explore') {
            return <Icon name="compass" size={26} color={color} weight="regular" />;
          }

          if (route.name === 'Wardrobe') {
            return <Icon name="hanger" size={26} color={color} weight="regular" />;
          }

          if (route.name === 'Calendar') {
            return <Icon name="calendar" size={26} color={color} weight="regular" />;
          }

          return <Icon name="user" size={26} color={color} weight="regular" />;
        },
      })}
    >
      <MainTab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: 'Explore' }}
      />
      <MainTab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{ title: 'Wardrobe' }}
      />
      <MainTab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Calendar' }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useAppTheme();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOnboardingState() {
      if (!user?.id) {
        if (mounted) {
          setNeedsOnboarding(false);
          setCheckingOnboarding(false);
        }
        return;
      }

      try {
        const [styleProfileResponse, skipped] = await Promise.all([
          api.getStyleProfile(),
          getOnboardingSkipped(user.id),
        ]);

        if (mounted) {
          setNeedsOnboarding(!styleProfileResponse.profile && !skipped);
        }
      } catch (error) {
        console.error('[RootNavigator] Failed to check onboarding status:', error);
        if (mounted) {
          setNeedsOnboarding(false);
        }
      } finally {
        if (mounted) {
          setCheckingOnboarding(false);
        }
      }
    }

    loadOnboardingState();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  if (loading || (user && checkingOnboarding)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        customAnimationOnGesture: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {user ? (
        <>
          {needsOnboarding ? (
            <>
              <RootStack.Screen
                name="Onboarding"
                component={StyleOnboardingScreen}
                initialParams={{ mode: 'first_time' }}
                options={{ headerShown: false }}
              />
              <RootStack.Screen name="Main" component={MainNavigator} />
            </>
          ) : (
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              <RootStack.Screen
                name="Onboarding"
                component={StyleOnboardingScreen}
                initialParams={{ mode: 'edit' }}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  animationDuration: 500, // Slower, premium modal
                }}
              />
            </>
          )}
          <RootStack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <RootStack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              headerShown: true,
              title: 'Profile',
              headerBackTitle: 'Back',
            }}
          />
          <RootStack.Screen
            name="OutfitBuilder"
            component={OutfitBuilderScreen}
            options={{
              headerShown: true,
              title: 'Outfit Builder',
              headerBackTitle: 'Back',
              presentation: 'modal',
              animation: 'slide_from_bottom',
              animationDuration: 500, // Slower, smoother modal
            }}
          />
          <RootStack.Screen
            name="Search"
            component={SearchScreen}
            options={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 400, // Slower fade
            }}
          />
          <RootStack.Screen
            name="UploadGarment"
            component={UploadGarmentScreen}
            options={{
              headerShown: true,
              title: 'Add Garment',
              headerBackTitle: 'Back',
            }}
          />
          <RootStack.Screen
            name="MyGarments"
            component={MyGarmentsScreen}
            options={{
              headerShown: true,
              title: 'My Wardrobe',
              headerBackTitle: 'Back',
            }}
          />
          <RootStack.Screen
            name="GarmentDetail"
            component={GarmentDetailScreen}
            options={{
              headerShown: true,
              title: 'Garment Details',
              headerBackTitle: 'Back',
            }}
          />
          <RootStack.Screen
            name="GarmentConfirmation"
            component={GarmentConfirmationScreen}
            options={{
              headerShown: true,
              title: 'Confirm Details',
              headerBackTitle: 'Back',
            }}
          />
          <RootStack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
              animationDuration: 500, // Slower, premium modal
            }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
