import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { Theme } from '@/constants/Theme';
import { createImageCaption } from '@/services/imageCaptionService';
import { getUploadSignature, uploadToCloudinary } from '@/services/uploadService';
import { savePhotoMissionLog, translatePhotoCaption } from '@/services/photoMissionService';
import { CaptionResult } from '@/types/learning';
import { photoMissionStyles as styles } from '@/styles/photoMissionStyles';

type Props = { onComplete?: () => void };

export function PhotoMissionActivity({ onComplete }: Props) {
  const [uri, setUri] = useState<string>();
  const [caption, setCaption] = useState<CaptionResult>();
  const [translatedCaption, setTranslatedCaption] = useState<string>();
  const [isTranslating, setIsTranslating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vocabList, setVocabList] = useState<string[]>([]);
  const [newVocab, setNewVocab] = useState('');

  const choose = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền máy ảnh', 'Hãy cho phép truy cập máy ảnh để làm nhiệm vụ này.');
        return;
      }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled) {
      setUri(result.assets[0].uri);
      setCaption(undefined);
      setTranslatedCaption(undefined);
    }
  };

  const discover = async () => {
    if (!uri) return;
    setLoading(true);
    try {
      const result = await createImageCaption(uri);
      setCaption(result);
    } catch {
      Alert.alert('Chưa nhận diện được', 'Thử lại với ảnh rõ và đủ sáng hơn nhé.');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!caption || translatedCaption) return;
    setIsTranslating(true);
    try {
      const translation = await translatePhotoCaption(caption.caption);
      setTranslatedCaption(translation);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể dịch caption lúc này.');
    } finally {
      setIsTranslating(false);
    }
  };

  const openSaveModal = () => {
    setVocabList(caption?.objects || []);
    setNewVocab('');
    setSaveModalVisible(true);
  };

  const addVocab = () => {
    const trimmed = newVocab.trim();
    if (trimmed && !vocabList.includes(trimmed.toLowerCase())) {
      setVocabList([...vocabList, trimmed.toLowerCase()]);
    }
    setNewVocab('');
  };

  const removeVocab = (word: string) => {
    setVocabList(vocabList.filter(w => w !== word));
  };

  const confirmSave = async () => {
    if (!uri || !caption) return;
    setSaving(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('Not logged in');

      const ext = uri.split('.').pop() || 'jpg';
      const sig = await getUploadSignature(userId, ext);
      const secureUrl = await uploadToCloudinary(uri, sig);
      
      await savePhotoMissionLog(secureUrl, caption.caption, vocabList);
      
      setSaveModalVisible(false);
      Alert.alert('Thành công', 'Đã lưu thẻ bài vào bộ sưu tập vĩnh viễn!');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thẻ bài. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (caption) return <View style={styles.result}>
    {uri && <Image source={{ uri }} style={styles.preview} />}
    <View style={styles.captionIcon}><MaterialCommunityIcons name="creation" size={26} color={Theme.colors.violet} /></View>
    <Text style={styles.smallLabel}>AI CAPTION</Text>
    <Text style={styles.caption}>{caption.caption}</Text>
    <Text style={styles.translation}>Hãy nghe và đọc to câu tiếng Anh này một lần.</Text>
    
    <View style={styles.resultActions}>
      <Pressable style={styles.listenCaption} onPress={() => Speech.speak(caption.caption, { language: 'en-US', rate: 0.75 })}>
        <MaterialCommunityIcons name="volume-high" size={22} color={Theme.colors.blueDark} />
      </Pressable>
      <Pressable style={styles.translateCaptionBtn} onPress={handleTranslate} disabled={isTranslating || !!translatedCaption}>
        {isTranslating ? (
          <ActivityIndicator size="small" color={Theme.colors.coralDark} />
        ) : (
          <MaterialCommunityIcons name="translate" size={22} color={translatedCaption ? Theme.colors.muted : Theme.colors.coralDark} />
        )}
        <Text style={[styles.translateCaptionText, translatedCaption && { color: Theme.colors.muted }]}>
          {translatedCaption ? 'Đã dịch' : 'Xem bản dịch'}
        </Text>
      </Pressable>
      <Pressable style={styles.saveCaption} onPress={openSaveModal}>
        <MaterialCommunityIcons name="content-save" size={22} color={Theme.colors.violet} />
        <Text style={styles.saveCaptionText}>Lưu thẻ bài</Text>
      </Pressable>
    </View>

    {translatedCaption && (
      <View style={styles.translatedContainer}>
        <Text style={styles.translatedText}>{translatedCaption}</Text>
      </View>
    )}

    <ActionButton label={onComplete ? 'Đã đọc xong' : 'Thử ảnh khác'} icon={onComplete ? 'check' : 'camera-retake'} onPress={() => onComplete ? onComplete() : setCaption(undefined)} />

    <Modal visible={saveModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Lưu vào Bộ sưu tập</Text>
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="information" size={20} color={Theme.colors.blueDark} />
            <Text style={styles.warningText}>Thẻ bài sẽ được lưu vĩnh viễn vào bộ sưu tập của con đấy nhé!</Text>
          </View>
          
          <Text style={styles.vocabLabel}>Từ vựng trong ảnh:</Text>
          <View style={styles.vocabContainer}>
            {vocabList.map(word => (
              <View key={word} style={styles.vocabChip}>
                <Text style={styles.vocabChipText}>{word}</Text>
                <Pressable onPress={() => removeVocab(word)} hitSlop={10}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={Theme.colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
          
          <View style={styles.addVocabRow}>
            <TextInput 
              style={styles.vocabInput}
              value={newVocab}
              onChangeText={setNewVocab}
              placeholder="Thêm từ vựng mới..."
              onSubmitEditing={addVocab}
            />
            <Pressable style={styles.addVocabBtn} onPress={addVocab}>
              <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
            </Pressable>
          </View>

          {saving ? <ActivityIndicator size="large" color={Theme.colors.violet} style={{marginTop: 20}} /> : (
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setSaveModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={confirmSave}>
                <Text style={styles.confirmBtnText}>Xác nhận lưu</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  </View>;

  return <View style={styles.container}>
    {uri ? <Image source={{ uri }} style={styles.preview} /> : <View style={styles.placeholder}><MaterialCommunityIcons name="image-plus" size={54} color={Theme.colors.blue} /><Text style={styles.placeholderText}>Chụp hoặc chọn một đồ vật an toàn, rõ nét</Text></View>}
    <View style={styles.actions}>
      <Pressable style={styles.sourceButton} onPress={() => choose('camera')}><MaterialCommunityIcons name="camera" size={25} color={Theme.colors.blueDark} /><Text style={styles.sourceLabel}>Chụp ảnh</Text></Pressable>
      <Pressable style={styles.sourceButton} onPress={() => choose('gallery')}><MaterialCommunityIcons name="image-multiple" size={25} color={Theme.colors.violet} /><Text style={styles.sourceLabel}>Thư viện</Text></Pressable>
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={Theme.colors.green} /><Text style={styles.loadingText}>Đang khám phá bức ảnh...</Text></View> : <ActionButton label="Tạo caption tiếng Anh" icon="creation" disabled={!uri} onPress={discover} />}
    <Text style={styles.privacy}>Ảnh chỉ được gửi để tạo caption và không được chia sẻ công khai.</Text>
  </View>;
}


