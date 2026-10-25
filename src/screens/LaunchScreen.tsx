import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { colors, fonts, spacing, text } from '../theme';

export function LaunchScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <BrandMark size={88} />
      <Text style={styles.wordmark}>爱苏日记</Text>
      <Text style={styles.tagline}>只写给两个人的日记</Text>
      <ActivityIndicator color={colors.accent} style={styles.spinner} />
      <Text style={styles.hint}>正在确认你们的身份</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
  tagline: {
    ...text.caption,
    color: colors.accentDeep,
    marginTop: 3,
    letterSpacing: 0.6,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
  hint: {
    ...text.caption,
    marginTop: spacing.sm,
    fontSize: 10.5,
  },
});
