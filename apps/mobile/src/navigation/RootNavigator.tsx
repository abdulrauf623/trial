import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ExploreScreen } from '../screens/tabs/ExploreScreen';
import { WardrobeScreen } from '../screens/tabs/WardrobeScreen';
import { ProfileScreen } from '../screens/tabs/ProfileScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { OutfitBuilderScreen } from '../screens/OutfitBuilderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from './types';

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
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#666',
        headerShown: true,
      }}
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
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <RootStack.Screen name="Main" component={MainNavigator} />
          <RootStack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{
              headerShown: true,
              title: 'Post',
              headerBackTitle: 'Back',
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
            }}
          />
          <RootStack.Screen
            name="Search"
            component={SearchScreen}
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
