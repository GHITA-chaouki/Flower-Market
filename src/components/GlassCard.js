import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SHADOWS, SIZES } from '../theme';

const GlassCard = ({ children, style, intensity = 20 }) => {
  if (Platform.OS === 'android') {
    // Android doesn't handle BlurView inside Lists well sometimes, 
    // using semi-transparent background as fallback for stability
    return (
      <View style={[styles.androidGlass, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint="light" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.small,
  },
  androidGlass: {
    borderRadius: SIZES.radius,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...SHADOWS.small,
  },
});

export default GlassCard;
