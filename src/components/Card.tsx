import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, text } from '../theme';

type CardProps = PropsWithChildren<{
  tone?: 'plain' | 'soft';
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, tone = 'plain', style }: CardProps) {
  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

type SectionHeaderProps = {
  title: string;
  note?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, note, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionRow}>
      <Text style={text.section}>{title}</Text>
      <View style={styles.sectionRight}>
        {note ? <Text style={text.caption}>{note}</Text> : null}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  plain: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  soft: {
    backgroundColor: colors.surfaceAlt,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
