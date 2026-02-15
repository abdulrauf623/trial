import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { UserGarment } from '@fashion/shared';
import { LineIcon } from '../components/LineIcon';

export function GarmentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { garmentId } = route.params as { garmentId: string };

  const [garment, setGarment] = useState<UserGarment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingAiRender, setGeneratingAiRender] = useState(false);

  useEffect(() => {
    loadGarment();
  }, [garmentId]);

  async function loadGarment() {
    try {
      const data = await api.getUserGarment(garmentId);
      setGarment(data);
      setNotes(data.notes || '');
      setCategory(data.category || '');
    } catch (error) {
      console.error('Failed to load garment:', error);
      Alert.alert('Error', 'Failed to load garment details');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!garment) return;

    setSaving(true);
    try {
      const updated = await api.updateUserGarment(garment.id, {
        notes: notes || undefined,
        category: category || undefined,
      });
      setGarment(updated);
      setEditing(false);
      Alert.alert('Success', 'Garment updated successfully');
    } catch (error) {
      console.error('Failed to update garment:', error);
      Alert.alert('Error', 'Failed to update garment');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Garment',
      'Are you sure you want to remove this garment from your wardrobe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUserGarment(garmentId);
              Alert.alert('Deleted', 'Garment removed from wardrobe');
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete garment:', error);
              Alert.alert('Error', 'Failed to delete garment');
            }
          },
        },
      ],
    );
  }

  async function handleDownload() {
    const imageUrl = garment?.processedUrl || garment?.originalUrl;
    if (!imageUrl) {
      Alert.alert('No Photo', 'This model has no downloadable photo yet.');
      return;
    }

    try {
      await Share.share({
        message: imageUrl,
        url: imageUrl,
      });
    } catch (error) {
      console.error('Failed to open download/share:', error);
      Alert.alert('Error', 'Failed to open download options');
    }
  }

  async function handleGenerateAiRender() {
    if (!garment) return;
    setGeneratingAiRender(true);
    try {
      const response = await api.generateGarmentAiRender(garment.id);
      setGarment(response.garment);
      Alert.alert('Done', 'Generated clean model render and depth image.');
    } catch (error: any) {
      console.error('Failed to generate AI render:', error);
      Alert.alert('Error', error?.message || 'Failed to generate AI render');
    } finally {
      setGeneratingAiRender(false);
    }
  }

  if (loading || !garment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Image
          source={{ uri: garment.processedUrl || garment.originalUrl || '' }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.content}>
          {garment.colors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Colors</Text>
              <View style={styles.colorPalette}>
                {garment.colors.map((color, index) => (
                  <View key={index} style={[styles.colorSwatch, { backgroundColor: color }]} />
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g., tshirt, jacket, pants"
              />
            ) : (
              <Text style={styles.sectionValue}>
                {garment.category ? (
                  <Text style={styles.categoryText}>{garment.category}</Text>
                ) : (
                  <Text style={styles.placeholderText}>Not specified</Text>
                )}
              </Text>
            )}
            {garment.confidence && !editing && (
              <Text style={styles.confidenceText}>
                Auto-detected ({Math.round(garment.confidence * 100)}% confidence)
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this garment..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.sectionValue}>
                {garment.notes || <Text style={styles.placeholderText}>No notes yet</Text>}
              </Text>
            )}
          </View>

          {garment.status === 'processing' && (
            <View style={styles.statusBanner}>
              <ActivityIndicator color="#666" />
              <Text style={styles.statusText}>Processing...</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Clean Model</Text>
            {garment.aiModelImageUrl ? (
              <Image source={{ uri: garment.aiModelImageUrl }} style={styles.aiImage} resizeMode="cover" />
            ) : (
              <Text style={styles.placeholderText}>Not generated yet</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Depth Image</Text>
            {garment.aiDepthMapUrl ? (
              <Image source={{ uri: garment.aiDepthMapUrl }} style={styles.aiImage} resizeMode="cover" />
            ) : (
              <Text style={styles.placeholderText}>Not generated yet</Text>
            )}
          </View>

          <View style={styles.actions}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <LineIcon name="check" style={styles.buttonText} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setEditing(false);
                    setNotes(garment.notes || '');
                    setCategory(garment.category || '');
                  }}
                  disabled={saving}
                >
                  <LineIcon name="close" style={[styles.buttonText, styles.cancelButtonText]} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.button, styles.editButton]} onPress={() => setEditing(true)}>
                  <LineIcon name="edit" style={styles.buttonText} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.downloadButton]} onPress={handleDownload}>
                  <LineIcon name="share" style={[styles.buttonText, styles.downloadButtonText]} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
                  <LineIcon name="trash" style={[styles.buttonText, styles.deleteButtonText]} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.aiRenderButton]}
                  onPress={handleGenerateAiRender}
                  disabled={generatingAiRender}
                >
                  {generatingAiRender ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Generate Clean Model + Depth</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Added {new Date(garment.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  aiImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  sectionValue: {
    fontSize: 16,
    color: '#000',
  },
  categoryText: {
    textTransform: 'capitalize',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  editButton: {
    backgroundColor: '#000',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  downloadButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  aiRenderButton: {
    backgroundColor: '#111827',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  downloadButtonText: {
    color: '#000',
  },
  cancelButtonText: {
    color: '#000',
  },
  deleteButtonText: {
    color: '#ff3b30',
  },
  metadata: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
