import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

async function blobToBase64(blobUrl: string): Promise<string | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        console.error('[ImageHelper] FileReader error');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[ImageHelper] blobToBase64 error:', error);
    return null;
  }
}

export async function pickImageBase64(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: Platform.OS !== 'web',
    });
    
    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[ImageHelper] Image picking canceled or no assets');
      return null;
    }
    
    const asset = result.assets[0];
    
    if (Platform.OS === 'web') {
      if (asset.uri) {
        console.log('[ImageHelper] Web: Converting blob URL to base64');
        const base64 = await blobToBase64(asset.uri);
        if (base64) {
          console.log('[ImageHelper] Web: Image converted successfully, length:', base64.length);
          return base64;
        }
      }
      console.error('[ImageHelper] Web: Failed to convert image');
      return null;
    }
    
    if (!asset.base64) {
      console.error('[ImageHelper] No base64 data in picked image');
      return null;
    }
    
    console.log('[ImageHelper] Image picked successfully, base64 length:', asset.base64.length);
    return `data:image/jpeg;base64,${asset.base64}`;
  } catch (error) {
    console.error('[ImageHelper] Error picking image:', error);
    return null;
  }
}
