import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../theme';
import { Icon } from '../../components/Icon';
import { WardrobeAsset, wardrobeAssetRepository, syncRemoteGarmentsToLocal } from '../../wardrobe';
import { wearLogRepository } from '../../calendar/storage/repository';

interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarScreen() {
  const { theme } = useAppTheme();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [assets, setAssets] = useState<WardrobeAsset[]>([]);
  const [selectedDayAssetIds, setSelectedDayAssetIds] = useState<string[]>([]);
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const monthStartKey = useMemo(() => toDateKey(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)), [displayMonth]);
  const monthEndKey = useMemo(() => toDateKey(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0)), [displayMonth]);

  const monthDays = useMemo(() => buildMonthGrid(displayMonth), [displayMonth]);
  const selectedAssetSet = useMemo(() => new Set(selectedDayAssetIds), [selectedDayAssetIds]);

  const assetById = useMemo(() => {
    const map = new Map<string, WardrobeAsset>();
    assets.forEach((asset) => map.set(asset.id, asset));
    return map;
  }, [assets]);

  const wornAssetsForDay = useMemo(
    () => selectedDayAssetIds.map((assetId) => assetById.get(assetId)).filter((asset): asset is WardrobeAsset => Boolean(asset)),
    [assetById, selectedDayAssetIds],
  );

  const loadAssets = useCallback(async (syncRemote: boolean) => {
    if (syncRemote) {
      await syncRemoteGarmentsToLocal({ limit: 260 });
    }
    const localAssets = await wardrobeAssetRepository.listAll();
    setAssets(localAssets);
  }, []);

  const loadSelectedDay = useCallback(async () => {
    const assetIds = await wearLogRepository.listAssetIdsForDate(selectedDateKey);
    setSelectedDayAssetIds(assetIds);
  }, [selectedDateKey]);

  const loadMonthCounts = useCallback(async () => {
    const counts = await wearLogRepository.listMonthCounts(monthStartKey, monthEndKey);
    setMonthCounts(counts);
  }, [monthEndKey, monthStartKey]);

  const refreshCalendar = useCallback(
    async (syncRemote: boolean) => {
      try {
        setLoading(true);
        await Promise.all([loadAssets(syncRemote), loadSelectedDay(), loadMonthCounts()]);
      } finally {
        setLoading(false);
      }
    },
    [loadAssets, loadMonthCounts, loadSelectedDay],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshCalendar(true);
    }, [refreshCalendar]),
  );

  useEffect(() => {
    void loadSelectedDay();
  }, [loadSelectedDay]);

  useEffect(() => {
    void loadMonthCounts();
  }, [loadMonthCounts]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }, []);

  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  const handleToggleAsset = useCallback(
    async (assetId: string) => {
      const isSelected = selectedAssetSet.has(assetId);
      const nextSelected = !isSelected;
      await wearLogRepository.setWorn(selectedDateKey, assetId, nextSelected);

      setSelectedDayAssetIds((previous) => {
        if (nextSelected) {
          if (previous.includes(assetId)) return previous;
          return [...previous, assetId];
        }
        return previous.filter((id) => id !== assetId);
      });

      setMonthCounts((previous) => {
        const current = previous[selectedDateKey] || 0;
        const next = nextSelected ? current + 1 : Math.max(0, current - 1);
        const updated = { ...previous };
        if (next === 0) {
          delete updated[selectedDateKey];
        } else {
          updated[selectedDateKey] = next;
        }
        return updated;
      });
    },
    [selectedAssetSet, selectedDateKey],
  );

  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [displayMonth],
  );

  const selectedDayLabel = useMemo(
    () => selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    [selectedDate],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 20,
        },
        monthHeader: {
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        },
        monthSide: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        navButton: {
          width: 34,
          height: 34,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        monthTitle: {
          fontSize: 17,
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
        todayButton: {
          minHeight: 34,
          paddingHorizontal: 12,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        todayText: {
          fontSize: 12,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        weekdayRow: {
          flexDirection: 'row',
          marginBottom: 6,
          paddingHorizontal: 2,
        },
        weekdayCell: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 24,
        },
        weekdayLabel: {
          fontSize: 12,
          fontWeight: '600',
          color: theme.colors.textTertiary,
        },
        grid: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
          marginBottom: 14,
        },
        weekRow: {
          flexDirection: 'row',
        },
        dayCell: {
          flex: 1,
          minHeight: 54,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.divider,
          position: 'relative',
        },
        dayText: {
          fontSize: 15,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        dayTextMuted: {
          color: theme.colors.textTertiary,
        },
        selectedDayCell: {
          backgroundColor: theme.colors.surfaceMuted,
        },
        todayRing: {
          borderWidth: 1,
          borderColor: theme.colors.tint,
          borderRadius: 10,
          paddingHorizontal: 7,
          paddingVertical: 2,
        },
        dayDot: {
          position: 'absolute',
          bottom: 6,
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: theme.colors.tint,
        },
        sectionCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: 14,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
        sectionMeta: {
          marginTop: 2,
          fontSize: 13,
          color: theme.colors.textSecondary,
        },
        addButton: {
          minHeight: 34,
          minWidth: 84,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        },
        addButtonText: {
          fontSize: 13,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        wornList: {
          flexDirection: 'row',
          gap: 10,
        },
        wornCard: {
          width: 86,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted,
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 6,
          alignItems: 'center',
        },
        wornImage: {
          width: 72,
          height: 86,
          backgroundColor: 'transparent',
        },
        removeButton: {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 6,
        },
        emptyText: {
          fontSize: 14,
          color: theme.colors.textSecondary,
          lineHeight: 20,
        },
        loadingWrap: {
          minHeight: 120,
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: 'flex-end',
        },
        modalSheet: {
          maxHeight: '80%',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.colors.border,
        },
        modalHeader: {
          minHeight: 56,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        },
        modalTitle: {
          fontSize: 16,
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
        modalGrid: {
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 30,
        },
        pickerItem: {
          width: '31%',
          marginRight: '3.5%',
          marginBottom: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted,
          alignItems: 'center',
          paddingVertical: 8,
          position: 'relative',
        },
        pickerImage: {
          width: 84,
          height: 96,
          backgroundColor: 'transparent',
        },
        pickerCheck: {
          position: 'absolute',
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pickerItemAlt: {
          marginRight: 0,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <View style={styles.monthSide}>
          <Pressable style={styles.navButton} onPress={handlePreviousMonth}>
            <Icon name="back" size={16} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <Pressable style={styles.navButton} onPress={handleNextMonth}>
            <Icon
              name="back"
              size={16}
              color={theme.colors.textSecondary}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
        </View>
        <Pressable style={styles.todayButton} onPress={handleGoToToday}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {chunkCalendarWeeks(monthDays).map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day) => {
              const isSelected = day.key === selectedDateKey;
              const count = monthCounts[day.key] || 0;
              return (
                <Pressable
                  key={day.key}
                  onPress={() => handleSelectDate(day.date)}
                  style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                >
                  <View style={day.isToday ? styles.todayRing : undefined}>
                    <Text style={[styles.dayText, !day.inMonth && styles.dayTextMuted]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                  {count > 0 ? <View style={styles.dayDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>What You Wore</Text>
            <Text style={styles.sectionMeta}>{selectedDayLabel}</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setPickerVisible(true)}>
            <Icon name="plus" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.addButtonText}>Add Clothes</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.emptyText}>Loading wardrobe...</Text>
          </View>
        ) : wornAssetsForDay.length === 0 ? (
          <Text style={styles.emptyText}>
            No clothes logged for this date yet. Tap "Add Clothes" to build your history.
          </Text>
        ) : (
          <FlatList
            horizontal
            data={wornAssetsForDay}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.wornCard}>
                <Image
                  source={{ uri: item.processedUri || item.thumbUri || item.originalUri }}
                  style={styles.wornImage}
                  resizeMode="contain"
                />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleToggleAsset(item.id)}
                >
                  <Icon name="close" size={12} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            )}
            contentContainerStyle={styles.wornList}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Worn Clothes</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <Icon name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              data={assets}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.modalGrid}
              renderItem={({ item, index }) => {
                const selected = selectedAssetSet.has(item.id);
                return (
                  <Pressable
                    style={[styles.pickerItem, (index + 1) % 3 === 0 && styles.pickerItemAlt]}
                    onPress={() => handleToggleAsset(item.id)}
                  >
                    <Image
                      source={{ uri: item.thumbUri || item.processedUri || item.originalUri }}
                      style={styles.pickerImage}
                      resizeMode="contain"
                    />
                    <View style={styles.pickerCheck}>
                      <Icon
                        name={selected ? 'check' : 'plus'}
                        size={12}
                        color={selected ? theme.colors.success : theme.colors.textSecondary}
                      />
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Your uploaded wardrobe is empty. Add clothes in Wardrobe first.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMonthGrid(monthStart: Date): CalendarDay[] {
  const month = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const startOffset = month.getDay();
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - startOffset);
  const todayKey = toDateKey(new Date());
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = toDateKey(day);
    days.push({
      date: day,
      key,
      inMonth: day.getMonth() === month.getMonth(),
      isToday: key === todayKey,
    });
  }

  return days;
}

function chunkCalendarWeeks(days: CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}
