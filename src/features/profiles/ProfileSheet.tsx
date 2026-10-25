import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { useAuth } from '../../providers/AuthProvider';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { processAvatarAsset } from '../photos/imagePipeline';
import { removeStorageObjects, uploadAvatarImage } from '../photos/uploadImage';
import { ProfileAvatar } from './ProfileAvatar';
import type { Profile } from './types';
import { PROFILE_NAME_MAX_LENGTH } from './types';
import { getProfileErrorMessage, useSaveProfile } from './useProfiles';

type ProfileSheetProps = {
  initial: Profile | null;
  avatarUrl: string | null;
  onClose: () => void;
};

export function ProfileSheet({ initial, avatarUrl, onClose }: ProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const saveMutation = useSaveProfile();

  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = uploading || saveMutation.isPending;
  const previewUri = avatarAsset?.uri ?? avatarUrl;
  const previewName = displayName.trim() || initial?.display_name || '我';

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相册权限', '请允许访问相册，头像只会进入你们的私密空间。', [
          {
            text: '去设置',
            onPress: () => {
              void Linking.openSettings();
            },
          },
          { text: '取消', style: 'cancel' },
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarAsset(result.assets[0]);
        setError(null);
      }
    } catch {
      setError('没有打开相册，请稍后重试。');
    }
  };

  const handleSave = async () => {
    const userId = session?.user.id;
    const trimmed = displayName.trim();

    if (!userId) {
      setError('登录状态已失效，请重新登录。');
      return;
    }

    if (!trimmed) {
      setError('给自己起一个昵称。');
      return;
    }

    setError(null);
    setUploading(true);

    let newAvatarPath: string | undefined;

    try {
      if (avatarAsset) {
        const processed = await processAvatarAsset(avatarAsset);
        newAvatarPath = await uploadAvatarImage(processed.uri, userId);
      }

      await saveMutation.mutateAsync({
        userId,
        displayName: trimmed,
        avatarPath: newAvatarPath,
        previousAvatarPath: initial?.avatar_path ?? null,
      });

      onClose();
    } catch (saveError) {
      if (newAvatarPath) {
        await removeStorageObjects([newAvatarPath]);
      }
      setError(getProfileErrorMessage(saveError));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="关闭资料表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>我的资料</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="关闭"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Feather name="x" size={17} color={colors.inkSoft} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.subtitle}>
                昵称会出现在小窝的纸条里，头像只对你们两个人可见。
              </Text>

              <View style={styles.avatarSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="更换头像"
                  disabled={busy}
                  onPress={() => {
                    void pickAvatar();
                  }}
                  style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
                >
                  <ProfileAvatar uri={previewUri} name={previewName} size={96} />
                  <View style={styles.avatarBadge}>
                    <Feather name="camera" size={13} color={colors.surface} />
                  </View>
                </Pressable>
                <Text style={styles.avatarHint}>点击更换头像</Text>
                <Text style={styles.avatarNote}>自动压缩到 300KB 以内</Text>
              </View>

              <Text style={styles.fieldLabel}>昵称</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  accessibilityLabel="我的昵称"
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    setError(null);
                  }}
                  placeholder="例如：小苏"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  value={displayName}
                />
                <Text style={styles.counter}>{displayName.length} / {PROFILE_NAME_MAX_LENGTH}</Text>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  label="保存资料"
                  loading={busy}
                  onPress={() => {
                    void handleSave();
                  }}
                />
                <Text style={styles.footerNote}>修改后，TA 下次刷新就能看到。</Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44, 39, 35, 0.45)',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '92%',
  },
  sheet: {
    maxHeight: '100%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  subtitle: {
    ...text.body,
    fontSize: 12.5,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarButton: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  avatarHint: {
    ...text.label,
    fontSize: 12.5,
    marginTop: spacing.sm,
  },
  avatarNote: {
    ...text.caption,
    fontSize: 10,
    marginTop: 2,
  },
  fieldLabel: {
    ...text.caption,
    color: colors.inkSoft,
    fontSize: 11.5,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  input: {
    minHeight: 50,
    paddingVertical: 13,
    paddingRight: 54,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.ink,
  },
  counter: {
    ...text.caption,
    position: 'absolute',
    right: 14,
    bottom: 16,
    fontSize: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.dangerSoft,
    marginTop: spacing.md,
  },
  errorText: {
    ...text.caption,
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 19,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  footerNote: {
    ...text.caption,
    textAlign: 'center',
    fontSize: 10,
  },
});
