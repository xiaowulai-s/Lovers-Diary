import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import type { RootTabParamList } from '../../navigation/types';
import {
  isSearchKind,
  SEARCH_KIND_META,
  SEARCH_KIND_ORDER,
  type SearchKind,
  type SearchResult,
} from './types';
import { getSearchErrorMessage, useSearch } from './useSearch';

type SearchSheetProps = {
  onClose: () => void;
};

export function SearchSheet({ onClose }: SearchSheetProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
    }, 320);

    return () => {
      clearTimeout(timer);
    };
  }, [input]);

  const searchQuery = useSearch(query);
  const hasQuery = query.length > 0;
  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const groups = useMemo(
    () =>
      SEARCH_KIND_ORDER.map((kind) => ({
        kind,
        items: results.filter((result) => result.kind === kind),
      })).filter((group) => group.items.length > 0),
    [results],
  );

  const openResult = (result: SearchResult) => {
    if (!isSearchKind(result.kind)) {
      return;
    }

    const meta = SEARCH_KIND_META[result.kind as SearchKind];
    onClose();
    navigation.navigate(meta.tab);
  };

  const renderEmpty = () => {
    if (!hasQuery) {
      return (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="search" size={20} color={colors.accentDeep} />
          </View>
          <Text style={styles.emptyTitle}>找一个词</Text>
          <Text style={styles.emptyText}>
            可以找纸条、照片说明、美食、计划，或纪念日。输入后会在你们的小窝里一起查找。
          </Text>
          <View style={styles.scopeRow}>
            {SEARCH_KIND_ORDER.map((kind) => (
              <View key={kind} style={styles.scopeChip}>
                <Feather name={SEARCH_KIND_META[kind].icon} size={11} color={colors.inkSoft} />
                <Text style={styles.scopeText}>{SEARCH_KIND_META[kind].label}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (searchQuery.isError) {
      return (
        <View style={styles.empty}>
          <Feather name="cloud-off" size={22} color={colors.danger} />
          <Text style={styles.emptyTitle}>没有搜索成功</Text>
          <Text style={styles.emptyText}>{getSearchErrorMessage(searchQuery.error)}</Text>
          <AppButton
            label="重新搜索"
            variant="secondary"
            onPress={() => {
              void searchQuery.refetch();
            }}
          />
        </View>
      );
    }

    if (searchQuery.isFetching) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.emptyText}>正在翻找小窝里的句子和照片</Text>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <Feather name="feather" size={22} color={colors.inkMuted} />
        <Text style={styles.emptyTitle}>没有找到「{query}」</Text>
        <Text style={styles.emptyText}>换一个更短的词，或试试照片说明里的词。</Text>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="关闭搜索"
        />

        <View style={styles.sheetContainer}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <View>
                <Text style={styles.kicker}>FIND A MEMORY</Text>
                <Text style={styles.title}>搜索</Text>
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

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={colors.inkMuted} />
              <TextInput
                accessibilityLabel="搜索内容"
                autoFocus
                maxLength={60}
                onChangeText={setInput}
                placeholder="搜索纸条、照片说明、美食、计划…"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="search"
                style={styles.input}
                value={input}
              />
              {input.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="清空搜索"
                  hitSlop={8}
                  onPress={() => {
                    setInput('');
                    setQuery('');
                  }}
                >
                  <Feather name="x-circle" size={16} color={colors.inkMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.results,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
            >
              {results.length === 0
                ? renderEmpty()
                : groups.map((group) => (
                    <View key={group.kind} style={styles.group}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupTitle}>
                          {SEARCH_KIND_META[group.kind].label}
                        </Text>
                        <Text style={styles.groupCount}>{group.items.length}</Text>
                      </View>

                      {group.items.map((result) => (
                        <Pressable
                          key={`${result.kind}-${result.item_id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`打开${SEARCH_KIND_META[group.kind].label} ${result.title}`}
                          onPress={() => openResult(result)}
                          style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
                        >
                          <View style={styles.resultIcon}>
                            <Feather
                              name={SEARCH_KIND_META[group.kind].icon}
                              size={15}
                              color={colors.accentDeep}
                            />
                          </View>
                          <View style={styles.resultCopy}>
                            <Text numberOfLines={2} style={styles.resultTitle}>
                              {result.title}
                            </Text>
                            {result.subtitle ? (
                              <Text numberOfLines={1} style={styles.resultSubtitle}>
                                {result.subtitle}
                              </Text>
                            ) : null}
                          </View>
                          <Feather name="chevron-right" size={15} color={colors.inkMuted} />
                        </Pressable>
                      ))}
                    </View>
                  ))}
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
    height: '92%',
  },
  sheet: {
    flex: 1,
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
  kicker: {
    ...text.kicker,
    fontSize: 9,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  results: {
    paddingHorizontal: spacing.lg,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  groupTitle: {
    ...text.section,
    fontSize: 15,
  },
  groupCount: {
    ...text.caption,
    fontSize: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  resultSubtitle: {
    ...text.caption,
    fontSize: 10.5,
  },
  pressed: {
    opacity: 0.65,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  emptyText: {
    ...text.body,
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  scopeText: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
});
