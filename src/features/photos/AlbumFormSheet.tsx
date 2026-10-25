import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { colors, fonts, radius, spacing, text } from '../../theme';
import type { PhotoAlbum } from './types';
import {
  getPhotoErrorMessage,
  useDeleteAlbum,
  useSaveAlbum,
} from './usePhotos';

type AlbumFormSheetProps = {
  initial: PhotoAlbum | null;
  onClose: () => void;
  onSaved: (album: PhotoAlbum) => void;
  onDeleted: (id: string) => void;
};

export function AlbumFormSheet({
  initial,
  onClose,
  onSaved,
  onDeleted,
}: AlbumFormSheetProps) {
  const insets = useSafeAreaInsets();
  const saveMutation = useSaveAlbum();
  const deleteMutation = useDeleteAlbum();

  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const busy = saveMutation.isPending || deleteMutation.isPending;

  const handleSave = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError('给相册起一个名字。');
      return;
    }

    setError(null);

    try {
      const album = await saveMutation.mutateAsync({ id: initial?.id, name: trimmed });
      onSaved(album);
    } catch (saveError) {
      setError(getPhotoErrorMessage(saveError, 'album'));
    }
  };

  const performDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onDeleted(id);
    } catch (deleteError) {
      setError(getPhotoErrorMessage(deleteError, 'album'));
    }
  };

  const handleDelete = () => {
    if (!initial) {
      return;
    }

    Alert.alert('删除相册', `「${initial.name}」里的照片会保留，并回到未分类。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除相册',
        style: 'destructive',
        onPress: () => {
          void performDelete(initial.id);
        },
      },
    ]);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="关闭相册表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{initial ? '编辑相册' : '新建相册'}</Text>
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

            <Text style={styles.subtitle}>把照片分门别类，翻起来会更像一本册子。</Text>

            <Text style={styles.fieldLabel}>相册名称</Text>
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel="相册名称"
                autoFocus
                maxLength={40}
                onChangeText={(value) => {
                  setName(value);
                  setError(null);
                }}
                onSubmitEditing={() => {
                  void handleSave();
                }}
                placeholder="例如：第一次旅行"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="done"
                style={styles.input}
                value={name}
              />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <AppButton
                label={initial ? '保存修改' : '创建相册'}
                loading={saveMutation.isPending}
                disabled={deleteMutation.isPending}
                onPress={() => {
                  void handleSave();
                }}
              />
              {initial ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                >
                  <Feather name="trash-2" size={14} color={colors.danger} />
                  <Text style={styles.deleteText}>
                    {deleteMutation.isPending ? '正在删除…' : '删除相册'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
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
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.xs,
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
    opacity: 0.65,
  },
  subtitle: {
    ...text.body,
    fontSize: 12.5,
    lineHeight: 20,
    marginBottom: spacing.md,
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
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  deleteText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
});
