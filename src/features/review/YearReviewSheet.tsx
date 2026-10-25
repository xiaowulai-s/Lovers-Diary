import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { exportBackupJson, getBackupErrorMessage } from './exportBackup';
import { ReviewDetailSheet, type ReviewDetail } from './ReviewDetailSheet';
import type { YearFoodItem, YearPhotoSample, YearReviewData } from './types';
import { getYearReviewErrorMessage, useYearReview } from './useYearReview';

type YearReviewSheetProps = {
  onClose: () => void;
};

type StatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Feather name={icon} size={13} color={colors.accentDeep} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
    </View>
  );
}

function photoUri(review: YearReviewData, sample: YearPhotoSample): string | null {
  const key = sample.thumb_path ?? sample.storage_path;
  return review.photoUrls[key] ?? review.photoUrls[sample.storage_path] ?? null;
}

function foodUri(review: YearReviewData, item: YearFoodItem): string | null {
  if (!item.photo_path && !item.thumb_path) {
    return null;
  }
  const key = item.thumb_path ?? item.photo_path;
  return key
    ? (review.photoUrls[key] ??
        (item.photo_path ? review.photoUrls[item.photo_path] : null) ??
        null)
    : null;
}

function shortDate(value: string | null): string {
  return value ? value.slice(0, 10).replace(/-/g, '.') : '';
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

function excerpt(value: string, maxLength = 38): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}…` : singleLine;
}

export function YearReviewSheet({ onClose }: YearReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  const [year, setYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);

  const reviewQuery = useYearReview(year);
  const review = reviewQuery.data;

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);

    try {
      await exportBackupJson();
    } catch (error) {
      setExportError(getBackupErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>OUR YEAR</Text>
            <Text style={styles.title}>年度回顾</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭年度回顾"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Feather name="x" size={18} color={colors.inkSoft} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearRow}
          >
            {years.map((item) => {
              const active = item === year;

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setYear(item)}
                  style={[styles.yearChip, active && styles.yearChipActive]}
                >
                  <Text style={[styles.yearText, active && styles.yearTextActive]}>
                    {item} 年
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {reviewQuery.isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateText}>正在翻这一年的照片和记录</Text>
            </View>
          ) : null}

          {reviewQuery.isError ? (
            <View style={styles.stateCard}>
              <Feather name="cloud-off" size={22} color={colors.danger} />
              <Text style={styles.stateTitle}>这一年没有加载出来</Text>
              <Text style={styles.stateText}>{getYearReviewErrorMessage(reviewQuery.error)}</Text>
              <AppButton
                label="重新加载"
                variant="secondary"
                onPress={() => {
                  void reviewQuery.refetch();
                }}
              />
            </View>
          ) : null}

          {review ? (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.heroYear}>{review.year}</Text>
                <Text style={styles.heroTitle}>这一年的小窝</Text>
                <Text style={styles.heroText}>
                  照片、纸条、餐桌和计划，被一起收进这一页。
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <StatCard icon="image" value={review.photos} label="照片" />
                <StatCard icon="coffee" value={review.food} label="美食" />
                <StatCard icon="feather" value={review.notes} label="小纸条" />
                <StatCard icon="check-circle" value={review.todos_completed} label="完成计划" />
              </View>

              <View style={styles.anniversaryLine}>
                <Feather name="calendar" size={13} color={colors.accentDeep} />
                <Text style={styles.anniversaryText}>
                  这一年记录了 {review.anniversaries} 个纪念日
                </Text>
              </View>

              <SectionLabel title="这一年的照片" note={`${review.photos} 张`} />
              {review.photo_samples.length > 0 ? (
                <View style={styles.photoGrid}>
                  {review.photo_samples.map((sample) => {
                    const uri = photoUri(review, sample);

                    return (
                      <Pressable
                        key={sample.id}
                        accessibilityRole="button"
                        accessibilityLabel="打开照片详情"
                        onPress={() =>
                          setDetail({ kind: 'photo', item: sample, imageUrl: uri })
                        }
                        style={({ pressed }) => [styles.photoTile, pressed && styles.pressed]}
                      >
                        {uri ? (
                          <Image
                            source={{ uri }}
                            style={styles.photo}
                            contentFit="cover"
                            transition={160}
                            cachePolicy="memory-disk"
                            recyclingKey={sample.id}
                          />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Feather name="image" size={16} color={colors.inkMuted} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyLine}>这一年还没有留下照片。</Text>
              )}

              <SectionLabel title="这一年的纸条" note={`${review.notes} 张`} />
              {review.note_items.length > 0 ? (
                <View style={styles.itemList}>
                  {review.note_items.map((note) => (
                    <Pressable
                      key={note.id}
                      accessibilityRole="button"
                      accessibilityLabel="打开纸条详情"
                      onPress={() => setDetail({ kind: 'note', item: note })}
                      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
                    >
                      <View style={styles.itemIcon}>
                        <Feather name="feather" size={14} color={colors.sage} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitleText}>
                          {excerpt(note.body)}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {note.author_name || 'TA'} · {shortDate(note.created_at)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>这一年还没有写纸条。</Text>
              )}

              <SectionLabel title="这一年的餐桌" note={`${review.food} 餐`} />
              {review.food_items.length > 0 ? (
                <View style={styles.itemList}>
                  {review.food_items.map((food) => (
                    <Pressable
                      key={food.id}
                      accessibilityRole="button"
                      accessibilityLabel="打开美食详情"
                      onPress={() =>
                        setDetail({
                          kind: 'food',
                          item: food,
                          imageUrl: foodUri(review, food),
                        })
                      }
                      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.itemIcon, styles.itemIconGold]}>
                        <Feather name="coffee" size={14} color={colors.gold} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitleText}>
                          {food.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {shortDate(food.eaten_on)}
                          {food.city ? ` · ${food.city}` : ''}
                          {food.shop ? ` · ${food.shop}` : ''}
                        </Text>
                      </View>
                      {food.is_favorite ? (
                        <Feather name="heart" size={12} color={colors.accentDeep} />
                      ) : null}
                      <Feather name="chevron-right" size={14} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>这一年还没有记录美食。</Text>
              )}

              <SectionLabel title="完成的计划" note={`${review.todos_completed} 件`} />
              {review.todo_items.length > 0 ? (
                <View style={styles.itemList}>
                  {review.todo_items.map((todo) => (
                    <Pressable
                      key={todo.id}
                      accessibilityRole="button"
                      accessibilityLabel="打开计划详情"
                      onPress={() => setDetail({ kind: 'todo', item: todo })}
                      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.itemIcon, styles.itemIconSage]}>
                        <Feather name="check-circle" size={14} color={colors.sage} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitleText}>
                          {todo.title}
                        </Text>
                        <Text style={styles.itemMeta}>
                          完成于 {shortDate(todo.completed_at)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>这一年还没有完成的计划。</Text>
              )}

              <SectionLabel title="这一年的纪念日" note={`${review.anniversaries} 个`} />
              {review.anniversary_items.length > 0 ? (
                <View style={styles.itemList}>
                  {review.anniversary_items.map((anniversary) => (
                    <Pressable
                      key={anniversary.id}
                      accessibilityRole="button"
                      accessibilityLabel="打开纪念日详情"
                      onPress={() =>
                        setDetail({ kind: 'anniversary', item: anniversary })
                      }
                      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
                    >
                      <View style={styles.itemIcon}>
                        <Feather name="calendar" size={14} color={colors.accentDeep} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitleText}>
                          {anniversary.title}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {shortDate(anniversary.happened_on)} · {kindLabel(anniversary.kind)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>这一年还没有纪念日。</Text>
              )}

              <SectionLabel title="常去的城市" />
              {review.cities.length > 0 ? (
                <View style={styles.chipRow}>
                  {review.cities.map((city) => (
                    <View key={city.city} style={styles.cityChip}>
                      <Feather name="map-pin" size={11} color={colors.sage} />
                      <Text style={styles.chipText}>{city.city}</Text>
                      <Text style={styles.chipCount}>{city.count}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>还没有记录城市。</Text>
              )}

              <SectionLabel title="收藏的味道" />
              {review.favorite_foods.length > 0 ? (
                <View style={styles.chipRow}>
                  {review.favorite_foods.map((food) => (
                    <View key={food.name} style={styles.foodChip}>
                      <Feather name="heart" size={10} color={colors.accentDeep} />
                      <Text numberOfLines={1} style={styles.chipText}>
                        {food.name}
                      </Text>
                      {food.count > 1 ? <Text style={styles.chipCount}>{food.count}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyLine}>还没有收藏的美食。</Text>
              )}

              <View style={styles.exportCard}>
                <View style={styles.exportTitleRow}>
                  <View style={styles.exportIcon}>
                    <Feather name="archive" size={15} color={colors.accentDeep} />
                  </View>
                  <View style={styles.exportCopy}>
                    <Text style={styles.exportTitle}>备份这一整本日记</Text>
                    <Text style={styles.exportText}>
                      JSON 包含全部记录、照片路径和 4 小时有效的 signed URL，不包含照片文件本身。
                    </Text>
                  </View>
                </View>

                {exportError ? (
                  <View style={styles.errorBanner}>
                    <Feather name="alert-circle" size={14} color={colors.danger} />
                    <Text style={styles.errorText}>{exportError}</Text>
                  </View>
                ) : null}

                <AppButton
                  label="导出 JSON 备份"
                  loading={exporting}
                  onPress={() => {
                    void handleExport();
                  }}
                />
                <Text style={styles.exportHint}>通过系统分享保存到自己的备份位置。</Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        {detail ? (
          <ReviewDetailSheet detail={detail} onClose={() => setDetail(null)} />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  kicker: {
    ...text.kicker,
    fontSize: 9,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  closeButton: {
    width: 36,
    height: 36,
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
  },
  yearRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  yearChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  yearChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  yearText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  yearTextActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
  stateCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  stateTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  stateText: {
    ...text.caption,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 19,
  },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroYear: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 70,
    color: colors.accentDeep,
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.ink,
    marginTop: 2,
  },
  heroText: {
    ...text.body,
    fontSize: 12.5,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 280,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 30,
    color: colors.ink,
  },
  statLabel: {
    ...text.caption,
    fontSize: 10.5,
  },
  anniversaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  anniversaryText: {
    ...text.caption,
    fontSize: 11.5,
    color: colors.accentDeep,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  sectionNote: {
    ...text.caption,
    fontSize: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoTile: {
    width: '31.9%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemList: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  itemIconGold: {
    backgroundColor: colors.goldSoft,
  },
  itemIconSage: {
    backgroundColor: colors.sageSoft,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemTitleText: {
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  itemMeta: {
    ...text.caption,
    fontSize: 10,
  },
  emptyLine: {
    ...text.caption,
    fontSize: 11.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.sageSoft,
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.ink,
    flexShrink: 1,
  },
  chipCount: {
    ...text.caption,
    fontSize: 9.5,
    color: colors.inkSoft,
  },
  exportCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  exportTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  exportIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  exportCopy: {
    flex: 1,
    gap: 2,
  },
  exportTitle: {
    ...text.label,
    fontSize: 14,
  },
  exportText: {
    ...text.caption,
    fontSize: 11,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    ...text.caption,
    flex: 1,
    color: colors.danger,
    fontSize: 11.5,
    lineHeight: 18,
  },
  exportHint: {
    ...text.caption,
    textAlign: 'center',
    fontSize: 9.5,
  },
});
