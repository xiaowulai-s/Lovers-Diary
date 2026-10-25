import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing, text } from '../../theme';
import type {
  YearAnniversaryItem,
  YearFoodItem,
  YearNoteItem,
  YearPhotoSample,
  YearTodoItem,
} from './types';

export type ReviewDetail =
  | { kind: 'photo'; item: YearPhotoSample; imageUrl: string | null }
  | { kind: 'note'; item: YearNoteItem }
  | { kind: 'food'; item: YearFoodItem; imageUrl: string | null }
  | { kind: 'todo'; item: YearTodoItem }
  | { kind: 'anniversary'; item: YearAnniversaryItem };

type ReviewDetailSheetProps = {
  detail: ReviewDetail;
  onClose: () => void;
};

function dateOnly(value: string | null): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 10).replace(/-/g, '.');
}

function dateTime(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day} ${hour}:${minute}`;
}

function timeOnly(value: string): string {
  return value.slice(0, 5);
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'birthday':
      return '生日';
    case 'anniversary':
      return '纪念';
    case 'trip':
      return '旅行';
    case 'custom':
      return '标记';
    default:
      return '在一起';
  }
}

function detailTitle(detail: ReviewDetail): string {
  switch (detail.kind) {
    case 'photo':
      return '照片';
    case 'note':
      return '小纸条';
    case 'food':
      return '这一餐';
    case 'todo':
      return '完成计划';
    case 'anniversary':
      return '纪念日';
  }
}

function detailKicker(detail: ReviewDetail): string {
  switch (detail.kind) {
    case 'photo':
      return 'A MEMORY';
    case 'note':
      return 'A NOTE';
    case 'food':
      return 'A MEAL';
    case 'todo':
      return 'A PLAN';
    case 'anniversary':
      return 'A DATE';
  }
}

export function ReviewDetailSheet({ detail, onClose }: ReviewDetailSheetProps) {
  const insets = useSafeAreaInsets();

  if (detail.kind === 'photo') {
    return (
      <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
        <StatusBar style="light" />
        <SafeAreaView style={styles.photoRoot}>
          <View style={styles.photoTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭照片"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.photoClose, pressed && styles.pressed]}
            >
              <Feather name="x" size={20} color={colors.surface} />
            </Pressable>
            <Text style={styles.photoLabel}>A MEMORY</Text>
            <View style={styles.photoClosePlaceholder} />
          </View>

          <View style={styles.photoArea}>
            {detail.imageUrl ? (
              <Image
                source={{ uri: detail.imageUrl }}
                style={styles.photoImage}
                contentFit="contain"
                transition={180}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.photoEmpty}>
                <Feather name="image" size={24} color={colors.surface} />
                <Text style={styles.photoEmptyText}>照片链接暂时不可用</Text>
              </View>
            )}
          </View>

          <View style={styles.photoFooter}>
            <Text style={styles.photoDate}>{dateTime(detail.item.taken_at)}</Text>
            <Text numberOfLines={3} style={styles.photoCaption}>
              {detail.item.caption?.trim() || '这张照片没有写说明。'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="关闭详情"
        />

        <View style={styles.sheetContainer}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <View>
                <Text style={styles.kicker}>{detailKicker(detail)}</Text>
                <Text style={styles.title}>{detailTitle(detail)}</Text>
              </View>
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
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
            >
              {detail.kind === 'note' ? (
                <>
                  <Text style={styles.itemTitle}>留给彼此的话</Text>
                  <Text style={styles.meta}>
                    {detail.item.author_name || 'TA'} · {dateTime(detail.item.created_at)}
                  </Text>
                  <View style={styles.notePaper}>
                    <Text style={styles.noteBody}>{detail.item.body}</Text>
                  </View>
                </>
              ) : null}

              {detail.kind === 'food' ? (
                <>
                  <Text style={styles.itemTitle}>{detail.item.name}</Text>
                  <Text style={styles.meta}>
                    {dateOnly(detail.item.eaten_on)} · {timeOnly(detail.item.eaten_at)}
                  </Text>
                  {detail.imageUrl ? (
                    <Image
                      source={{ uri: detail.imageUrl }}
                      style={styles.foodImage}
                      contentFit="cover"
                      transition={160}
                      cachePolicy="memory-disk"
                    />
                  ) : null}
                  <View style={styles.tagRow}>
                    {detail.item.is_favorite ? (
                      <View style={[styles.tag, styles.tagFavorite]}>
                        <Feather name="heart" size={11} color={colors.accentDeep} />
                        <Text style={styles.tagText}>收藏</Text>
                      </View>
                    ) : null}
                    {detail.item.city ? (
                      <View style={styles.tag}>
                        <Feather name="map-pin" size={11} color={colors.sage} />
                        <Text style={styles.tagText}>{detail.item.city}</Text>
                      </View>
                    ) : null}
                    {detail.item.shop ? (
                      <View style={styles.tag}>
                        <Feather name="coffee" size={11} color={colors.gold} />
                        <Text style={styles.tagText}>{detail.item.shop}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.body}>
                    {detail.item.note?.trim() || '这一餐没有写备注。'}
                  </Text>
                </>
              ) : null}

              {detail.kind === 'todo' ? (
                <>
                  <Text style={styles.itemTitle}>{detail.item.title}</Text>
                  <Text style={styles.meta}>完成于 {dateTime(detail.item.completed_at)}</Text>
                  {detail.item.due_on ? (
                    <Text style={styles.meta}>原计划 {dateOnly(detail.item.due_on)}</Text>
                  ) : null}
                  <Text style={styles.body}>
                    {detail.item.note?.trim() || '这件事没有写备注。'}
                  </Text>
                </>
              ) : null}

              {detail.kind === 'anniversary' ? (
                <>
                  <Text style={styles.itemTitle}>{detail.item.title}</Text>
                  <Text style={styles.meta}>
                    {dateOnly(detail.item.happened_on)} · {kindLabel(detail.item.kind)}
                    {detail.item.recurring ? ' · 每年' : ''}
                  </Text>
                  <Text style={styles.body}>
                    {detail.item.note?.trim() || '这个日子没有写备注。'}
                  </Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
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
    maxHeight: '90%',
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
  kicker: {
    ...text.kicker,
    fontSize: 9,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 32,
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 36,
    color: colors.ink,
  },
  meta: {
    ...text.caption,
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    ...text.body,
    fontSize: 14,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  notePaper: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  noteBody: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 29,
    color: colors.ink,
  },
  foodImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  tagFavorite: {
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  photoRoot: {
    flex: 1,
    backgroundColor: '#151110',
  },
  photoTopBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  photoClose: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 250, 0.12)',
  },
  photoClosePlaceholder: {
    width: 36,
    height: 36,
  },
  photoLabel: {
    fontFamily: fonts.medium,
    fontSize: 9,
    letterSpacing: 2.4,
    color: 'rgba(255, 253, 250, 0.6)',
  },
  photoArea: {
    flex: 1,
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoEmptyText: {
    ...text.caption,
    color: 'rgba(255, 253, 250, 0.55)',
  },
  photoFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  photoDate: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.surface,
  },
  photoCaption: {
    ...text.body,
    fontSize: 12.5,
    lineHeight: 20,
    color: 'rgba(255, 253, 250, 0.65)',
  },
});
