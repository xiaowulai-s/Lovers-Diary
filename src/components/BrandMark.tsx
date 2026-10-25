import { Image, StyleSheet } from 'react-native';

type BrandMarkProps = {
  size?: number;
};

const logo = require('../../assets/logo-badge.png');

export function BrandMark({ size = 72 }: BrandMarkProps) {
  return (
    <Image
      source={logo}
      style={[styles.image, { width: size, height: size, borderRadius: size * 0.22 }]}
      resizeMode="cover"
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
});
