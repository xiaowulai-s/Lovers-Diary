import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '../theme';

type EmptyStateProps = {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  tone?: 'rose' | 'sage';
};

export function EmptyState({ icon, title, description, tone = 'rose' }: EmptyStateProps) {
  const isSage = tone === 'sage';

  return (
    <View style={styles.root}>
      <View style={[styles.art, isSage ? styles.artSage : styles.artRose]}>
        <View style={[styles.orbit, styles.orbitOne]} />
        <View style={[styles.orbit, styles.orbitTwo]} />
        <Feather name={icon} size={22} color={isSage ? colors.sage : colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  art: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  artRose: {
    backgroundColor: colors.accentSoft,
  },
  artSage: {
    backgroundColor: colors.sageSoft,
  },
  orbit: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  orbitOne: {
    width: 54,
    height: 54,
    borderColor: 'rgba(255, 253, 250, 0.8)',
    top: -7,
    right: -6,
  },
  orbitTwo: {
    width: 34,
    height: 34,
    borderColor: 'rgba(255, 253, 250, 0.65)',
    bottom: -2,
    left: -8,
  },
  title: {
    ...text.label,
    fontSize: 15,
    marginBottom: spacing.xxs,
  },
  description: {
    ...text.body,
    maxWidth: 276,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 21,
  },
});
