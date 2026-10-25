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
import type { Anniversary, AnniversaryDraft, AnniversaryKind } from './types';
import {
  getAnniversaryMutationError,
  useDeleteAnniversary,
  useSaveAnniversary,
} from './useAnniversaries';
import {
  ANNIVERSARY_KINDS,
  ANNIVERSARY_KIND_LABELS,
  calendarDaysBetween,
  formatDateLabel,
  parseDateOnly,
} from './utils';

type AnniversaryFormSheetProps = {
  initial: Anniversary | null;
  defaultKind?: AnniversaryKind;
  hasTogether: boolean;
  onClose: () => void;
};

export function AnniversaryFormSheet({
  initial,
  defaultKind = 'anniversary',
  hasTogether,
  onClose,
}: AnniversaryFormSheetProps) {
  const insets = useSafeAreaInsets();
  const saveMutation = useSaveAnniversary();
  const deleteMutation = useDeleteAnniversary();

  const initialDate = initial
    ? (parseDateOnly(initial.happened_on) ?? new Date())
    : new Date();
  const initialKind = initial?.kind ?? defaultKind;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [month, setMonth] = useState(() => startOfMonth(initialDate));
  const [kind, setKind] = useState<AnniversaryKind>(initialKind);
  const [recurring, setRecurring] = useState(
    initial?.recurring ?? (initialKind !== 'trip' && initialKind !== 'custom'),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togetherConflict =
    kind === 'together' && hasTogether && initial?.kind !== 'together';
  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleSave = async () => {
    if (saving || deleting) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('给这个日子起个名字。');
      return;
    }

    if (kind === 'together' && calendarDaysBetween(new Date(), selectedDate) > 0) {
      setError('在一起的日子不能晚于今天。');
      return;
    }

    if (togetherConflict) {
      setError('已经有一个“在一起”的日子了，请直接编辑那一条。');
      return;
    }

    const draft: AnniversaryDraft = {
      title: trimmedTitle,
      happenedOn: toDateKey(selectedDate),
      kind,
      recurring,
      note,
    };

    setError(null);

    try {
      await saveMutation.mutateAsync({ id: initial?.id, draft });
      onClose();
    } catch (saveError) {
      setError(getAnniversaryMutationError(saveError, 'save'));
    }
  };

  const performDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onClose();
    } catch (deleteError) {
      setError(getAnniversaryMutationError(deleteError, 'delete'));
    }
  };

  const handleDelete = () => {
    if (!initial) {
      return;
    }

    Alert.alert('删除纪念日', `确定删除「${initial.title}」吗？`, [
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
          accessibilityLabel="关闭表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{initial ? '编辑纪念日' : '新的纪念日'}</Text>
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
                styles.form,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>名称</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  accessibilityLabel="纪念日名称"
                  maxLength={80}
                  onChangeText={(value) => {
                    setTitle(value);
                    setError(null);
                  }}
                  placeholder="例如：第一次一起看海"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  value={title}
                />
              </View>

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>日期</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="选择日期"
                onPress={() => setShowCalendar((current) => !current)}
                style={[styles.dateField, showCalendar && styles.dateFieldActive]}
              >
                <View style={styles.dateIcon}>
                  <Feather name="calendar" size={15} color={colors.accentDeep} />
                </View>
                <View style={styles.dateCopy}>
                  <Text style={styles.dateValue}>{formatDateLabel(selectedDate)}</Text>
                  <Text style={styles.dateHint}>按本地日期记录</Text>
                </View>
                <Feather
                  name={showCalendar ? 'chevron-up' : 'chevron-down'}
                  size={17}
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

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>类型</Text>
              <View style={styles.kindRow}>
                {ANNIVERSARY_KINDS.map((itemKind) => {
                  const isActive = kind === itemKind;

                  return (
                    <Pressable
                      key={itemKind}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => {
                        setKind(itemKind);
                        if (!initial) {
                          setRecurring(itemKind !== 'trip' && itemKind !== 'custom');
                        }
                        setError(null);
                      }}
                      style={[styles.kindChip, isActive && styles.kindChipActive]}
                    >
                      <Text
                        style={[styles.kindLabel, isActive && styles.kindLabelActive]}
                      >
                        {ANNIVERSARY_KIND_LABELS[itemKind]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {togetherConflict ? (
                <Text style={styles.conflictHint}>
                  已经有一个“在一起”的日子了，请直接编辑那一条。
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: recurring }}
                onPress={() => {
                  setRecurring((current) => !current);
                  setError(null);
                }}
                style={styles.toggleRow}
              >
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>每年重复</Text>
                  <Text style={styles.toggleHint}>
                    生日和纪念日会在每年同一天回到日历里
                  </Text>
                </View>
                <View style={[styles.track, recurring && styles.trackOn]}>
                  <View style={[styles.knob, recurring && styles.knobOn]} />
                </View>
              </Pressable>

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>备注</Text>
              <View style={[styles.inputWrap, styles.noteWrap]}>
                <TextInput
                  accessibilityLabel="纪念日备注"
                  maxLength={500}
                  multiline
                  onChangeText={(value) => {
                    setNote(value);
                    setError(null);
                  }}
                  placeholder="想留下的一句话，可留空"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, styles.noteInput]}
                  textAlignVertical="top"
                  value={note}
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
                  label={initial ? '保存修改' : '保存纪念日'}
                  loading={saving}
                  disabled={togetherConflict || deleting}
                  onPress={() => {
                    void handleSave();
                  }}
                />
                {initial ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={deleting || saving}
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.pressed,
                      (deleting || saving) && styles.deleteDisabled,
                    ]}
                  >
                    <Feather name="trash-2" size={14} color={colors.danger} />
                    <Text style={styles.deleteText}>
                      {deleting ? '正在删除…' : '删除这个纪念日'}
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
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
  form: {
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
    fontSize: 15,
    color: colors.ink,
  },
  noteWrap: {
    minHeight: 92,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: 13,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  dateCopy: {
    flex: 1,
    gap: 1,
  },
  dateValue: {
    ...text.label,
    fontSize: 14,
  },
  dateHint: {
    ...text.caption,
    fontSize: 10.5,
  },
  calendarBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  kindChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.canvasDeep,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  kindChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  kindLabel: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  kindLabelActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
  conflictHint: {
    ...text.caption,
    color: colors.danger,
    marginTop: spacing.xs,
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
    lineHeight: 16,
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
    gap: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  deleteDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.danger,
  },
});
