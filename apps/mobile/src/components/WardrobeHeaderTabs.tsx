import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';

export type WardrobeHeaderTab = 'uploaded' | 'saved' | 'outfits';

interface WardrobeHeaderTabsProps {
  activeTab: WardrobeHeaderTab;
  onTabChange: (tab: WardrobeHeaderTab) => void;
}

interface TabConfig {
  id: WardrobeHeaderTab;
  label: string;
  icon: 'tshirt' | 'bookmarkSimple' | 'layers';
}

const TABS: TabConfig[] = [
  { id: 'uploaded', label: 'Uploaded', icon: 'tshirt' },
  { id: 'saved', label: 'Saved', icon: 'bookmarkSimple' },
  { id: 'outfits', label: 'Outfits', icon: 'layers' },
];

export function WardrobeHeaderTabs({ activeTab, onTabChange }: WardrobeHeaderTabsProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={[
              styles.tabButton,
              {
                borderBottomColor: isActive ? theme.colors.tint : 'transparent',
              },
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <View style={styles.tabContent}>
              <Icon
                name={tab.icon}
                size={22}
                color={isActive ? theme.colors.tint : theme.colors.textSecondary}
                weight="regular"
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
