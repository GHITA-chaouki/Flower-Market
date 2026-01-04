import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../src/theme";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../src/services/firebase";
import { API_BASE_URL } from "../../src/api/axios";

export default function Register() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState("");


  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!fullName || !email || !password) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        fullName,
        email,
        role: "Client",
        isApproved: true,
        createdAt: new Date(),
      });

      // 🔹 Exchange Firebase login for backend JWT to prevent 401 on polling
      try {
        const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/firebase-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: uid,
            email: email,
            fullName: fullName,
            role: "Client",
            isApproved: true
          })
        });
        if (exchangeResponse.ok) {
          const data = await exchangeResponse.json();
          if (data.token) {
            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("uid", uid);
            await AsyncStorage.setItem("role", "Client");
            await AsyncStorage.setItem("isApproved", "true");
          }
        }
      } catch (exchErr) {
        console.error("Firebase exchange failed:", exchErr);
      }

      setSuccess("Inscription réussie. Vous pouvez vous connecter.");

      setTimeout(() => {
        router.replace("/auth/Login");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };


  return (
    <LinearGradient
      colors={["#052e1a", theme.colors.primaryDark, theme.colors.primary, "#F8FFFB"]}
      locations={[0, 0.28, 0.46, 0.46]}
      start={{ x: 0.15, y: 0.05 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.container}>
        <View pointerEvents="none" style={styles.decorWrap}>
          <View style={styles.decorA} />
          <View style={styles.decorB} />
        </View>
        <KeyboardAvoidingView
          enabled={Platform.OS === "ios"}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          >
            <View style={styles.hero}>
              <View style={styles.heroRow}>
              </View>
              <Text style={styles.brandLine}>Flower Market</Text>
              <Text style={styles.subtitle}>Créez votre compte</Text>
            </View>

            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Créer un compte</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={(text) => setFullName(text)}
                    placeholder="Nom complet"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => setEmail(text)}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                    placeholder="Mot de passe"
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.trailingBtn}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Créer mon compte</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Déjà un compte ? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/Login")}>
                  <Text style={styles.loginLink}>Se connecter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  decorWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorA: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -60,
    left: -60,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  decorB: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -90,
    right: -90,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  pillText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "700",
  },
  brandLine: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: Platform.select({ ios: "700", android: "700" }),
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    color: "#fff",
    letterSpacing: 1.2,
  },
  subtitle: {
    ...theme.typography.body1,
    color: "rgba(255,255,255,0.92)",
    textAlign: "left",
    marginTop: 6,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    ...theme.shadows.lg,
  },
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 10,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: theme.colors.text,
    fontSize: 16,
  },
  trailingBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  loginLink: {
    ...theme.typography.button,
    color: theme.colors.primaryDark,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error + "10",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 20,
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.success + "10",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 20,
  },
  successText: {
    ...theme.typography.body2,
    color: theme.colors.success,
    marginLeft: 8,
    flex: 1,
  },
});
