import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { MonthCalendar } from '../components/MonthCalendar';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { FoodFormSheet } from '../features/food/FoodFormSheet';
import type { FoodRecord } from '../features/food/types';
import { useFoodMonth } from '../features/food/useFood';
import { foodTimeValue } from '../features/food/utils';
import { parseDateOnly } from '../features/anniversaries/utils';
import { formatDayLabel, startOfMonth, toDateKey } from '../lib/date';
import { colors, fonts, radius, spacing, text } from '../theme';

type RecordCardProps = {
  record: FoodRecord;
  photoUrl: string | null;
  onPress: () => void;
};

function FoodRecordCard({ record, photoUrl, onPress }: RecordCardProps) {
  const metaParts = [foodTimeValue(record.eaten_at), record.shop, record.city].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`编辑美食记录：${record.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.recordCard, pressed && styles.pressed]}
    >
      <View style={styles.recordPhotoWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.recordPhoto}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.recordPhotoEmpty}>
            <Feather name="coffee" size={18} color={colors.inkMuted} />
          </View>
        )}
      </View>

      <View style={styles.recordCopy}>
        <View style={styles.recordTitleRow}>
          <Text numberOfLines={1} style={styles.recordName}>
            {record.name}
          </Text>
          {record.is_favorite ? (
            <Feather name="heart" size={12} color={colors.accent} />
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.recordMeta}>
          {metaParts.join(' · ') || '记下了一餐'}
        </Text>
        {record.note ? (
          <Text numberOfLines={1} style={styles.recordNote}>
            {record.note}
          </Text>
        ) : null}
      </View>

      <Feather name="chevron-right" size={15} color={colors.inkMuted} />
    </Pressable>
  );
}

export function FoodScreen() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formState, setFormState] = useState<{ record: FoodRecord | null } | null>(null);

  const monthQuery = useFoodMonth(month);
  const records = monthQuery.data?.items ?? [];
  const urls = monthQuery.data?.urls ?? {};

  const selectedKey = toDateKey(selectedDate);
  const dayRecords = records.filter((record) => record.eaten_on === selectedKey);
  const markedDays = Array.from(
    new Set(
      records
        .map((record) => Number(record.eaten_on.slice(8, 10)))
        .filter((day) => Number.isInteger(day) && day > 0),
    ),
  );

  const recordCount = records.length;
  const favoriteCount = records.filter((record) => record.is_favorite).length;
  const shopCount = new Set(
    records.map((record) => record.shop?.trim()).filter(Boolean),
  ).size;
  const cityCount = new Set(
    records.map((record) => record.city?.trim()).filter(Boolean),
  ).size;

  const handleMonthChange = (nextMonth: Date) => {
    setMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  const openCreate = () => {
    setFormState({ record: null });
  };

  const handleSaved = (record: FoodRecord) => {
    const date = parseDateOnly(record.eaten_on) ?? selectedDate;
    setMonth(startOfMonth(date));
    setSelectedDate(date);
    setFormState(null);
  };

  const editingPhotoUrl = (() => {
    const record = formState?.record;
    if (!record) {
      return null;
    }
    const path = record.thumb_path ?? record.photo_path;
    return path ? (urls[path] ?? null) : null;
  })();

  const renderDaySection = () => {
    if (monthQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在翻这个月的味道</Text>
        </Card>
      );
    }

    if (monthQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="这个月没有加载出来"
            description="检查网络后再试一次，之前记下的味道都还在。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void monthQuery.refetch();
            }}
          />
        </Card>
      );
    }

    if (dayRecords.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="coffee"
            title="这一天还没有美味"
            description="拍下当时的样子，记下店名、时间、城市和一句好吃的理由。"
            tone="sage"
          />
          <AppButton label="记录这一天" onPress={openCreate} />
        </Card>
      );
    }

    return (
      <View style={styles.recordList}>
        {dayRecords.map((record) => {
          const previewPath = record.thumb_path ?? record.photo_path;

          return (
            <FoodRecordCard
              key={record.id}
              record={record}
              photoUrl={previewPath ? (urls[previewPath] ?? null) : null}
              onPress={() => setFormState({ record })}
            />
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <PageHeader
        kicker="OUR TABLE"
        title="美食"
        subtitle="记住的不只是味道，还有坐在对面的人。"
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加美食记录"
            hitSlop={8}
            onPress={openCreate}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={18} color={colors.surface} />
          </Pressable>
        }
      />

      <Card style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{recordCount}</Text>
          <Text style={styles.statLabel}>本月记录</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{favoriteCount}</Text>
          <Text style={styles.statLabel}>收藏</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{shopCount}</Text>
          <Text style={styles.statLabel}>家店</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{cityCount}</Text>
          <Text style={styles.statLabel}>座城市</Text>
        </View>
      </Card>

      <Card style={styles.calendarCard}>
        <MonthCalendar
          month={month}
          selectedDate={selectedDate}
          markedDays={markedDays}
          onMonthChange={handleMonthChange}
          onSelectDate={setSelectedDate}
        />
      </Card>

      <SectionHeader
        title={formatDayLabel(selectedDate)}
        note={`${dayRecords.length} 条`}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加当天美食记录"
            hitSlop={8}
            onPress={openCreate}
            style={({ pressed }) => [styles.smallAddButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={14} color={colors.accentDeep} />
          </Pressable>
        }
      />
      {renderDaySection()}

      {formState ? (
        <FoodFormSheet
          initial={formState.record}
          defaultDate={selectedDate}
          existingPhotoUrl={editingPhotoUrl}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
  },
  pressed: {
    opacity: 0.7,
  },
  smallAddButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 23,
    lineHeight: 31,
    color: colors.accentDeep,
  },
  statLabel: {
    ...text.caption,
    fontSize: 10,
    marginTop: 1,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: colors.line,
  },
  calendarCard: {
    padding: spacing.md,
  },
  stateCard: {
    paddingVertical: spacing.sm,
  },
  stateText: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  recordList: {
    gap: spacing.xs,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
  },
  recordPhotoWrap: {
    width: 62,
    height: 62,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  recordPhoto: {
    width: '100%',
    height: '100%',
  },
  recordPhotoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCopy: {
    flex: 1,
    gap: 2,
  },
  recordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recordName: {
    ...text.label,
    flex: 1,
    fontSize: 14,
  },
  recordMeta: {
    ...text.caption,
    fontSize: 10.5,
  },
  recordNote: {
    ...text.caption,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
});
