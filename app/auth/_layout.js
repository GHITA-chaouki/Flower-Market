import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        animationDuration: 350,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        options={{
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="register-prestataire"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
