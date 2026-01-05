import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Pure Floral Studio Palette
  primary: "#4A785D", // Sage Green
  secondary: "#8AA682", // Soft Moss
  accent: "#D4AF37", // Botanical Gold
  background: "#FDFCFB", // Off-white
  surface: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.8)",

  text: "#1A202C", // Dark Slate
  textLight: "#718096c8", // Grey
  textDim: "#A0AEC0",

  success: "#48BB78",
  warning: "#F6AD55",
  error: "#F56565",

  // Gradients
  gradientStart: "#4A785D",
  gradientEnd: "#3D634D",

  // Backward Compatibility
  primaryDark: "#3D634D",
  primaryLight: "#F0F7F3",
  textSecondary: "#A0AEC0",
  border: "#EDF2F7",
};

export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  medium: {
    shadowColor: "#4A785D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  }
};

export const SIZES = {
  width,
  height,
  padding: 24,
  radius: 20,
};

export const theme = {
  colors: COLORS,
  shadows: {
    ...SHADOWS,
    md: SHADOWS.medium,
    sm: SHADOWS.small,
    lg: SHADOWS.large,
  },
  sizes: SIZES,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    full: 99,
  },
  typography: {
    body2: { fontSize: 14, color: COLORS.textLight },
    h1: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
    h3: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  }
};
