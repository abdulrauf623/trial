import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { LineIcon } from '../components/LineIcon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface UploadProgress {
  stage: 'selecting' | 'uploading' | 'processing' | 'creating' | 'done';
  progress: number;
  message: string;
}

export function UploadGarmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setUploadProgress({
        stage: 'selecting',
        progress: 100,
        message: 'Image selected',
      });
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setUploadProgress({
        stage: 'selecting',
        progress: 100,
        message: 'Photo taken',
      });
    }
  };

  const importFromUrl = async () => {
    if (!imageUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid image URL');
      return;
    }

    try {
      // Validate URL by attempting to fetch it
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL does not point to an image');
      }

      setSelectedImage(imageUrl);
      setShowUrlInput(false);
      setUploadProgress({
        stage: 'selecting',
        progress: 100,
        message: 'Image loaded from URL',
      });
    } catch (error) {
      console.error('URL import error:', error);
      Alert.alert('Error', 'Failed to load image from URL. Please check the URL and try again.');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Request presigned URL
      setUploadProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Preparing upload...',
      });

      const presignedData = await api.createPresignedUpload({
        contentType: 'image/jpeg',
        type: 'garment',
      });

      // Step 2: Upload to S3
      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading image...',
      });

      const response = await fetch(selectedImage);
      const blob = await response.blob();

      await api.uploadToS3(presignedData.uploadUrl, blob, 'image/jpeg');

      // Step 3: Mark upload complete
      setUploadProgress({
        stage: 'uploading',
        progress: 50,
        message: 'Upload complete, processing...',
      });

      await api.markUploadComplete(presignedData.mediaId, presignedData.publicUrl);

      // Step 4: Poll for processing status
      await pollProcessingStatus(presignedData.mediaId);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Unknown error');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const pollProcessingStatus = async (mediaId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (60 * 2 seconds)

    const poll = async (): Promise<void> => {
      try {
        setUploadProgress({
          stage: 'processing',
          progress: 50 + (attempts / maxAttempts) * 40,
          message: 'Processing image...',
        });

        const status = await api.getMediaStatus(mediaId);

        if (status.status === 'ready') {
          // Processing complete, create garment
          await createGarment(mediaId);
        } else if (status.status === 'failed') {
          throw new Error('Image processing failed');
        } else if (attempts < maxAttempts) {
          // Still processing, poll again
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          throw new Error('Processing timeout');
        }
      } catch (error) {
        console.error('Polling error:', error);
        Alert.alert('Processing Failed', error instanceof Error ? error.message : 'Unknown error');
        setIsUploading(false);
        setUploadProgress(null);
      }
    };

    await poll();
  };

  const createGarment = async (mediaId: string) => {
    try {
      setUploadProgress({
        stage: 'creating',
        progress: 90,
        message: 'Preparing confirmation...',
      });

      // Fetch media status to get detected attributes
      const mediaStatus = await api.getMediaStatus(mediaId);
      const metadata = mediaStatus.metadata || {};

      setUploadProgress({
        stage: 'done',
        progress: 100,
        message: 'Ready for confirmation!',
      });

      // Navigate to confirmation screen
      setTimeout(() => {
        const confirmationImageUrl =
          mediaStatus.processedUrl || mediaStatus.originalUrl || selectedImage;

        if (!confirmationImageUrl) {
          setIsUploading(false);
          setUploadProgress(null);
          Alert.alert('Error', 'No preview image available for confirmation');
          return;
        }

        setIsUploading(false);
        navigation.navigate('GarmentConfirmation', {
          mediaId,
          imageUrl: confirmationImageUrl,
          detectedAttributes: {
            category: metadata.detectedCategory || null,
            pattern: metadata.detectedPattern || null,
            material: metadata.detectedMaterial || null,
            tags: metadata.detectedTags || [],
          },
        });
      }, 500);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add Garment</Text>
        <Text style={styles.subtitle}>Upload a photo of your clothing item</Text>

        {!selectedImage ? (
          <View style={styles.emptyState}>
            <TouchableOpacity style={styles.actionButton} onPress={takePhoto} disabled={isUploading}>
              <LineIcon name="camera" style={styles.actionButtonText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={pickImage}
              disabled={isUploading}
            >
              <LineIcon name="gallery" style={styles.actionButtonText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => setShowUrlInput(!showUrlInput)}
              disabled={isUploading}
            >
              <LineIcon name="link" style={styles.actionButtonText} />
            </TouchableOpacity>

            {showUrlInput && (
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="Enter image URL..."
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity style={styles.urlSubmitButton} onPress={importFromUrl}>
                  <LineIcon name="check" style={styles.urlSubmitButtonText} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.preview} resizeMode="cover" />

            {!isUploading && (
              <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
                <LineIcon name="refresh" style={styles.changeButtonText} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {selectedImage && !isUploading && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My favorite jacket, bought in Paris..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {uploadProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress.message}</Text>
            {isUploading && <ActivityIndicator color="#000" style={{ marginTop: 8 }} />}
          </View>
        )}

        {selectedImage && !isUploading && (
          <TouchableOpacity style={styles.uploadButton} onPress={uploadImage}>
            <LineIcon name="upload" style={styles.uploadButtonText} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  emptyState: {
    marginVertical: 32,
  },
  actionButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  previewContainer: {
    marginVertical: 24,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  changeButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  progressContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  uploadButton: {
    marginTop: 24,
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  urlInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  urlSubmitButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  urlSubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
