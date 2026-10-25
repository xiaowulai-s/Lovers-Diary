import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { AlbumFormSheet } from '../features/photos/AlbumFormSheet';
import { PhotoViewer } from '../features/photos/PhotoViewer';
import type {
  PhotoAlbum,
  PhotoEntry,
  PhotoViewMode,
  UploadProgress,
} from '../features/photos/types';
import {
  getPhotoErrorMessage,
  useDeletePhoto,
  usePhotoAlbums,
  usePhotoFeed,
  useUploadPhotos,
} from '../features/photos/usePhotos';
import { formatPhotoDate, photoFullUrl, photoThumbUrl } from '../features/photos/utils';
import { UploadOverlay } from '../features/photos/UploadOverlay';
import { useAuth } from '../providers/AuthProvider';
import { colors, fonts, radius, shadows, spacing, text } from '../theme';

const GRID_GAP = 6;

const VIEW_MODES: readonly {
  key: PhotoViewMode;
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
}[] = [
  { key: 'grid', label: '网格', icon: 'grid' },
  { key: 'timeline', label: '动态', icon: 'align-left' },
];

type AlbumChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

function AlbumChip({ label, active, onPress, onLongPress }: AlbumChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityHint={onLongPress ? '长按可以编辑相册' : undefined}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[styles.albumChip, active && styles.albumChipActive]}
    >
      <Text style={[styles.albumChipText, active && styles.albumChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

type PhotoTileProps = {
  photo: PhotoEntry;
  uri: string | null;
  size: number;
  onPress: () => void;
};

function PhotoTile({ photo, uri, size, onPress }: PhotoTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看照片 ${formatPhotoDate(photo.created_at)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.tileImage}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
          recyclingKey={photo.id}
        />
      ) : (
        <View style={styles.tilePlaceholder}>
          <Feather name="image" size={18} color={colors.inkMuted} />
        </View>
      )}
      {photo.is_favorite ? (
        <View style={styles.favoriteBadge}>
          <Feather name="heart" size={11} color={colors.accentSoft} />
        </View>
      ) : null}
    </Pressable>
  );
}

type TimelineItemProps = {
  photo: PhotoEntry;
  uri: string | null;
  albumName: string | null;
  width: number;
  onPress: () => void;
};

function PhotoTimelineItem({ photo, uri, albumName, width, onPress }: TimelineItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看照片 ${formatPhotoDate(photo.created_at)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.timelineItem,
        { width },
        pressed && styles.pressed,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.timelineImage, { height: Math.round(width * 0.68) }]}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
          recyclingKey={photo.id}
        />
      ) : (
        <View style={[styles.timelinePlaceholder, { height: Math.round(width * 0.68) }]}>
          <Feather name="image" size={22} color={colors.inkMuted} />
        </View>
      )}

      <View style={styles.timelineFooter}>
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineDate}>{formatPhotoDate(photo.created_at)}</Text>
          <Text style={styles.timelineAlbum}>{albumName ?? '未分类'}</Text>
        </View>
        {photo.is_favorite ? (
          <Feather name="heart" size={14} color={colors.accentDeep} />
        ) : null}
        <Feather name="chevron-right" size={16} color={colors.inkMuted} />
      </View>
    </Pressable>
  );
}

