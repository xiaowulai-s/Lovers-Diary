import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, text } from '../theme';

type PageHeaderProps = {
  kicker: string;
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
};

export function PageHeader({ kicker, title, subtitle, accessory }: PageHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Text style={text.kicker}>{kicker}</Text>
        {accessory}
      </View>
      <Text style={[text.display, styles.title]}>{title}</Text>
      {subtitle ? <Text style={[text.body, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  title: {
    marginTop: spacing.xxs,
  },
  subtitle: {
    marginTop: spacing.xs,
    maxWidth: 320,
  },
});
