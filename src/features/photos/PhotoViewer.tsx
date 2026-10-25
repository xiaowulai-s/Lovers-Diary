import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing, text } from '../../theme';
import type { PhotoEntry } from './types';
import { getPhotoErrorMessage, useUpdatePhotoMeta } from './usePhotos';
import { formatPhotoDate } from './utils';

type PhotoViewerProps = {
  photo: PhotoEntry;
  imageUrl: string | null;
  albumName: string | null;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export function PhotoViewer({
  photo,
  imageUrl,
  albumName,
  deleting,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const metaMutation = useUpdatePhotoMeta();
  const [loadFailed, setLoadFailed] = useState(false);
  const [favorite, setFavorite] = useState(photo.is_favorite);
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPlaceholder = !imageUrl || loadFailed;

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    setError(null);
    setSaved(false);

    try {
      await metaMutation.mutateAsync({ id: photo.id, isFavorite: next });
    } catch (favoriteError) {
      setFavorite(!next);
      setError(getPhotoErrorMessage(favoriteError, 'meta'));
    }
  };

  const saveCaption = async () => {
    setError(null);
    setSaved(false);

    try {
      await metaMutation.mutateAsync({
        id: photo.id,
        caption: caption.trim() || null,
      });
      setCaption(caption.trim());
      setSaved(true);
    } catch (captionError) {
      setError(getPhotoErrorMessage(captionError, 'meta'));
    }
  };

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭照片"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
            >
              <Feather name="x" size={20} color={colors.surface} />
            </Pressable>

            <Text style={styles.topLabel}>OUR MEMORY</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? '取消收藏照片' : '收藏照片'}
              accessibilityState={{ selected: favorite }}
              disabled={metaMutation.isPending}
              hitSlop={10}
              onPress={() => {
                void toggleFavorite();
              }}
              style={({ pressed }) => [
                styles.roundButton,
                favorite && styles.favoriteButtonActive,
                (pressed || metaMutation.isPending) && styles.pressed,
              ]}
            >
              {metaMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Feather
                  name="heart"
                  size={18}
                  color={favorite ? colors.accentSoft : colors.surface}
                />
              )}
            </Pressable>
          </View>

          <View style={styles.imageArea}>
            {showPlaceholder ? (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon}>
                  <Feather name="image" size={24} color={colors.surface} />
                </View>
                <Text style={styles.placeholderTitle}>照片暂时没有显示</Text>
                <Text style={styles.placeholderText}>
                  {imageUrl ? '这张照片可能已经不存在了。' : '照片链接已过期，关闭后下拉刷新再试。'}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={180}
                cachePolicy="memory-disk"
                onError={() => setLoadFailed(true)}
              />
            )}
          </View>

          <View style={styles.captionArea}>
            <TextInput
              accessibilityLabel="照片说明"
              maxLength={200}
              multiline
              onChangeText={(value) => {
                setCaption(value);
                setSaved(false);
                setError(null);
              }}
              placeholder="给这张照片写一句说明"
              placeholderTextColor="rgba(255, 253, 250, 0.4)"
              style={styles.captionInput}
              textAlignVertical="top"
              value={caption}
            />
            <View style={styles.captionFooter}>
              <Text style={styles.captionStatus}>
                {saved ? '说明已保存' : `${caption.length} / 200`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="保存照片说明"
                disabled={metaMutation.isPending || deleting}
                onPress={() => {
                  void saveCaption();
                }}
                style={({ pressed }) => [
                  styles.saveCaptionButton,
                  (pressed || metaMutation.isPending) && styles.pressed,
                ]}
              >
                <Text style={styles.saveCaptionText}>
                  {metaMutation.isPending ? '保存中…' : '保存说明'}
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.metaCopy}>
              <Text style={styles.date}>{formatPhotoDate(photo.created_at)}</Text>
              <Text style={styles.album}>{albumName ?? '未分类'}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="删除照片"
              disabled={deleting || metaMutation.isPending}
              onPress={onDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
                (deleting || metaMutation.isPending) && styles.disabled,
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Feather name="trash-2" size={15} color={colors.danger} />
              )}
              <Text style={styles.deleteLabel}>删除</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#151110',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 250, 0.12)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(176, 94, 85, 0.42)',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  topLabel: {
    fontFamily: fonts.medium,
    fontSize: 9,
    letterSpacing: 2.4,
    color: 'rgba(255, 253, 250, 0.6)',
  },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 250, 0.12)',
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.surface,
    marginBottom: 4,
  },
  placeholderText: {
    ...text.caption,
    color: 'rgba(255, 253, 250, 0.55)',
    textAlign: 'center',
  },
  captionArea: {
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 253, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 250, 0.12)',
  },
  captionInput: {
    minHeight: 44,
    maxHeight: 80,
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.surface,
  },
  captionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  captionStatus: {
    ...text.caption,
    color: 'rgba(255, 253, 250, 0.42)',
    fontSize: 10,
  },
  saveCaptionButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 253, 250, 0.12)',
  },
  saveCaptionText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.accentSoft,
  },
  errorText: {
    ...text.caption,
    color: '#E9A49D',
    fontSize: 10.5,
    marginTop: spacing.xs,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  metaCopy: {
    gap: 2,
  },
  date: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 23,
    color: colors.surface,
  },
  album: {
    ...text.caption,
    color: 'rgba(255, 253, 250, 0.5)',
    fontSize: 10.5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(164, 74, 66, 0.16)',
  },
  deleteLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.danger,
  },
});