export function PhotosScreen() {
  const { session } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<PhotoEntry>>(null);

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PhotoViewMode>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [albumSheet, setAlbumSheet] = useState<{ album: PhotoAlbum | null } | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<PhotoEntry | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const albumsQuery = usePhotoAlbums();
  const feedQuery = usePhotoFeed(selectedAlbumId, favoritesOnly);
  const deletePhotoMutation = useDeletePhoto();
  const uploadMutation = useUploadPhotos();

  const albums = useMemo<PhotoAlbum[]>(() => albumsQuery.data ?? [], [albumsQuery.data]);
  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;
  const photos = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );
  const urls = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const page of feedQuery.data?.pages ?? []) {
      Object.assign(merged, page.urls);
    }
    return merged;
  }, [feedQuery.data]);
  const albumNames = useMemo(
    () => new Map(albums.map((album) => [album.id, album.name])),
    [albums],
  );

  const contentWidth = Math.max(240, windowWidth - spacing.lg * 2);
  const tileSize = Math.floor((contentWidth - GRID_GAP * 2) / 3);
  const countLabel = `${photos.length}${feedQuery.hasNextPage ? '+' : ''} 张`;
  const viewerUrl = viewerPhoto ? photoFullUrl(viewerPhoto, urls) : null;
  const viewerAlbumName = viewerPhoto?.album_id
    ? (albumNames.get(viewerPhoto.album_id) ?? null)
    : null;

  const openAlbumEditor = (album: PhotoAlbum | null) => {
    setAlbumSheet({ album });
  };

  const handleAlbumSaved = (album: PhotoAlbum) => {
    setSelectedAlbumId(album.id);
    setAlbumSheet(null);
  };

  const handleAlbumDeleted = (id: string) => {
    if (selectedAlbumId === id) {
      setSelectedAlbumId(null);
    }
    setAlbumSheet(null);
  };

  const showPermissionAlert = (target: '相册' | '相机') => {
    Alert.alert(`需要${target}权限`, `请允许访问${target}，照片只会进入你们的私密相册。`, [
      {
        text: '去设置',
        onPress: () => {
          void Linking.openSettings();
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) {
      return;
    }

    const userId = session?.user.id;
    if (!userId) {
      Alert.alert('登录状态已失效', '请重新登录后再添加照片。');
      return;
    }

    setUploadProgress({ total: assets.length, completed: 0, label: '准备压缩照片' });

    try {
      await uploadMutation.mutateAsync({
        assets,
        albumId: selectedAlbumId,
        userId,
        onProgress: setUploadProgress,
      });
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (uploadError) {
      Alert.alert('照片没有全部收好', getPhotoErrorMessage(uploadError, 'upload'));
    } finally {
      setUploadProgress(null);
    }
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
        allowsMultipleSelection: true,
        selectionLimit: 10,
        orderedSelection: true,
        quality: 1,
        exif: false,
      });

      if (!result.canceled) {
        await uploadAssets(result.assets);
      }
    } catch (pickerError) {
      Alert.alert('无法打开相册', getPhotoErrorMessage(pickerError, 'upload'));
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

      if (!result.canceled) {
        await uploadAssets(result.assets);
      }
    } catch (pickerError) {
      Alert.alert('无法打开相机', getPhotoErrorMessage(pickerError, 'upload'));
    }
  };

  const handleAddPress = () => {
    if (uploadProgress) {
      return;
    }

    Alert.alert(
      '添加照片',
      selectedAlbumId
        ? `新照片会存进「${selectedAlbum?.name ?? '当前相册'}」`
        : '新照片会存进全部照片',
      [
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
      ],
    );
  };

  const handleRefresh = () => {
    void feedQuery.refetch();
    void albumsQuery.refetch();
  };

  const removePhoto = async (photo: PhotoEntry) => {
    try {
      await deletePhotoMutation.mutateAsync(photo);
      setViewerPhoto(null);
    } catch (deleteError) {
      Alert.alert('删除失败', getPhotoErrorMessage(deleteError, 'delete'));
    }
  };

  const handleDeletePress = () => {
    if (!viewerPhoto) {
      return;
    }

    const photo = viewerPhoto;
    Alert.alert('删除照片', '这张照片会从两个人的相册里一起消失。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除照片',
        style: 'destructive',
        onPress: () => {
          void removePhoto(photo);
        },
      },
    ]);
  };

  const renderEmpty = () => {
    if (feedQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在翻开相册</Text>
        </Card>
      );
    }

    if (feedQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="照片没有加载成功"
            description="检查网络后再试一次。图片链接会重新生成，不会丢失照片。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void feedQuery.refetch();
            }}
          />
        </Card>
      );
    }

    return (
      <Card style={styles.stateCard}>
        <EmptyState
          icon={favoritesOnly ? 'heart' : 'image'}
          title={
            favoritesOnly
              ? '还没有收藏的照片'
              : selectedAlbum
                ? '这个相册还是空的'
                : '相册还没有照片'
          }
          description={
            favoritesOnly
              ? '打开任意一张照片，点亮右上角的爱心，它就会出现在这里。'
              : selectedAlbum
                ? `把照片放进「${selectedAlbum.name}」，让这一页慢慢长起来。`
                : '拍一张，或从手机里选几张。它们会被温柔地压缩，再私密地收好。'
          }
          tone="sage"
        />
        {favoritesOnly ? null : <AppButton label="添加第一张照片" onPress={handleAddPress} />}
      </Card>
    );
  };

  const header = (
    <View>
      <PageHeader
        kicker="OUR MEMORIES"
        title="相册"
        subtitle="照片替我们记住，那些说不清的瞬间。"
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加照片"
            disabled={uploadProgress !== null}
            hitSlop={8}
            onPress={handleAddPress}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
              uploadProgress !== null && styles.disabled,
            ]}
          >
            <Feather name="plus" size={18} color={colors.surface} />
          </Pressable>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.albumRow}
      >
        <AlbumChip
          label="全部"
          active={selectedAlbumId === null}
          onPress={() => setSelectedAlbumId(null)}
        />
        {albums.map((album) => (
          <AlbumChip
            key={album.id}
            label={album.name}
            active={selectedAlbumId === album.id}
            onPress={() => setSelectedAlbumId(album.id)}
            onLongPress={() => openAlbumEditor(album)}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="新建相册"
          onPress={() => openAlbumEditor(null)}
          style={({ pressed }) => [styles.newAlbumChip, pressed && styles.pressed]}
        >
          <Feather name="plus" size={13} color={colors.accentDeep} />
          <Text style={styles.newAlbumText}>新建相册</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.galleryHeader}>
        <View style={styles.galleryTitleWrap}>
          <View style={styles.galleryTitleRow}>
            <Text style={styles.galleryTitle}>
              {favoritesOnly ? '收藏照片' : (selectedAlbum?.name ?? '全部照片')}
            </Text>
            {selectedAlbum && !favoritesOnly ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="编辑当前相册"
                hitSlop={8}
                onPress={() => openAlbumEditor(selectedAlbum)}
                style={({ pressed }) => [styles.editAlbumButton, pressed && styles.pressed]}
              >
                <Feather name="edit-2" size={12} color={colors.inkMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.galleryCount}>{countLabel}</Text>
        </View>

        <View style={styles.modeSwitch}>
          {VIEW_MODES.map((mode) => {
            const active = viewMode === mode.key;

            return (
              <Pressable
                key={mode.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setViewMode(mode.key)}
                style={[styles.modeButton, active && styles.modeButtonActive]}
              >
                <Feather
                  name={mode.icon}
                  size={12}
                  color={active ? colors.accentDeep : colors.inkMuted}
                />
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.favoriteFilterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: favoritesOnly }}
          accessibilityLabel="只看收藏的照片"
          onPress={() => setFavoritesOnly((current) => !current)}
          style={[styles.favoriteFilter, favoritesOnly && styles.favoriteFilterActive]}
        >
          <Feather
            name="heart"
            size={12}
            color={favoritesOnly ? colors.accentDeep : colors.inkMuted}
          />
          <Text style={[styles.favoriteFilterText, favoritesOnly && styles.favoriteFilterTextActive]}>
            只看收藏
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        key={`${selectedAlbumId ?? 'all'}-${viewMode}-${favoritesOnly ? 'favorites' : 'all'}`}
        ref={listRef}
        style={styles.list}
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <PhotoTile
              photo={item}
              uri={photoThumbUrl(item, urls)}
              size={tileSize}
              onPress={() => setViewerPhoto(item)}
            />
          ) : (
            <PhotoTimelineItem
              photo={item}
              uri={photoFullUrl(item, urls)}
              albumName={item.album_id ? (albumNames.get(item.album_id) ?? null) : null}
              width={contentWidth}
              onPress={() => setViewerPhoto(item)}
            />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
          ) : !feedQuery.hasNextPage && photos.length > 0 ? (
            <Text style={styles.listEnd}>已经翻到最早的照片</Text>
          ) : undefined
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={7}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      {albumSheet ? (
        <AlbumFormSheet
          initial={albumSheet.album}
          onClose={() => setAlbumSheet(null)}
          onSaved={handleAlbumSaved}
          onDeleted={handleAlbumDeleted}
        />
      ) : null}

      {viewerPhoto ? (
        <PhotoViewer
          photo={viewerPhoto}
          imageUrl={viewerUrl}
          albumName={viewerAlbumName}
          deleting={deletePhotoMutation.isPending}
          onClose={() => setViewerPhoto(null)}
          onDelete={handleDeletePress}
        />
      ) : null}

      {uploadProgress ? <UploadOverlay progress={uploadProgress} /> : null}
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
  disabled: {
    opacity: 0.5,
  },
  albumRow: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
    paddingBottom: spacing.md,
  },
  albumChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  albumChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  albumChipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  albumChipTextActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
  newAlbumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  newAlbumText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.accentDeep,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  galleryTitleWrap: {
    flex: 1,
  },
  galleryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  galleryTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  editAlbumButton: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvasDeep,
  },
  galleryCount: {
    ...text.caption,
    marginTop: 1,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.canvasDeep,
    borderRadius: radius.pill,
    padding: 3,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  modeLabel: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.inkMuted,
  },
  modeLabelActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
  favoriteFilterRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  favoriteFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  favoriteFilterActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  favoriteFilterText: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.inkMuted,
  },
  favoriteFilterTextActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  tile: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    marginBottom: GRID_GAP,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 39, 35, 0.45)',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  timelineImage: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  timelinePlaceholder: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxs,
    paddingTop: spacing.sm,
  },
  timelineCopy: {
    flex: 1,
    gap: 1,
  },
  timelineDate: {
    ...text.label,
    fontSize: 13.5,
  },
  timelineAlbum: {
    ...text.caption,
    fontSize: 10.5,
  },
  stateCard: {
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
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
