import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { AnniversaryFormSheet } from '../features/anniversaries/AnniversaryFormSheet';
import type { Anniversary, AnniversaryKind } from '../features/anniversaries/types';
import {
  useAnniversaryList,
  useTogetherAnchor,
} from '../features/anniversaries/useAnniversaries';
import {
  ANNIVERSARY_KIND_LABELS,
  countdownLabel,
  daysTogether,
  findNextAnniversary,
  formatDateOnly,
  formatMonthDay,
} from '../features/anniversaries/utils';
import { colors, fonts, radius, shadows, spacing, text } from '../theme';

const KIND_ICONS: Record<AnniversaryKind, ComponentProps<typeof Feather>['name']> = {
  together: 'heart',
  birthday: 'gift',
  anniversary: 'star',
  trip: 'map',
  custom: 'bookmark',
};

type AnniversaryListItemProps = {
  item: Anniversary;
  today: Date;
  onPress: () => void;
};

function AnniversaryListItem({ item, today, onPress }: AnniversaryListItemProps) {
  const date = formatMonthDay(item.happened_on);
  const isTogether = item.kind === 'together';
  const meta = `${ANNIVERSARY_KIND_LABELS[item.kind]} · ${item.recurring ? '每年' : date.year}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`编辑纪念日：${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={[styles.dateBadge, isTogether && styles.dateBadgeTogether]}>
        <Text style={[styles.dateMonth, isTogether && styles.dateTextTogether]}>
          {date.month}
        </Text>
        <Text style={[styles.dateDay, isTogether && styles.dateTextTogether]}>
          {date.day}
        </Text>
      </View>

      <View style={styles.itemCopy}>
        <View style={styles.itemTitleRow}>
          <Feather
            name={KIND_ICONS[item.kind]}
            size={12}
            color={isTogether ? colors.accentDeep : colors.inkMuted}
          />
          <Text numberOfLines={1} style={styles.itemTitle}>
            {item.title}
          </Text>
        </View>
        <Text style={styles.itemMeta}>{meta}</Text>
        {item.note ? (
          <Text numberOfLines={1} style={styles.itemNote}>
            {item.note}
          </Text>
        ) : null}
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.itemStatus, isTogether && styles.itemStatusTogether]}>
          {countdownLabel(item, today)}
        </Text>
        <Feather name="chevron-right" size={15} color={colors.inkMuted} />
      </View>
    </Pressable>
  );
}

