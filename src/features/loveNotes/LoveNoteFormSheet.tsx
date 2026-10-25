import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { colors, fonts, radius, spacing, text } from '../../theme';
import type { LoveNote } from './useLoveNotes';
import {
  getLoveNoteErrorMessage,
  useDeleteLoveNote,
  useSaveLoveNote,
} from './useLoveNotes';

type LoveNoteFormSheetProps = {
  initial: LoveNote | null;
  onClose: () => void;
};

export function LoveNoteFormSheet({ initial, onClose }: LoveNoteFormSheetProps) {
  const insets = useSafeAreaInsets();
  const saveMutation = useSaveLoveNote();
  const deleteMutation = useDeleteLoveNote();

  const [body, setBody] = useState(initial?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  const busy = saveMutation.isPending || deleteMutation.isPending;

  const handleSave = async () => {
    const trimmed = body.trim();

    if (!trimmed) {
      setError('写下一点想留给 TA 的话。');
      return;
    }

    setError(null);

    try {
      await saveMutation.mutateAsync({ id: initial?.id, body: trimmed });
      onClose();
    } catch (saveError) {
      setError(getLoveNoteErrorMessage(saveError, 'save'));
    }
  };

  const performDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onClose();
    } catch (deleteError) {
      setError(getLoveNoteErrorMessage(deleteError, 'delete'));
    }
  };

  const handleDelete = () => {
    if (!initial) {
      return;
    }

    Alert.alert('删除纸条', '这张纸条会从两个人的小窝里消失。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除纸条',
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
          accessibilityLabel="关闭纸条表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{initial ? '编辑小纸条' : '写一张小纸条'}</Text>
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
              <Text style={styles.subtitle}>有些话不用等一个合适的时机，放在这里就好。</Text>

              <View style={styles.paper}>
                <TextInput
                  accessibilityLabel="纸条内容"
                  autoFocus
                  maxLength={1000}
                  multiline
                  onChangeText={(value) => {
                    setBody(value);
                    setError(null);
                  }}
                  placeholder="今天想对 TA 说……"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  textAlignVertical="top"
                  value={body}
                />
                <Text style={styles.counter}>{body.length} / 1000</Text>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  label={initial ? '保存修改' : '放进口袋'}
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
                      {deleteMutation.isPending ? '正在删除…' : '删除这张纸条'}
                    </Text>
                  </Pressable>
                ) : null}
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
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.5,
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
  paper: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  input: {
    minHeight: 150,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 27,
    color: colors.ink,
    padding: 0,
  },
  counter: {
    ...text.caption,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
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
});
