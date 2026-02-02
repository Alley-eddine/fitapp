import * as ImageManipulator from 'expo-image-manipulator';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

interface UploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compress and resize image before upload
 */
export const compressImage = async (
  uri: string,
  options: UploadOptions = {}
): Promise<string> => {
  const { maxWidth = 500, maxHeight = 500, quality = 0.7 } = options;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return result.uri;
};

/**
 * Upload image to Cloudinary
 * Returns the WebP optimized URL
 */
export const uploadToCloudinary = async (
  imageUri: string,
  folder = 'avatars'
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }

  // Compress image before upload
  const compressedUri = await compressImage(imageUri);

  // Create form data
  const formData = new FormData();

  // Get file extension and create file object
  const filename = compressedUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: compressedUri,
    name: filename,
    type,
  } as unknown as Blob);

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  // Upload to Cloudinary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const data = await response.json() as CloudinaryResponse;

  // Return WebP optimized URL with auto quality
  // Cloudinary automatically serves WebP to supported browsers
  const optimizedUrl = data.secure_url
    .replace('/upload/', '/upload/f_auto,q_auto/')
    .replace(/\.\w+$/, '.webp');

  return optimizedUrl;
};

/**
 * Get optimized Cloudinary URL with transformations
 */
export const getOptimizedUrl = (
  url: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string => {
  const { width, height, crop = 'fill' } = options;

  if (!url.includes('cloudinary.com')) {
    return url;
  }

  let transformations = 'f_auto,q_auto';
  if (width) transformations += `,w_${String(width)}`;
  if (height) transformations += `,h_${String(height)}`;
  if (width || height) transformations += `,c_${crop}`;

  return url.replace('/upload/', `/upload/${transformations}/`);
};
