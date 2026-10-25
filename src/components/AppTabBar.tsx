import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '../theme';
import type { RootTabParamList } from '../navigation/types';

type TabName = keyof RootTabParamList;

const TAB_META: Record<TabName, { label: string; icon: ComponentProps<typeof Feather>['name'] }> = {
  Anniversaries: { label: '纪念日', icon: 'heart' },
  Photos: { label: '相册', icon: 'image' },
  Nest: { label: '小窝', icon: 'home' },
  Food: { label: '美食', icon: 'coffee' },
  Plans: { label: '计划', icon: 'check-square' },
};

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const meta = TAB_META[route.name as TabName];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: isFocused }}
            onPress={onPress}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Feather
                name={meta.icon}
                size={18}
                color={isFocused ? colors.accentDeep : colors.inkMuted}
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 44,
    height: 29,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.inkMuted,
    marginTop: 2,
  },
  labelActive: {
    fontFamily: fonts.medium,
    color: colors.accentDeep,
  },
});
