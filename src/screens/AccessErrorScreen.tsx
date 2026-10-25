import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing, text } from '../theme';

export function AccessErrorScreen() {
  const { authorizationError, debugDetail, retry, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSignOutError(null);
    const message = await signOut();

    if (message) {
      setSignOutError(message);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandMark size={76} />
        <Text style={styles.title}>暂时没能确认身份</Text>
        <Text style={styles.description}>
          {authorizationError ?? '请检查网络后再试一次。'}
        </Text>

        <View style={styles.securityNote}>
          <Feather name="lock" size={12} color={colors.inkMuted} />
          <Text style={styles.securityText}>在验证完成前，不会加载任何私密内容。</Text>
        </View>

        {debugDetail ? (
          <View style={styles.debugBox}>
            <Text style={styles.debugLabel}>技术信息</Text>
            <Text selectable style={styles.debugText}>
              {debugDetail}
            </Text>
          </View>
        ) : null}

        {signOutError ? <Text style={styles.errorText}>{signOutError}</Text> : null}

        <View style={styles.actions}>
          <AppButton label="再试一次" onPress={() => void retry()} />
          <AppButton
            label="退出账号"
            variant="secondary"
            onPress={() => {
              void handleSignOut();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  title: {
    ...text.section,
    fontSize: 24,
    lineHeight: 34,
    marginTop: spacing.lg,
  },
  description: {
    ...text.body,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: spacing.xs,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  securityText: {
    ...text.caption,
    fontSize: 10.5,
  },
  debugBox: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  debugLabel: {
    ...text.caption,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  debugText: {
    ...text.caption,
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.inkSoft,
  },
  errorText: {
    ...text.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
});
