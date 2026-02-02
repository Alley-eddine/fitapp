import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { uploadToCloudinary } from '../lib/cloudinary';

interface UseImagePickerOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  folder?: string;
}

export const useImagePicker = (options: UseImagePickerOptions = {}) => {
  const { onSuccess, onError, folder = 'avatars' } = options;
  const [isUploading, setIsUploading] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        'Permission Required',
        'Gallery access is needed to select photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploading(true);
    try {
      const imageUri = result.assets[0].uri;
      const cloudinaryUrl = await uploadToCloudinary(imageUri, folder);
      onSuccess?.(cloudinaryUrl);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      onError?.(err);
      Alert.alert('Upload Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    await processImage(result);
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    await processImage(result);
  };

  return {
    pickFromGallery,
    takePhoto,
    isUploading,
  };
};
