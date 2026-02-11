import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';
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
import { OutfitCanvas } from '../components/outfit-builder/OutfitCanvas';
import { OutfitToolbar } from '../components/outfit-builder/OutfitToolbar';
import { TemplatePicker, OutfitTemplateId } from '../components/outfit-builder/TemplatePicker';
import { TransformControls } from '../components/outfit-builder/TransformControls';
import { BuilderCanvasItem } from '../components/outfit-builder/types';
import { WardrobeTray } from '../components/outfit-builder/WardrobeTray';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

interface OutfitDraftPayload {
  version: number;
  outfitId: string | null;
  name: string;
  backgroundStyle: OutfitBackgroundStyle;
  items: Array<{
    id: string;
    wardrobeItemId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
    mirror: boolean;
    labelText?: string | null;
    labelVisible: boolean;
  }>;
}

const DRAFT_VERSION = 1;

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
  const [canvasItems, setCanvasItems] = useState<BuilderCanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<OutfitBackgroundStyle>('solid');
  const [showTemplates, setShowTemplates] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);

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

        const wardrobeById = new Map<string, BuilderWardrobeItem>();
        for (const item of wardrobeItems) {
          wardrobeById.set(item.id, item);
        }

        const restoredItems = parsed.items
          .map((item) => {
            const wardrobeItem = wardrobeById.get(item.wardrobeItemId);
            if (!wardrobeItem) return null;
            return {
              ...item,
              wardrobeItem,
            } satisfies BuilderCanvasItem;
          })
          .filter((item: BuilderCanvasItem | null): item is BuilderCanvasItem => Boolean(item));

        setCanvasItems(restoredItems);
        setOutfitName(parsed.name || '');
        setBackgroundStyle(parsed.backgroundStyle || 'solid');
        setOutfitId(parsed.outfitId || null);
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
  }, [hydratedDraft, user?.id, wardrobeItems]);

  useEffect(() => {
    if (!user?.id || !hydratedDraft) return;
    const payload: OutfitDraftPayload = {
      version: DRAFT_VERSION,
      outfitId,
      name: outfitName,
      backgroundStyle,
      items: canvasItems.map((item) => ({
        id: item.id,
        wardrobeItemId: item.wardrobeItemId,
        x: item.x,
        y: item.y,
        scale: item.scale,
        rotation: item.rotation,
        zIndex: item.zIndex,
        mirror: item.mirror,
        labelText: item.labelText || null,
        labelVisible: item.labelVisible,
      })),
    };

    const timeout = setTimeout(() => {
      setOutfitDraft(user.id, JSON.stringify(payload)).catch((error) => {
        console.error('Failed to persist outfit draft:', error);
      });
    }, 220);

    return () => clearTimeout(timeout);
  }, [backgroundStyle, canvasItems, hydratedDraft, outfitId, outfitName, user?.id]);

  const selectedItem = useMemo(
    () => canvasItems.find((item) => item.id === selectedItemId) || null,
    [canvasItems, selectedItemId],
  );

  const selectedIds = useMemo(() => {
    const result = new Set<string>();
    for (const item of canvasItems) {
      result.add(item.wardrobeItemId);
    }
    return result;
  }, [canvasItems]);

  const handleAddItem = useCallback((item: BuilderWardrobeItem) => {
    setCanvasItems((previous) => {
      const existing = previous.find((entry) => entry.wardrobeItemId === item.id);
      if (existing) {
        setSelectedItemId(existing.id);
        return previous;
      }

      const maxZ = previous.reduce((max, entry) => Math.max(max, entry.zIndex), -1);
      const next: BuilderCanvasItem = {
        id: `${item.id}:${Date.now()}`,
        wardrobeItemId: item.id,
        wardrobeItem: item,
        x: 0.5 + ((previous.length % 3) - 1) * 0.08,
        y: 0.5 + (Math.floor(previous.length / 3) % 3 - 1) * 0.06,
        scale: 1,
        rotation: 0,
        zIndex: maxZ + 1,
        mirror: false,
        labelText: item.brand || item.category,
        labelVisible: false,
      };

      setSelectedItemId(next.id);
      return [...previous, next];
    });
  }, []);

  const handleChangeItem = useCallback((id: string, patch: Partial<BuilderCanvasItem>) => {
    setCanvasItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleBringForward = useCallback(() => {
    if (!selectedItemId) return;
    setCanvasItems((previous) => {
      const selected = previous.find((item) => item.id === selectedItemId);
      if (!selected) return previous;
      const highest = previous.reduce((max, item) => Math.max(max, item.zIndex), selected.zIndex);
      return previous.map((item) =>
        item.id === selectedItemId ? { ...item, zIndex: highest + 1 } : item,
      );
    });
  }, [selectedItemId]);

  const handleSendBackward = useCallback(() => {
    if (!selectedItemId) return;
    setCanvasItems((previous) => {
      const selected = previous.find((item) => item.id === selectedItemId);
      if (!selected) return previous;
      const lowest = previous.reduce((min, item) => Math.min(min, item.zIndex), selected.zIndex);
      return previous.map((item) =>
        item.id === selectedItemId ? { ...item, zIndex: lowest - 1 } : item,
      );
    });
  }, [selectedItemId]);

  const handleMirror = useCallback(() => {
    if (!selectedItemId) return;
    setCanvasItems((previous) =>
      previous.map((item) =>
        item.id === selectedItemId ? { ...item, mirror: !item.mirror } : item,
      ),
    );
  }, [selectedItemId]);

  const handleToggleLabel = useCallback(() => {
    if (!selectedItemId) return;
    setCanvasItems((previous) =>
      previous.map((item) => {
        if (item.id !== selectedItemId) return item;
        return {
          ...item,
          labelVisible: !item.labelVisible,
          labelText: item.labelText || item.wardrobeItem.brand || item.wardrobeItem.category,
        };
      }),
    );
  }, [selectedItemId]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    setCanvasItems((previous) => previous.filter((item) => item.id !== selectedItemId));
    setSelectedItemId(null);
  }, [selectedItemId]);

  const applyTemplate = useCallback((template: OutfitTemplateId) => {
    setCanvasItems((previous) => {
      if (previous.length === 0) return previous;
      const positions = templatePositions(template, previous.length);
      return previous.map((item, index) => {
        const position = positions[index] || positions[positions.length - 1];
        return {
          ...item,
          x: position.x,
          y: position.y,
          scale: position.scale,
          rotation: position.rotation,
          zIndex: index,
        };
      });
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (canvasItems.length === 0) {
      Alert.alert('No items', 'Add at least one piece before saving.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: outfitName.trim() ? outfitName.trim() : undefined,
        backgroundStyle,
        items: canvasItems.map((item) => ({
          wardrobeItemId: item.wardrobeItemId,
          x: item.x,
          y: item.y,
          scale: item.scale,
          rotation: item.rotation,
          zIndex: item.zIndex,
          mirror: item.mirror,
          labelText: item.labelText || undefined,
          labelVisible: item.labelVisible,
        })),
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
  }, [backgroundStyle, canvasItems, navigation, outfitId, outfitName, saving, user?.id]);

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
        onBackgroundStyleChange={setBackgroundStyle}
        onOpenTemplates={() => setShowTemplates(true)}
      />

      <OutfitCanvas
        items={canvasItems}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onChangeItem={handleChangeItem}
        backgroundStyle={backgroundStyle}
      />

      <View style={styles.controlsWrap}>
        <TransformControls
          visible={Boolean(selectedItem)}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onMirror={handleMirror}
          onToggleLabel={handleToggleLabel}
          onDelete={handleDeleteSelected}
        />
      </View>

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

      <TemplatePicker
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={applyTemplate}
      />
    </View>
  );
}

function templatePositions(
  template: OutfitTemplateId,
  count: number,
): Array<{ x: number; y: number; scale: number; rotation: number }> {
  if (template === 'center') {
    const base = [
      { x: 0.5, y: 0.48, scale: 1.1, rotation: 0 },
      { x: 0.31, y: 0.62, scale: 0.92, rotation: -6 },
      { x: 0.69, y: 0.62, scale: 0.92, rotation: 6 },
      { x: 0.5, y: 0.78, scale: 0.82, rotation: 0 },
    ];
    return fillTemplate(base, count);
  }

  if (template === 'grid_2x2') {
    const base = [
      { x: 0.32, y: 0.34, scale: 0.94, rotation: -2 },
      { x: 0.68, y: 0.34, scale: 0.94, rotation: 2 },
      { x: 0.32, y: 0.68, scale: 0.94, rotation: 1 },
      { x: 0.68, y: 0.68, scale: 0.94, rotation: -1 },
    ];
    return fillTemplate(base, count);
  }

  const editorial = [
    { x: 0.42, y: 0.32, scale: 1.04, rotation: -7 },
    { x: 0.65, y: 0.5, scale: 0.95, rotation: 5 },
    { x: 0.38, y: 0.62, scale: 0.9, rotation: -4 },
    { x: 0.6, y: 0.76, scale: 0.84, rotation: 8 },
  ];
  return fillTemplate(editorial, count);
}

function fillTemplate(
  base: Array<{ x: number; y: number; scale: number; rotation: number }>,
  count: number,
): Array<{ x: number; y: number; scale: number; rotation: number }> {
  const result: Array<{ x: number; y: number; scale: number; rotation: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const source = base[i % base.length];
    const wrap = Math.floor(i / base.length);
    result.push({
      x: clamp(source.x + (wrap % 2 === 0 ? 0.02 * wrap : -0.02 * wrap), 0.12, 0.88),
      y: clamp(source.y + 0.04 * wrap, 0.14, 0.9),
      scale: clamp(source.scale - 0.05 * wrap, 0.66, 1.18),
      rotation: source.rotation,
    });
  }
  return result;
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
    controlsWrap: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      alignItems: 'center',
      minHeight: 54,
      justifyContent: 'center',
    },
  });
}
