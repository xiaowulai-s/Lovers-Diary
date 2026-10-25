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
import { MonthCalendar } from '../../components/MonthCalendar';
import { startOfMonth, toDateKey } from '../../lib/date';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatDateLabel, parseDateOnly } from '../anniversaries/utils';
import type { TodoItem } from './types';
import {
  getTodoErrorMessage,
  useDeleteTodo,
  useSaveTodo,
} from './useTodos';

type TodoFormSheetProps = {
  initial: TodoItem | null;
  defaultDate: Date | null;
  onClose: () => void;
  onSaved: (todo: TodoItem) => void;
};

export function TodoFormSheet({
  initial,
  defaultDate,
  onClose,
  onSaved,
}: TodoFormSheetProps) {
  const insets = useSafeAreaInsets();
  const saveMutation = useSaveTodo();
  const deleteMutation = useDeleteTodo();

  const initialDueDate = initial
    ? (initial.due_on ? parseDateOnly(initial.due_on) : null)
    : defaultDate;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [hasDueDate, setHasDueDate] = useState(Boolean(initialDueDate));
  const [selectedDate, setSelectedDate] = useState(initialDueDate ?? new Date());
  const [month, setMonth] = useState(() => startOfMonth(initialDueDate ?? new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = saveMutation.isPending || deleteMutation.isPending;

  const handleSave = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('给这条计划起个名字。');
      return;
    }

    setError(null);

    try {
      const todo = await saveMutation.mutateAsync({
        id: initial?.id,
        draft: {
          title: trimmedTitle,
          note,
          dueOn: hasDueDate ? toDateKey(selectedDate) : null,
        },
      });
      onSaved(todo);
    } catch (saveError) {
      setError(getTodoErrorMessage(saveError, 'save'));
    }
  };

  const performDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onClose();
    } catch (deleteError) {
      setError(getTodoErrorMessage(deleteError, 'delete'));
    }
  };

  const handleDelete = () => {
    if (!initial) {
      return;
    }

    Alert.alert('删除计划', `确定删除「${initial.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
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
          accessibilityLabel="关闭计划表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{initial ? '编辑计划' : '新的计划'}</Text>
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
              <Text style={styles.fieldLabel}>计划</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  accessibilityLabel="计划名称"
                  autoFocus
                  maxLength={120}
                  onChangeText={(value) => {
                    setTitle(value);
                    setError(null);
                  }}
                  placeholder="例如：一起去看海"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  value={title}
                />
              </View>

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>备注</Text>
              <View style={[styles.inputWrap, styles.noteWrap]}>
                <TextInput
                  accessibilityLabel="计划备注"
                  maxLength={500}
                  multiline
                  onChangeText={(value) => {
                    setNote(value);
                    setError(null);
                  }}
                  placeholder="想补充的细节，可留空"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, styles.noteInput]}
                  textAlignVertical="top"
                  value={note}
                />
              </View>

              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: hasDueDate }}
                onPress={() => {
                  setHasDueDate((current) => !current);
                  setError(null);
                }}
                style={styles.toggleRow}
              >
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>安排日期</Text>
                  <Text style={styles.toggleHint}>有日期的计划会出现在日历里</Text>
                </View>
                <View style={[styles.track, hasDueDate && styles.trackOn]}>
                  <View style={[styles.knob, hasDueDate && styles.knobOn]} />
                </View>
              </Pressable>

              {hasDueDate ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="选择计划日期"
                    onPress={() => setShowCalendar((current) => !current)}
                    style={[styles.dateField, showCalendar && styles.dateFieldActive]}
                  >
                    <View style={styles.dateIcon}>
                      <Feather name="calendar" size={15} color={colors.accentDeep} />
                    </View>
                    <Text style={styles.dateValue}>{formatDateLabel(selectedDate)}</Text>
                    <Feather
                      name={showCalendar ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.inkMuted}
                    />
                  </Pressable>

                  {showCalendar ? (
                    <View style={styles.calendarBox}>
                      <MonthCalendar
                        month={month}
                        selectedDate={selectedDate}
                        onMonthChange={setMonth}
                        onSelectDate={(date) => {
                          setSelectedDate(date);
                          setMonth(startOfMonth(date));
                          setShowCalendar(false);
                          setError(null);
                        }}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}

              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  label={initial ? '保存修改' : '放进计划'}
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
                      {deleteMutation.isPending ? '正在删除…' : '删除这条计划'}
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
    maxHeight: '94%',
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
    paddingBottom: spacing.sm,
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
  disabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  fieldLabel: {
    ...text.caption,
    color: colors.inkSoft,
    fontSize: 11.5,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldSpaced: {
    marginTop: spacing.md,
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
    fontSize: 14.5,
    color: colors.ink,
  },
  noteWrap: {
    minHeight: 82,
  },
  noteInput: {
    minHeight: 78,
    paddingTop: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    ...text.label,
    fontSize: 13,
  },
  toggleHint: {
    ...text.caption,
    fontSize: 10.5,
  },
  track: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    padding: 3,
    backgroundColor: colors.lineStrong,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.accent,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  knobOn: {
    transform: [{ translateX: 18 }],
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateFieldActive: {
    borderColor: colors.accent,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  dateValue: {
    ...text.label,
    flex: 1,
    fontSize: 14,
  },
  calendarBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
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
