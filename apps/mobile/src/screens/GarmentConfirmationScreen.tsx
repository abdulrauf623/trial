import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { LineIcon } from '../components/LineIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'GarmentConfirmation'>;

const CATEGORY_OPTIONS = ['tshirt', 'pants', 'dress', 'jacket', 'shoes', 'accessory', 'other'];
const PATTERN_OPTIONS = ['solid', 'striped', 'floral', 'plaid', 'checkered', 'graphic'];
const MATERIAL_OPTIONS = ['cotton', 'denim', 'wool', 'leather', 'silk', 'polyester', 'linen'];
const OCCASION_TAGS = ['casual', 'formal', 'business', 'athletic', 'party', 'summer', 'winter'];
const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter'];
const FORMALITY_OPTIONS = [1, 2, 3, 4, 5];

export function GarmentConfirmationScreen({ route, navigation }: Props) {
  const { mediaId, imageUrl, detectedAttributes } = route.params;

  // Initialize state with detected attributes
  const [category, setCategory] = useState(detectedAttributes.category || '');
  const [pattern, setPattern] = useState(detectedAttributes.pattern || '');
  const [material, setMaterial] = useState(detectedAttributes.material || '');
  const [subcategory, setSubcategory] = useState('');
  const [silhouetteTag, setSilhouetteTag] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [textureTagsInput, setTextureTagsInput] = useState('');
  const [seasonTags, setSeasonTags] = useState<string[]>([]);
  const [formalityScore, setFormalityScore] = useState(3);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(detectedAttributes.tags || []);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleSeason = (season: string) => {
    setSeasonTags((prev) =>
      prev.includes(season) ? prev.filter((item) => item !== season) : [...prev, season]
    );
  };

  const parseList = (raw: string): string[] =>
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

  const handleSave = async () => {
    if (!category) {
      Alert.alert('Missing Category', 'Please select a category for this item.');
      return;
    }

    setIsSaving(true);

    try {
      await api.createUserGarment({
        mediaUploadId: mediaId,
        category,
        subcategory: subcategory || undefined,
        colors: parseList(colorsInput),
        pattern,
        patternType: pattern || undefined,
        textureTags: parseList(textureTagsInput),
        formalityScore,
        seasonTags,
        silhouetteTag: silhouetteTag || undefined,
        material,
        brand: brand || undefined,
        size: size || undefined,
        tags: selectedTags,
        notes: notes || undefined,
      });

      Alert.alert('Success', 'Item added to your wardrobe!', [
        {
          text: '◫',
          onPress: () => navigation.navigate('Main', { screen: 'Wardrobe' }),
        },
        {
          text: '+',
          onPress: () => navigation.navigate('UploadGarment'),
        },
      ]);
    } catch (error) {
      console.error('Failed to create garment:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.form}>
          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.optionGrid}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.optionChip, category === cat && styles.optionChipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      category === cat && styles.optionChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pattern */}
          <View style={styles.section}>
            <Text style={styles.label}>Pattern</Text>
            <View style={styles.optionGrid}>
              {PATTERN_OPTIONS.map((pat) => (
                <TouchableOpacity
                  key={pat}
                  style={[styles.optionChip, pattern === pat && styles.optionChipSelected]}
                  onPress={() => setPattern(pat)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      pattern === pat && styles.optionChipTextSelected,
                    ]}
                  >
                    {pat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subcategory */}
          <View style={styles.section}>
            <Text style={styles.label}>Subcategory (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={subcategory}
              onChangeText={setSubcategory}
              placeholder="e.g., blazer, wide-leg, crew neck"
              placeholderTextColor="#999"
            />
          </View>

          {/* Colors */}
          <View style={styles.section}>
            <Text style={styles.label}>Colors (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={colorsInput}
              onChangeText={setColorsInput}
              placeholder="e.g., black, white, olive"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Texture Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Texture tags (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={textureTagsInput}
              onChangeText={setTextureTagsInput}
              placeholder="e.g., knit, denim, ribbed"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Material */}
          <View style={styles.section}>
            <Text style={styles.label}>Material</Text>
            <View style={styles.optionGrid}>
              {MATERIAL_OPTIONS.map((mat) => (
                <TouchableOpacity
                  key={mat}
                  style={[styles.optionChip, material === mat && styles.optionChipSelected]}
                  onPress={() => setMaterial(mat)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      material === mat && styles.optionChipTextSelected,
                    ]}
                  >
                    {mat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Season Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Season Tags</Text>
            <View style={styles.optionGrid}>
              {SEASON_OPTIONS.map((season) => (
                <TouchableOpacity
                  key={season}
                  style={[styles.optionChip, seasonTags.includes(season) && styles.optionChipSelected]}
                  onPress={() => toggleSeason(season)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      seasonTags.includes(season) && styles.optionChipTextSelected,
                    ]}
                  >
                    {season}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Formality */}
          <View style={styles.section}>
            <Text style={styles.label}>Formality Score</Text>
            <View style={styles.optionGrid}>
              {FORMALITY_OPTIONS.map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.optionChip, formalityScore === score && styles.optionChipSelected]}
                  onPress={() => setFormalityScore(score)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      formalityScore === score && styles.optionChipTextSelected,
                    ]}
                  >
                    {score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Silhouette */}
          <View style={styles.section}>
            <Text style={styles.label}>Silhouette (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={silhouetteTag}
              onChangeText={setSilhouetteTag}
              placeholder="e.g., oversized, slim, wide"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Occasion Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Occasion Tags</Text>
            <View style={styles.optionGrid}>
              {OCCASION_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.optionChip, selectedTags.includes(tag) && styles.optionChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      selectedTags.includes(tag) && styles.optionChipTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand */}
          <View style={styles.section}>
            <Text style={styles.label}>Brand (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Nike, Zara, H&M"
              placeholderTextColor="#999"
            />
          </View>

          {/* Size */}
          <View style={styles.section}>
            <Text style={styles.label}>Size (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={size}
              onChangeText={setSize}
              placeholder="e.g., S, M, L, 32x34"
              placeholderTextColor="#999"
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSaving}
        >
          <LineIcon name="close" style={styles.cancelButtonText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <LineIcon name="check" style={styles.saveButtonText} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#ff3b30',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionChipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  optionChipText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  optionChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
