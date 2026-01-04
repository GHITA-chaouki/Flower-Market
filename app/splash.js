import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, StatusBar, ImageBackground, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../src/theme";

export default function Splash() {
  const router = useRouter();

  const brand = "Flower Market";
  const letters = useMemo(() => brand.split(""), [brand]);
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  const { width } = Dimensions.get("window");
  const fontSize = useMemo(() => {
    const available = Math.max(260, width - 48);
    const estimated = Math.floor(available / (letters.length * 0.72));
    return Math.max(26, Math.min(44, estimated));
  }, [letters.length, width]);
  const lineHeight = Math.round(fontSize * 1.15);
  const letterSpacing = Math.max(0.2, Math.min(1.0, fontSize * 0.02));

  const subOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = letterAnims.map((v) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      Animated.stagger(160, animations),
      Animated.timing(subOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        router.replace("/auth/Login");
      }, 650);
    });
  }, [letterAnims, router, subOpacity]);

  return (
    <ImageBackground source={require("../assets/splash.jpeg")} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.overlay} />

      <View style={styles.centerWrap}>
        <View style={styles.brandRow}>
          {letters.map((ch, idx) => {
            const opacity = letterAnims[idx];
            const translateY = letterAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            });

            return (
              <Animated.Text
                key={`brand-${ch}-${idx}`}
                style={[
                  styles.brandLetter,
                  {
                    opacity,
                    transform: [{ translateY }],
                    fontSize,
                    lineHeight,
                    letterSpacing,
                  },
                ]}
              >
                {ch === " " ? "\u00A0" : ch}
              </Animated.Text>
            );
          })}
        </View>

        <Animated.Text style={[styles.tagline, { opacity: subOpacity }]}>Marché floral</Animated.Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    fontSize: 70,
    lineHeight: 60,
    fontWeight: Platform.select({ ios: "900", android: "900" }),
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    color: theme.colors.primaryDark,
    letterSpacing: 1.2,
    textShadowColor: "rgba(0,0,0,0.08)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tagline: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
});
