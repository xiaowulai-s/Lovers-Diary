import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '../../theme';

type ProfileAvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAvatar({ uri, name, size = 36, style }: ProfileAvatarProps) {
  const initial = name?.trim().charAt(0) ?? '';

  return (
    <View
      style={[
        styles.root,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : initial ? (
        <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
      ) : (
        <Feather name="user" size={size * 0.4} color={colors.accentDeep} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontFamily: fonts.display,
    color: colors.accentDeep,
  },
});