export function AnniversariesScreen() {
  const listQuery = useAnniversaryList();
  const anchorQuery = useTogetherAnchor();

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Anniversary | null>(null);
  const [defaultKind, setDefaultKind] = useState<AnniversaryKind>('anniversary');

  const today = new Date();
  const anniversaries = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page) ?? [],
    [listQuery.data],
  );
  const anchor = anchorQuery.data ?? null;
  const days = anchor ? daysTogether(anchor.happened_on, today) : null;
  const next = findNextAnniversary(anniversaries, anchor, today);
  const countNote = listQuery.isLoading
    ? '正在读取'
    : `${anniversaries.length}${listQuery.hasNextPage ? '+' : ''} 个记录`;

  const openCreate = (kind: AnniversaryKind = 'anniversary') => {
    setEditing(null);
    setDefaultKind(kind);
    setFormVisible(true);
  };

  const openEdit = (item: Anniversary) => {
    setEditing(item);
    setDefaultKind(item.kind);
    setFormVisible(true);
  };

  const handleRefresh = () => {
    void listQuery.refetch();
    void anchorQuery.refetch();
  };

  const renderEmpty = () => {
    if (listQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在翻开你们的日子</Text>
        </Card>
      );
    }

    if (listQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="没有加载成功"
            description="检查网络后再试一次，已经写下的日子不会丢失。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void listQuery.refetch();
            }}
          />
        </Card>
      );
    }

    return (
      <Card style={styles.stateCard}>
        <EmptyState
          icon="calendar"
          title="还没有纪念日"
          description="生日、初见、第一次旅行……把那些一想起就会笑的日子放进来。"
        />
        <AppButton label="写下第一个纪念日" onPress={() => openCreate()} />
      </Card>
    );
  };

  const header = (
    <View>
      <PageHeader
        kicker="OUR DATES"
        title="纪念日"
        subtitle="把想一直记得的日子，留在看得见的地方。"
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新增纪念日"
            hitSlop={8}
            onPress={() => openCreate()}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={18} color={colors.surface} />
          </Pressable>
        }
      />

      <LinearGradient
        colors={[colors.accentSoft, '#F7EADF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.ringLarge} />
        <View style={styles.ringSmall} />

        <View style={styles.heroTop}>
          <Text style={styles.heroKicker}>TOGETHER FOR</Text>
          <View style={styles.heartBadge}>
            <Feather name="heart" size={14} color={colors.accentDeep} />
          </View>
        </View>

        <View style={styles.daysRow}>
          <Text style={styles.daysValue}>{days === null ? '—' : String(days)}</Text>
          <Text style={styles.daysUnit}>天</Text>
        </View>

        <Text style={styles.heroNote}>
          {anchorQuery.isLoading
            ? '正在读取在一起的日子…'
            : anchor
              ? `从 ${formatDateOnly(anchor.happened_on)} 开始，替你们数着每一天。`
              : anchorQuery.isError
                ? '读取在一起的日子失败，下拉刷新后再试。'
                : '还没有写下在一起的日子，先从这一天开始吧。'}
        </Text>

        {!anchor && !anchorQuery.isLoading && !anchorQuery.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => openCreate('together')}
            style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}
          >
            <Feather name="plus" size={13} color={colors.accentDeep} />
            <Text style={styles.heroCtaText}>设置在一起的日子</Text>
          </Pressable>
        ) : null}

        <View style={styles.heroDivider} />

        <View style={styles.heroBottom}>
          <View style={styles.nextCopy}>
            <Text style={styles.metaLabel}>下一个纪念日</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {next?.item.title ?? '还没有下一个日子'}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Feather name="sun" size={13} color={colors.accentDeep} />
            <Text style={styles.metaCount}>
              {next ? (next.daysLeft === 0 ? '就是今天' : `还有 ${next.daysLeft} 天`) : '—'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <SectionHeader title="我们的日子" note={countNote} />
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        style={styles.list}
        data={anniversaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnniversaryListItem item={item} today={today} onPress={() => openEdit(item)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          listQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
          ) : !listQuery.hasNextPage && anniversaries.length > 0 ? (
            <Text style={styles.listEnd}>已经翻到最早的日子</Text>
          ) : undefined
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
            void listQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      {formVisible ? (
        <AnniversaryFormSheet
          initial={editing}
          defaultKind={defaultKind}
          hasTogether={Boolean(anchor)}
          onClose={() => setFormVisible(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
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
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  ringLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(176, 94, 85, 0.14)',
    top: -78,
    right: -46,
  },
  ringSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 250, 0.7)',
    top: 18,
    right: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroKicker: {
    ...text.kicker,
    color: colors.accentDeep,
    fontSize: 9,
    letterSpacing: 2.2,
  },
  heartBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 250, 0.55)',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  daysValue: {
    ...text.numeral,
    fontSize: 72,
    lineHeight: 80,
  },
  daysUnit: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.accentDeep,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroNote: {
    ...text.body,
    fontSize: 13,
    lineHeight: 21,
    color: colors.accentDeep,
    opacity: 0.78,
    maxWidth: 270,
    marginTop: spacing.xs,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 253, 250, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(142, 71, 63, 0.18)',
  },
  heroCtaText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.accentDeep,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(142, 71, 63, 0.2)',
    marginVertical: spacing.md,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nextCopy: {
    flex: 1,
  },
  metaLabel: {
    ...text.caption,
    color: colors.accentDeep,
    opacity: 0.65,
    marginBottom: 2,
  },
  metaValue: {
    ...text.label,
    fontSize: 14,
    color: colors.ink,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metaCount: {
    ...text.caption,
    color: colors.accentDeep,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: spacing.xs,
  },
  dateBadge: {
    width: 52,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  dateBadgeTogether: {
    backgroundColor: colors.accentDeep,
  },
  dateMonth: {
    fontFamily: fonts.medium,
    fontSize: 9,
    lineHeight: 13,
    color: colors.inkMuted,
  },
  dateDay: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
  },
  dateTextTogether: {
    color: colors.surface,
    opacity: 0.92,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemTitle: {
    ...text.label,
    flex: 1,
    fontSize: 14,
  },
  itemMeta: {
    ...text.caption,
    fontSize: 10.5,
  },
  itemNote: {
    ...text.caption,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  itemStatus: {
    ...text.caption,
    fontSize: 10,
    color: colors.inkMuted,
  },
  itemStatusTogether: {
    color: colors.accentDeep,
  },
  stateCard: {
    paddingVertical: spacing.md,
  },
  stateText: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footerSpinner: {
    marginVertical: spacing.md,
  },
  listEnd: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
