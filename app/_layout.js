import { useEffect } from "react";
import { Stack } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../src/services/firebase";

export default function AuthLayout() {

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 🔹 User is signed in, store Firebase UID
        try {
          // Try to get user data from Firestore
          let userData = null;
          try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
              userData = snap.data();
            }
          } catch (err) {
            console.log("Could not fetch Firestore data");
          }

          await AsyncStorage.setItem("uid", user.uid);
          if (userData) {
            await AsyncStorage.setItem("role", userData.role || "Client");
            await AsyncStorage.setItem("isApproved", String(userData.isApproved || false));
          }
          console.log("✅ [AuthListener] User data saved");
        } catch (err) {
          console.error("❌ [AuthListener] Error saving user data:", err);
        }
      } else {
        // 🔸 User is signed out
        await AsyncStorage.multiRemove(['uid', 'role', 'isApproved']);
        console.log("🔸 [AuthListener] User data cleared");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: "slide_from_right"
        }}
      />
    </Stack>
  );
}