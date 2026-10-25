import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, shadows, spacing, text } from '../../theme';
import type { UploadProgress } from './types';

type UploadOverlayProps = {
  progress: UploadProgress;
};

export function UploadOverlay({ progress }: UploadOverlayProps) {
  const percent = progress.total > 0 ? progress.completed / progress.total : 0;
  const fillWidth = `${Math.min(100, Math.round(percent * 100))}%` as `${number}%`;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="upload-cloud" size={22} color={colors.accentDeep} />
          </View>

          <Text style={styles.title}>正在收好照片</Text>
          <Text style={styles.label}>{progress.label}</Text>

          <View style={styles.track}>
            <View style={[styles.fill, { width: fillWidth }]} />
          </View>

          <View style={styles.footerRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.count}>
              {progress.completed} / {progress.total}
            </Text>
          </View>

          <Text style={styles.hint}>压缩与上传期间请保持 App 在前台，不要锁屏。</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 39, 35, 0.4)',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.lifted,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 29,
    color: colors.ink,
  },
  label: {
    ...text.caption,
    marginTop: 4,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.canvasDeep,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  count: {
    ...text.caption,
    color: colors.accentDeep,
  },
  hint: {
    ...text.caption,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
