import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  BuilderWardrobeItem,
  BuilderWardrobeItemSource,
  OutfitBackgroundStyle,
} from '@fashion/shared';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { clearOutfitDraft, getOutfitDraft, setOutfitDraft } from '../services/storage';
import { useAppTheme } from '../theme';
import { OutfitToolbar } from '../components/outfit-builder/OutfitToolbar';
import { WardrobeTray } from '../components/outfit-builder/WardrobeTray';
import { OutfitCanvas } from '../components/outfit-builder/OutfitCanvas';
import { BuilderCanvasItem } from '../components/outfit-builder/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

interface OutfitDraftPayload {
  version: number;
  outfitId: string | null;
  name: string;
  backgroundStyle: OutfitBackgroundStyle;
  selectedWardrobeItemIds: string[];
  sourceFilter: BuilderWardrobeItemSource | 'all';
  selectedCategory: string;
}

const DRAFT_VERSION = 2;

export function OutfitBuilderScreen() {
  const navigation = useNavigation<RootNav>();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<BuilderWardrobeItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<BuilderWardrobeItemSource | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWardrobeItemIds, setSelectedWardrobeItemIds] = useState<string[]>([]);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<OutfitBackgroundStyle>('solid');
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [canvasItems, setCanvasItems] = useState<BuilderCanvasItem[]>([]);
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);

  const wardrobeById = useMemo(() => {
    const index = new Map<string, BuilderWardrobeItem>();
    wardrobeItems.forEach((item) => {
      index.set(item.id, item);
    });
    return index;
  }, [wardrobeItems]);

  const selectedIds = useMemo(() => new Set(selectedWardrobeItemIds), [selectedWardrobeItemIds]);

  const loadWardrobe = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await api.getBuilderWardrobe();
      setWardrobeItems(response.items);
    } catch (error) {
      console.error('Failed to load outfit builder wardrobe:', error);
      Alert.alert('Load failed', 'Could not load wardrobe items right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWardrobe();
  }, [loadWardrobe]);

  useEffect(() => {
    setSelectedWardrobeItemIds((previous) => previous.filter((id) => wardrobeById.has(id)));
  }, [wardrobeById]);

  useEffect(() => {
    setCanvasItems((previous) => {
      const previousById = new Map(previous.map((item) => [item.wardrobeItemId, item]));
      return selectedWardrobeItemIds
        .map((wardrobeItemId, index) => {
          const wardrobeItem = wardrobeById.get(wardrobeItemId);
          if (!wardrobeItem) return null;

          const existing = previousById.get(wardrobeItemId);
          if (existing) {
            return {
              ...existing,
              wardrobeItem,
            };
          }

          const fallback = fallbackLayoutForIndex(index, Math.max(1, selectedWardrobeItemIds.length));
          return {
            id: wardrobeItemId,
            wardrobeItemId,
            wardrobeItem,
            x: fallback.x,
            y: fallback.y,
            scale: fallback.scale,
            rotation: fallback.rotation,
            zIndex: index,
            mirror: false,
            labelVisible: false,
            labelText: null,
          } satisfies BuilderCanvasItem;
        })
        .filter((item): item is BuilderCanvasItem => Boolean(item));
    });

    setSelectedCanvasItemId((previous) => {
      if (previous && selectedWardrobeItemIds.includes(previous)) {
        return previous;
      }
      return selectedWardrobeItemIds[0] || null;
    });
  }, [selectedWardrobeItemIds, wardrobeById]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateDraft() {
      if (!user?.id || hydratedDraft || wardrobeItems.length === 0) return;
      try {
        const raw = await getOutfitDraft(user.id);
        if (!raw || cancelled) {
          setHydratedDraft(true);
          return;
        }

        const parsed = JSON.parse(raw) as OutfitDraftPayload;
        if (parsed.version !== DRAFT_VERSION) {
          setHydratedDraft(true);
          return;
        }

        const validIds = parsed.selectedWardrobeItemIds.filter((id) => wardrobeById.has(id));
        setSelectedWardrobeItemIds(validIds);
        setOutfitName(parsed.name || '');
        setBackgroundStyle(parsed.backgroundStyle || 'solid');
        setOutfitId(parsed.outfitId || null);
        setSourceFilter(parsed.sourceFilter || 'all');
        setSelectedCategory(parsed.selectedCategory || 'all');
      } catch (error) {
        console.error('Failed to hydrate outfit builder draft:', error);
      } finally {
        if (!cancelled) {
          setHydratedDraft(true);
        }
      }
    }

    hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [hydratedDraft, user?.id, wardrobeById, wardrobeItems.length]);

  useEffect(() => {
    if (!user?.id || !hydratedDraft) return;
    const payload: OutfitDraftPayload = {
      version: DRAFT_VERSION,
      outfitId,
      name: outfitName,
      backgroundStyle,
      selectedWardrobeItemIds,
      sourceFilter,
      selectedCategory,
    };

    const timeout = setTimeout(() => {
      setOutfitDraft(user.id, JSON.stringify(payload)).catch((error) => {
        console.error('Failed to persist outfit draft:', error);
      });
    }, 220);

    return () => clearTimeout(timeout);
  }, [
    backgroundStyle,
    hydratedDraft,
    outfitId,
    outfitName,
    selectedCategory,
    selectedWardrobeItemIds,
    sourceFilter,
    user?.id,
  ]);

  const handleAddItem = useCallback((item: BuilderWardrobeItem) => {
    setSelectedCanvasItemId(item.id);
    setSelectedWardrobeItemIds((previous) => {
      if (previous.includes(item.id)) {
        return previous.filter((id) => id !== item.id);
      }
      return [...previous, item.id];
    });
  }, []);

  const handleChangeCanvasItem = useCallback((id: string, patch: Partial<BuilderCanvasItem>) => {
    setCanvasItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }, []);

  const selectedCanvasItem = useMemo(
    () => canvasItems.find((item) => item.id === selectedCanvasItemId) || null,
    [canvasItems, selectedCanvasItemId],
  );

  const adjustSelectedScale = useCallback((delta: number) => {
    if (!selectedCanvasItemId) return;
    setCanvasItems((previous) =>
      previous.map((item) =>
        item.id === selectedCanvasItemId
          ? {
              ...item,
              scale: clamp(item.scale + delta, 0.2, 3),
            }
          : item,
      ),
    );
  }, [selectedCanvasItemId]);

  const resetSelectedScale = useCallback(() => {
    if (!selectedCanvasItemId) return;
    setCanvasItems((previous) =>
      previous.map((item) =>
        item.id === selectedCanvasItemId
          ? {
              ...item,
              scale: 1,
            }
          : item,
      ),
    );
  }, [selectedCanvasItemId]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (canvasItems.length === 0) {
      Alert.alert('No items', 'Add at least one piece before saving.');
      return;
    }

    try {
      setSaving(true);
      const orderedItems = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);
      const payload = {
        name: outfitName.trim() ? outfitName.trim() : undefined,
        backgroundStyle,
        items: orderedItems.map((item, index) => {
          return {
            wardrobeItemId: item.wardrobeItemId,
            x: clamp(item.x, 0, 1),
            y: clamp(item.y, 0, 1),
            scale: clamp(item.scale, 0.2, 3),
            rotation: clamp(item.rotation, -360, 360),
            zIndex: Number.isFinite(item.zIndex) ? item.zIndex : index,
            mirror: Boolean(item.mirror),
            labelVisible: Boolean(item.labelVisible),
            labelText: item.labelText ?? null,
          };
        }),
      };

      const saved = outfitId
        ? await api.updateOutfit(outfitId, payload)
        : await api.createOutfit(payload);

      const rendered = await api.renderOutfit(saved.id);
      setOutfitId(rendered.outfit.id);

      if (user?.id) {
        await clearOutfitDraft(user.id);
      }

      Alert.alert('Saved', 'Outfit created and rendered.');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save outfit:', error);
      Alert.alert('Save failed', 'Could not save this outfit. Try again.');
    } finally {
      setSaving(false);
    }
  }, [
    backgroundStyle,
    canvasItems,
    navigation,
    outfitId,
    outfitName,
    saving,
    user?.id,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (loading && wardrobeItems.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={theme.colors.tint} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OutfitToolbar
        name={outfitName}
        onChangeName={setOutfitName}
        onBack={handleBack}
        onSave={handleSave}
        saving={saving}
        backgroundStyle={backgroundStyle}
      />

      <View style={styles.canvasWrap}>
        <OutfitCanvas
          items={canvasItems}
          selectedItemId={selectedCanvasItemId}
          onSelectItem={setSelectedCanvasItemId}
          onChangeItem={handleChangeCanvasItem}
          backgroundStyle={backgroundStyle}
        />
      </View>

      {selectedCanvasItem ? (
        <View style={styles.resizeControls}>
          <Pressable
            onPress={() => adjustSelectedScale(-0.08)}
            style={({ pressed }) => [styles.resizeButton, pressed && styles.resizeButtonPressed]}
          >
            <Text style={styles.resizeButtonText}>-</Text>
          </Pressable>
          <Pressable
            onPress={resetSelectedScale}
            style={({ pressed }) => [styles.resizeBadge, pressed && styles.resizeButtonPressed]}
          >
            <Text style={styles.resizeLabel}>Size {Math.round(selectedCanvasItem.scale * 100)}%</Text>
          </Pressable>
          <Pressable
            onPress={() => adjustSelectedScale(0.08)}
            style={({ pressed }) => [styles.resizeButton, pressed && styles.resizeButtonPressed]}
          >
            <Text style={styles.resizeButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      <WardrobeTray
        items={wardrobeItems}
        loading={loading}
        source={sourceFilter}
        onSourceChange={setSourceFilter}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onAddItem={handleAddItem}
        selectedIds={selectedIds}
      />
    </View>
  );
}

function fallbackLayoutForIndex(
  index: number,
  total: number,
): { x: number; y: number; scale: number; rotation: number } {
  const columns = Math.min(3, Math.max(1, total));
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: clamp(0.33 + col * 0.17, 0.14, 0.86),
    y: clamp(0.3 + row * 0.2, 0.14, 0.9),
    scale: 1,
    rotation: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    canvasWrap: {
      flex: 1,
      padding: 12,
    },
    resizeControls: {
      marginTop: -2,
      marginBottom: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    resizeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resizeBadge: {
      minWidth: 126,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    resizeLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    resizeButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 24,
    },
    resizeButtonPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
  });
}
