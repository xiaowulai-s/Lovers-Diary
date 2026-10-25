import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { daysTogether, formatDateOnly } from '../features/anniversaries/utils';
import { useTogetherAnchor } from '../features/anniversaries/useAnniversaries';
import { LoveNoteFormSheet } from '../features/loveNotes/LoveNoteFormSheet';
import type { LoveNote } from '../features/loveNotes/useLoveNotes';
import { useLoveNotes } from '../features/loveNotes/useLoveNotes';
import { usePhotoAlbums, usePhotoFeed } from '../features/photos/usePhotos';
import { photoThumbUrl } from '../features/photos/utils';
import { ProfileAvatar } from '../features/profiles/ProfileAvatar';
import { ProfileSheet } from '../features/profiles/ProfileSheet';
import { profileDisplayName } from '../features/profiles/types';
import { useProfiles } from '../features/profiles/useProfiles';
import { YearReviewSheet } from '../features/review/YearReviewSheet';
import { SearchSheet } from '../features/search/SearchSheet';
import { useAuth } from '../providers/AuthProvider';
import { colors, fonts, radius, spacing, text } from '../theme';
import type { RootTabParamList } from '../navigation/types';

function formatNoteDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) {
    return '夜深了';
  }
  if (hour < 12) {
    return '早上好';
  }
  if (hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

export function HomeScreen() {
  const { session, signOut } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const photosQuery = usePhotoFeed(null);
  const albumsQuery = usePhotoAlbums();
  const notesQuery = useLoveNotes();
  const anchorQuery = useTogetherAnchor();
  const profilesQuery = useProfiles();

  const [noteSheet, setNoteSheet] = useState<{ note: LoveNote | null } | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const latestPage = photosQuery.data?.pages[0];
  const latestPhotos = latestPage?.items.slice(0, 3) ?? [];
  const latestUrls = latestPage?.urls ?? {};
  const albums = albumsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const profiles = profilesQuery.data?.profiles ?? [];
  const avatarUrls = profilesQuery.data?.avatarUrls ?? {};
  const myProfile = profiles.find((profile) => profile.user_id === session?.user.id) ?? null;
  const myName = profileDisplayName(myProfile, '我');
  const myAvatarUrl = myProfile?.avatar_path
    ? (avatarUrls[myProfile.avatar_path] ?? null)
    : null;
  const today = new Date();
  const days = anchorQuery.data ? daysTogether(anchorQuery.data.happened_on, today) : null;
  const subtitle = myProfile?.display_name.trim()
    ? `${greetingFor(today)}，${myName}。两个人的日常，慢慢长成家的样子。`
    : '两个人的日常，慢慢长成家的样子。';

  const goPhotos = () => {
    navigation.navigate('Photos');
  };

  const handleSignOut = () => {
    Alert.alert('退出小窝', '下次需要使用受邀邮箱重新登录。', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          void signOut().then((message) => {
            if (message) {
              Alert.alert('退出失败', message);
            }
          });
        },
      },
    ]);
  };

  const renderPhotoSection = () => {
    if (photosQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在收拢最近的瞬间</Text>
        </Card>
      );
    }

    if (photosQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="动态没有加载出来"
            description="检查网络后再试一次，照片仍然安全地留在私有相册里。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void photosQuery.refetch();
            }}
          />
        </Card>
      );
    }

    if (latestPhotos.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="camera"
            title="小窝还很安静"
            description="去相册放进第一张照片，这里就会开始长出你们的日常。"
            tone="sage"
          />
          <AppButton label="去相册添加照片" onPress={goPhotos} />
        </Card>
      );
    }

    return (
      <View style={styles.photoStrip}>
        {latestPhotos.map((photo) => {
          const uri = photoThumbUrl(photo, latestUrls);

          return (
            <Pressable
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel="打开相册"
              onPress={goPhotos}
              style={({ pressed }) => [styles.photoTile, pressed && styles.pressed]}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.photoImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  recyclingKey={photo.id}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={17} color={colors.inkMuted} />
                </View>
              )}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="查看全部照片"
          onPress={goPhotos}
          style={({ pressed }) => [styles.moreTile, pressed && styles.pressed]}
        >
          <Feather name="arrow-up-right" size={17} color={colors.accentDeep} />
          <Text style={styles.moreTileText}>全部</Text>
        </Pressable>
      </View>
    );
  };

  const renderNoteSection = () => {
    if (notesQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在打开小纸条</Text>
        </Card>
      );
    }

    if (notesQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="纸条没有加载出来"
            description="检查网络后重试一次，写过的句子都还在。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void notesQuery.refetch();
            }}
          />
        </Card>
      );
    }

    if (notes.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="feather"
            title="还没有小纸条"
            description="写一句今天没来得及说的话，让它在小窝里等 TA 发现。"
            tone="sage"
          />
          <AppButton label="写第一张纸条" onPress={() => setNoteSheet({ note: null })} />
        </Card>
      );
    }

    return (
      <View style={styles.noteList}>
        {notes.map((note) => {
          const isMine = session?.user.id === note.created_by;
          const authorProfile = profiles.find((profile) => profile.user_id === note.created_by);
          const authorName = profileDisplayName(authorProfile, isMine ? '我' : 'TA');
          const authorAvatarUrl = authorProfile?.avatar_path
            ? (avatarUrls[authorProfile.avatar_path] ?? null)
            : null;

          return (
            <Pressable
              key={note.id}
              accessibilityRole="button"
              accessibilityLabel="编辑小纸条"
              onPress={() => setNoteSheet({ note })}
              style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}
            >
              <View style={styles.noteTop}>
                {authorProfile ? (
                  <ProfileAvatar uri={authorAvatarUrl} name={authorName} size={24} />
                ) : (
                  <View style={styles.notePin}>
                    <Feather name="feather" size={12} color={colors.sage} />
                  </View>
                )}
                <Text style={styles.noteMeta}>
                  {authorName} · {formatNoteDate(note.created_at)}
                </Text>
                <Feather name="edit-2" size={12} color={colors.inkMuted} />
              </View>
              <Text numberOfLines={5} style={styles.noteBody}>
                {note.body}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <PageHeader
        kicker="OUR LITTLE HOME"
        title="小窝"
        subtitle={subtitle}
        accessory={
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="搜索小窝"
              hitSlop={8}
              onPress={() => setSearchSheetOpen(true)}
              style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
            >
              <Feather name="search" size={15} color={colors.inkSoft} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="编辑我的资料"
              hitSlop={8}
              onPress={() => setProfileSheetOpen(true)}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
            >
              <ProfileAvatar uri={myAvatarUrl} name={myName} size={34} />
              <View style={styles.avatarEditBadge}>
                <Feather name="edit-2" size={8} color={colors.surface} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="退出登录"
              hitSlop={8}
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
            >
              <Feather name="log-out" size={15} color={colors.inkSoft} />
            </Pressable>
          </View>
        }
      />

      <Card tone="soft" style={styles.quoteCard}>
        <Text style={styles.quoteMark}>“</Text>
        <Text style={styles.quoteText}>日子很小，但我们把它过得很满。</Text>
        <View style={styles.quoteFooter}>
          <View style={styles.quoteRule} />
          <Text style={styles.quoteCaption}>
            {days !== null ? `在一起第 ${days} 天` : '小窝的今天'}
          </Text>
          {anchorQuery.data ? (
            <Text style={styles.anchorDate}>{formatDateOnly(anchorQuery.data.happened_on)}</Text>
          ) : null}
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="打开年度回顾"
        onPress={() => setReviewOpen(true)}
        style={({ pressed }) => [styles.reviewEntry, pressed && styles.pressed]}
      >
        <View style={styles.reviewIcon}>
          <Feather name="book-open" size={16} color={colors.accentDeep} />
        </View>
        <View style={styles.reviewCopy}>
          <Text style={styles.reviewTitle}>年度回顾</Text>
          <Text style={styles.reviewText}>把这一年的照片和记录收成一页</Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.inkMuted} />
      </Pressable>

      <SectionHeader
        title="最新动态"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="去相册"
            onPress={goPhotos}
            style={({ pressed }) => [styles.linkAction, pressed && styles.pressed]}
          >
            <Text style={styles.linkActionText}>去相册</Text>
            <Feather name="arrow-up-right" size={12} color={colors.accentDeep} />
          </Pressable>
        }
      />
      {renderPhotoSection()}

      <SectionHeader title="共同相册" note={`${albums.length} 个`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.albumRow}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="查看全部照片"
          onPress={goPhotos}
          style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
        >
          <View style={styles.albumIcon}>
            <Feather name="image" size={15} color={colors.accentDeep} />
          </View>
          <Text numberOfLines={1} style={styles.albumName}>
            全部照片
          </Text>
          <Text style={styles.albumMeta}>私密相册</Text>
        </Pressable>

        {albums.map((album) => (
          <Pressable
            key={album.id}
            accessibilityRole="button"
            accessibilityLabel={`查看相册 ${album.name}`}
            onPress={goPhotos}
            style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
          >
            <View style={[styles.albumIcon, styles.albumIconSage]}>
              <Feather name="folder" size={15} color={colors.sage} />
            </View>
            <Text numberOfLines={1} style={styles.albumName}>
              {album.name}
            </Text>
            <Text style={styles.albumMeta}>自定义相册</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="管理相册"
          onPress={goPhotos}
          style={({ pressed }) => [styles.albumCard, styles.albumCardNew, pressed && styles.pressed]}
        >
          <View style={[styles.albumIcon, styles.albumIconNew]}>
            <Feather name="plus" size={15} color={colors.accentDeep} />
          </View>
          <Text style={styles.albumName}>管理相册</Text>
          <Text style={styles.albumMeta}>新建或整理</Text>
        </Pressable>
      </ScrollView>

      <SectionHeader
        title="小纸条"
        note={`${notes.length} 张`}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="写一张小纸条"
            hitSlop={8}
            onPress={() => setNoteSheet({ note: null })}
            style={({ pressed }) => [styles.addNoteButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={14} color={colors.accentDeep} />
          </Pressable>
        }
      />
      {renderNoteSection()}

      {noteSheet ? (
        <LoveNoteFormSheet
          initial={noteSheet.note}
          onClose={() => setNoteSheet(null)}
        />
      ) : null}

      {profileSheetOpen ? (
        <ProfileSheet
          initial={myProfile}
          avatarUrl={myAvatarUrl}
          onClose={() => setProfileSheetOpen(false)}
        />
      ) : null}

      {searchSheetOpen ? <SearchSheet onClose={() => setSearchSheetOpen(false)} /> : null}

      {reviewOpen ? <YearReviewSheet onClose={() => setReviewOpen(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reviewIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  reviewCopy: {
    flex: 1,
    gap: 2,
  },
  reviewTitle: {
    ...text.label,
    fontSize: 13,
  },
  reviewText: {
    ...text.caption,
    fontSize: 10.5,
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
    borderWidth: 1.5,
    borderColor: colors.canvas,
  },
  signOutButton: {
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
  quoteCard: {
    paddingTop: spacing.lg,
    overflow: 'hidden',
  },
  quoteMark: {
    position: 'absolute',
    top: -14,
    right: 16,
    fontFamily: fonts.display,
    fontSize: 108,
    lineHeight: 130,
    color: colors.accent,
    opacity: 0.1,
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: 0.4,
    maxWidth: 270,
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  quoteRule: {
    width: 22,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent,
  },
  quoteCaption: {
    ...text.caption,
    color: colors.accentDeep,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  anchorDate: {
    ...text.caption,
    fontSize: 10,
  },
  linkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  linkActionText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.accentDeep,
  },
  addNoteButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  photoTile: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTile: {
    width: 58,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
  },
  moreTileText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.accentDeep,
  },
  albumRow: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  albumCard: {
    width: 132,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  albumCardNew: {
    backgroundColor: colors.surfaceAlt,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  albumIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  albumIconSage: {
    backgroundColor: colors.sageSoft,
  },
  albumIconNew: {
    backgroundColor: colors.goldSoft,
  },
  albumName: {
    ...text.label,
    fontSize: 13,
    marginBottom: 2,
  },
  albumMeta: {
    ...text.caption,
    fontSize: 10,
  },
  noteList: {
    gap: spacing.sm,
  },
  noteCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notePin: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageSoft,
  },
  noteMeta: {
    ...text.caption,
    flex: 1,
    fontSize: 10,
  },
  noteBody: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    lineHeight: 27,
    color: colors.ink,
  },
  stateCard: {
    paddingVertical: spacing.sm,
  },
  stateText: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
