import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { MonthCalendar } from '../../components/MonthCalendar';
import { startOfMonth, toDateKey } from '../../lib/date';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import type { FoodRecord } from './types';
import {
  getFoodErrorMessage,
  useDeleteFoodRecord,
  useSaveFoodRecord,
} from './useFood';
import {
  buildFoodTime,
  currentFoodTime,
  foodTimeValue,
} from './utils';
import { parseDateOnly } from '../anniversaries/utils';

type FoodFormSheetProps = {
  initial: FoodRecord | null;
  defaultDate: Date;
  existingPhotoUrl: string | null;
  onClose: () => void;
  onSaved: (record: FoodRecord) => void;
};

export function FoodFormSheet({
  initial,
  defaultDate,
  existingPhotoUrl,
  onClose,
  onSaved,
}: FoodFormSheetProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const saveMutation = useSaveFoodRecord();
  const deleteMutation = useDeleteFoodRecord();

  const initialDate = initial
    ? (parseDateOnly(initial.eaten_on) ?? defaultDate)
    : defaultDate;
  const initialTime = initial ? foodTimeValue(initial.eaten_at) : currentFoodTime();

  const [name, setName] = useState(initial?.name ?? '');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [month, setMonth] = useState(() => startOfMonth(initialDate));
  const [showCalendar, setShowCalendar] = useState(false);
  const [hour, setHour] = useState(initialTime.slice(0, 2));
  const [minute, setMinute] = useState(initialTime.slice(3, 5));
  const [city, setCity] = useState(initial?.city ?? '');
  const [shop, setShop] = useState(initial?.shop ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [favorite, setFavorite] = useState(initial?.is_favorite ?? false);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = saveMutation.isPending || deleteMutation.isPending;
  const previewUri = photoAsset?.uri ?? existingPhotoUrl;

  const showPermissionAlert = (target: '相册' | '相机') => {
    Alert.alert(`需要${target}权限`, `请允许访问${target}，照片只会进入你们的私密空间。`, [
      {
        text: '去设置',
        onPress: () => {
          void Linking.openSettings();
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const pickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert('相册');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoAsset(result.assets[0]);
        setError(null);
      }
    } catch (pickerError) {
      setError(getFoodErrorMessage(pickerError, 'save'));
    }
  };

  const pickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert('相机');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoAsset(result.assets[0]);
        setError(null);
      }
    } catch (pickerError) {
      setError(getFoodErrorMessage(pickerError, 'save'));
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('这一餐的照片', '可以拍照或从相册选择一张。', [
      {
        text: '拍照',
        onPress: () => {
          void pickFromCamera();
        },
      },
      {
        text: '从相册选择',
        onPress: () => {
          void pickFromLibrary();
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('给这一餐起个名字。');
      return;
    }

    const eatenAt = buildFoodTime(hour, minute);
    if (!eatenAt) {
      setError('请填写有效的时间：小时 00–23，分钟 00–59。');
      return;
    }

    const userId = session?.user.id;
    if (!userId) {
      setError('登录状态已失效，请重新登录。');
      return;
    }

    setError(null);

    try {
      const record = await saveMutation.mutateAsync({
        id: initial?.id,
        userId,
        photoAsset,
        existingPhotoPath: initial?.photo_path ?? null,
        existingThumbPath: initial?.thumb_path ?? null,
        draft: {
          name: trimmedName,
          eatenOn: toDateKey(selectedDate),
          eatenAt,
          city,
          shop,
          note,
          isFavorite: favorite,
        },
      });

      onSaved(record);
    } catch (saveError) {
      setError(getFoodErrorMessage(saveError, 'save'));
    }
  };

  const performDelete = async (record: FoodRecord) => {
    try {
      await deleteMutation.mutateAsync(record);
      onClose();
    } catch (deleteError) {
      setError(getFoodErrorMessage(deleteError, 'delete'));
    }
  };

  const handleDelete = () => {
    if (!initial) {
      return;
    }

    Alert.alert('删除这一餐', `确定删除「${initial.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void performDelete(initial);
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
          accessibilityLabel="关闭这一餐表单"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>{initial ? '编辑这一餐' : '记下一餐'}</Text>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="选择美食照片"
                onPress={handlePhotoPress}
                style={({ pressed }) => [styles.photoBox, pressed && styles.pressed]}
              >
                {previewUri ? (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.photo}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={styles.photoEmpty}>
                    <View style={styles.photoIcon}>
                      <Feather name="camera" size={19} color={colors.accentDeep} />
                    </View>
                    <Text style={styles.photoTitle}>给这一餐留一张照片</Text>
                    <Text style={styles.photoHint}>会自动压缩到 500KB 以内</Text>
                  </View>
                )}
                {previewUri ? (
                  <View style={styles.photoBadge}>
                    <Feather name="refresh-cw" size={11} color={colors.surface} />
                    <Text style={styles.photoBadgeText}>更换</Text>
                  </View>
                ) : null}
              </Pressable>

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>名称</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  accessibilityLabel="美食名称"
                  maxLength={80}
                  onChangeText={(value) => {
                    setName(value);
                    setError(null);
                  }}
                  placeholder="例如：巷口的番茄牛腩面"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  value={name}
                />
              </View>

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, styles.fieldSpaced]}>日期</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="选择日期"
                    onPress={() => setShowCalendar((current) => !current)}
                    style={[styles.compactField, showCalendar && styles.compactFieldActive]}
                  >
                    <Feather name="calendar" size={14} color={colors.accentDeep} />
                    <Text style={styles.compactValue}>
                      {selectedDate.getFullYear()}.{String(selectedDate.getMonth() + 1).padStart(2, '0')}.
                      {String(selectedDate.getDate()).padStart(2, '0')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, styles.fieldSpaced]}>时间</Text>
                  <View style={styles.compactField}>
                    <Feather name="clock" size={14} color={colors.accentDeep} />
                    <TextInput
                      accessibilityLabel="用餐小时"
                      keyboardType="number-pad"
                      maxLength={2}
                      onBlur={() => {
                        setHour((current) => (current ? current.padStart(2, '0') : current));
                      }}
                      onChangeText={(value) => {
                        setHour(value.replace(/\D/g, '').slice(0, 2));
                        setError(null);
                      }}
                      placeholder="19"
                      placeholderTextColor={colors.inkMuted}
                      selectTextOnFocus
                      style={styles.timePartInput}
                      value={hour}
                    />
                    <Text style={styles.timeColon}>:</Text>
                    <TextInput
                      accessibilityLabel="用餐分钟"
                      keyboardType="number-pad"
                      maxLength={2}
                      onBlur={() => {
                        setMinute((current) => (current ? current.padStart(2, '0') : current));
                      }}
                      onChangeText={(value) => {
                        setMinute(value.replace(/\D/g, '').slice(0, 2));
                        setError(null);
                      }}
                      placeholder="30"
                      placeholderTextColor={colors.inkMuted}
                      selectTextOnFocus
                      style={styles.timePartInput}
                      value={minute}
                    />
                  </View>
                </View>
              </View>

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

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, styles.fieldSpaced]}>城市</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      accessibilityLabel="城市"
                      maxLength={40}
                      onChangeText={(value) => {
                        setCity(value);
                        setError(null);
                      }}
                      placeholder="可选"
                      placeholderTextColor={colors.inkMuted}
                      style={styles.input}
                      value={city}
                    />
                  </View>
                </View>

                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, styles.fieldSpaced]}>店铺</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      accessibilityLabel="店铺"
                      maxLength={80}
                      onChangeText={(value) => {
                        setShop(value);
                        setError(null);
                      }}
                      placeholder="可选"
                      placeholderTextColor={colors.inkMuted}
                      style={styles.input}
                      value={shop}
                    />
                  </View>
                </View>
              </View>

              <Text style={[styles.fieldLabel, styles.fieldSpaced]}>备注</Text>
              <View style={[styles.inputWrap, styles.noteWrap]}>
                <TextInput
                  accessibilityLabel="美食备注"
                  maxLength={500}
                  multiline
                  onChangeText={(value) => {
                    setNote(value);
                    setError(null);
                  }}
                  placeholder="味道、天气，或当时的一句话"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, styles.noteInput]}
                  textAlignVertical="top"
                  value={note}
                />
              </View>

              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: favorite }}
                onPress={() => {
                  setFavorite((current) => !current);
                  setError(null);
                }}
                style={styles.favoriteRow}
              >
                <View style={styles.favoriteCopy}>
                  <Text style={styles.favoriteTitle}>收藏这一餐</Text>
                  <Text style={styles.favoriteHint}>喜欢的味道会单独留下标记</Text>
                </View>
                <View style={[styles.favoriteIcon, favorite && styles.favoriteIconOn]}>
                  <Feather
                    name="heart"
                    size={15}
                    color={favorite ? colors.surface : colors.inkMuted}
                  />
                </View>
              </Pressable>

              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  label={initial ? '保存修改' : '收进美食月历'}
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
                      {deleteMutation.isPending ? '正在删除…' : '删除这一餐'}
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
  photoBox: {
    height: 156,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  photoTitle: {
    ...text.label,
    fontSize: 13,
  },
  photoHint: {
    ...text.caption,
    fontSize: 10,
    marginTop: 2,
  },
  photoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(44, 39, 35, 0.55)',
  },
  photoBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.surface,
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
    minHeight: 88,
  },
  noteInput: {
    minHeight: 84,
    paddingTop: 13,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  compactField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  compactFieldActive: {
    borderColor: colors.accent,
  },
  compactValue: {
    ...text.label,
    fontSize: 13,
  },
  timePartInput: {
    width: 26,
    height: '100%',
    padding: 0,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.ink,
  },
  timeColon: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.inkSoft,
    marginHorizontal: 1,
  },
  calendarBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  favoriteCopy: {
    flex: 1,
    gap: 2,
  },
  favoriteTitle: {
    ...text.label,
    fontSize: 13,
  },
  favoriteHint: {
    ...text.caption,
    fontSize: 10.5,
  },
  favoriteIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  favoriteIconOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
