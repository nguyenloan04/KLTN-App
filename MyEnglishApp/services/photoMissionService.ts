import AsyncStorage from '@react-native-async-storage/async-storage';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://10.0.2.2:8080';

export type PhotoMissionLog = {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string;
  discoveredVocabularies: string[];
  createdAt: string;
};

export const savePhotoMissionLog = async (
  imageUrl: string,
  caption: string,
  discoveredVocabularies: string[]
): Promise<PhotoMissionLog> => {
  const token = await AsyncStorage.getItem('userToken');
  
  const response = await fetch(`${BASE_URL}/learner/photo-mission/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      caption,
      discoveredVocabularies,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save photo mission log');
  }

  return response.json();
};

export const getPhotoMissionLogs = async (): Promise<PhotoMissionLog[]> => {
  const token = await AsyncStorage.getItem('userToken');
  
  const response = await fetch(`${BASE_URL}/learner/photo-mission/logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch photo mission logs');
  }

  return response.json();
};

export const translatePhotoCaption = async (caption: string): Promise<string> => {
  const token = await AsyncStorage.getItem('userToken');
  
  const response = await fetch(`${BASE_URL}/learner/photo-mission/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ caption }),
  });

  if (!response.ok) {
    throw new Error('Failed to translate photo caption');
  }

  return response.text();
};
