import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { UserGarment } from '@fashion/shared';
import { LineIcon } from '../components/LineIcon';

export function CreatePostScreen() {
  const navigation = useNavigation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [garments, setGarments] = useState<UserGarment[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    loadGarments();
  }, []);

  const loadGarments = async () => {
    try {
      const response = await api.listUserGarments(undefined, 100);
      // Only show ready garments
      setGarments(response.garments.filter((g) => g.status === 'ready'));
    } catch (error) {
      console.error('Failed to load garments:', error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      uploadImageToS3(result.assets[0].uri);
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
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      uploadImageToS3(result.assets[0].uri);
    }
  };

  const uploadImageToS3 = async (uri: string) => {
    setUploadingImage(true);

    try {
      // Get presigned URL
      const presignedData = await api.createPresignedUpload({
        contentType: 'image/jpeg',
        type: 'post',
      });

      // Upload to S3
      const response = await fetch(uri);
      const blob = await response.blob();
      await api.uploadToS3(presignedData.uploadUrl, blob, 'image/jpeg');

      // Mark complete
      await api.markUploadComplete(presignedData.mediaId, presignedData.publicUrl);

      setMediaId(presignedData.mediaId);
      setPublicUrl(presignedData.publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      setSelectedImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleGarmentSelection = (garmentId: string) => {
    if (selectedGarments.includes(garmentId)) {
      setSelectedGarments(selectedGarments.filter((id) => id !== garmentId));
    } else {
      setSelectedGarments([...selectedGarments, garmentId]);
    }
  };

  const handlePost = async () => {
    if (!selectedImage || !publicUrl) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    setLoading(true);

    try {
      await api.createUserPost({
        imageUrl: publicUrl,
        mediaUploadId: mediaId || undefined,
        caption: caption.trim(),
        taggedGarmentIds: selectedGarments.length > 0 ? selectedGarments : undefined,
      });

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderGarmentItem = ({ item }: { item: UserGarment }) => {
    const isSelected = selectedGarments.includes(item.id);
    const garmentImageUri = item.thumbnailUrl || item.processedUrl || item.originalUrl;

    return (
      <TouchableOpacity
        style={[styles.garmentItem, isSelected && styles.garmentItemSelected]}
        onPress={() => toggleGarmentSelection(item.id)}
      >
        {garmentImageUri ? (
          <Image
            source={{ uri: garmentImageUri }}
            style={styles.garmentThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.garmentThumbnail, styles.garmentThumbnailPlaceholder]}>
            <LineIcon name="wardrobe" style={styles.garmentThumbnailPlaceholderText} />
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
        {item.category && <Text style={styles.garmentCategory}>{item.category}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <LineIcon name="close" style={styles.headerButton} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={loading || uploadingImage || !selectedImage}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <LineIcon name="upload" style={[styles.headerButton, styles.postButton]} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Image Section */}
        {!selectedImage ? (
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
              <LineIcon name="camera" style={styles.imagePickerButtonText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imagePickerButton, styles.imagePickerButtonSecondary]}
              onPress={pickImage}
            >
              <LineIcon name="gallery" style={styles.imagePickerButtonText} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.postImage} resizeMode="cover" />
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
              <LineIcon name="refresh" style={styles.changeImageButtonText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Section */}
        {selectedImage && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{caption.length}/500</Text>
            </View>

            {/* Tag Garments Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Tag Garments {selectedGarments.length > 0 && `(${selectedGarments.length})`}
              </Text>
              <Text style={styles.sectionSubtitle}>Select items from your wardrobe</Text>

              {garments.length === 0 ? (
                <View style={styles.emptyGarments}>
                  <Text style={styles.emptyGarmentsText}>No garments in your wardrobe yet</Text>
                  <TouchableOpacity
                    style={styles.addGarmentButton}
                    onPress={() => navigation.navigate('UploadGarment' as never)}
                  >
                    <LineIcon name="plus" style={styles.addGarmentButtonText} />
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={garments}
                  renderItem={renderGarmentItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.garmentsList}
                />
              )}
            </View>
          </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    fontSize: 16,
    color: '#666',
  },
  postButton: {
    color: '#000',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imagePickerContainer: {
    padding: 32,
    gap: 12,
  },
  imagePickerButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  imagePickerButtonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  imagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  imageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: '#f0f0f0',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  garmentsList: {
    gap: 12,
  },
  garmentItem: {
    width: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  garmentItemSelected: {
    borderColor: '#000',
  },
  garmentThumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  garmentThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentThumbnailPlaceholderText: {
    fontSize: 22,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  garmentCategory: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  emptyGarments: {
    padding: 24,
    alignItems: 'center',
  },
  emptyGarmentsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addGarmentButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addGarmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
