import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../src/theme";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../src/services/firebase";
import { API_BASE_URL } from "../../src/api/axios";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState("");

  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetAnim] = useState(() => new Animated.Value(0));

  // =========================
  // HANDLE LOGIN (ICI)
  // =========================


  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Email et mot de passe requis");
      return;
    }

    setLoading(true);

    try {
      // Check if this is an admin account - use backend login instead of Firebase
      // Check if this is an admin account - use backend login instead of Firebase
      if (email === "admin@flowermarket.com") {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Erreur de connexion");
          return;
        }

        const data = await response.json();

        // Store backend JWT and user data
        await AsyncStorage.multiRemove(['uid', 'role', 'isApproved', 'token', 'cart']);
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("role", data.role);
        await AsyncStorage.setItem("isApproved", String(data.isApproved));

        console.log("✅ Admin logged in via backend");

        // Redirect to admin dashboard
        router.replace("/admin/AdminDashboard");
        return;
      }

      // Regular Firebase login for other users
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // 🔥 get user data from Firestore
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) {
        setError("Profil utilisateur introuvable");
        return;
      }

      const userData = snap.data();
      let role = userData?.role;
      const isApproved = userData?.isApproved;

      // Trim whitespace if role exists
      if (role && typeof role === 'string') {
        role = role.trim();
      }

      // Debug: Log the role to verify it's correct
      console.log("=== DEBUG LOGIN ===");
      console.log("Full user data:", userData);
      console.log("Role value:", role);
      console.log("Role type:", typeof role);
      console.log("Role length:", role?.length);
      console.log("Role === 'Admin':", role === "Admin");
      console.log("isApproved:", isApproved);
      console.log("==================");

      // 🔐 Store minimal data locally
      // Clear only specific keys instead of entire storage to avoid iOS errors
      await AsyncStorage.multiRemove(['uid', 'role', 'isApproved', 'token', 'cart']);

      // 🔹 Exchange Firebase login for backend JWT
      try {
        const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/firebase-exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firebaseUid: uid,
            email: email,
            fullName: userData?.fullName || email,
            role: role || "Client",
            isApproved: isApproved
          })
        });

        if (exchangeResponse.ok) {
          const exchangeData = await exchangeResponse.json();
          // Use data from backend if available
          if (exchangeData.token) {
            await AsyncStorage.setItem("token", exchangeData.token);
            console.log("✅ Backend JWT obtained via exchange");
          }
          if (exchangeData.role) role = exchangeData.role;
        } else {
          const errorText = await exchangeResponse.text();
          console.warn(`⚠️ Firebase exchange failed. Status: ${exchangeResponse.status}. Error: ${errorText}`);
        }
      } catch (exchErr) {
        console.error("❌ Firebase exchange network error:", exchErr.message);
      }

      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("role", role || "Client");
      await AsyncStorage.setItem("isApproved", String(isApproved));

      console.log("✅ User logged in:", role);

      // 🔁 Redirection using local data
      if (role === "Admin") {
        console.log("✅ Redirecting to Admin Dashboard");
        router.replace("/admin/AdminDashboard");
        return;
      }

      if (role === "Prestataire") {
        if (!isApproved && isApproved !== true && String(isApproved) !== "true") {
          setError("Votre compte prestataire est en attente de validation.");
          return;
        }
        console.log("Redirecting to Prestataire Dashboard");
        router.replace("/prestataire/PrestataireDashboard");
        return;
      }

      console.log("Redirecting to Client page");
      router.replace("/client");
    } catch (err) {
      console.error("Login error:", err);

      // More specific error messages
      if (err.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect. Vérifiez vos identifiants.");
      } else if (err.code === "auth/user-not-found") {
        setError("Aucun compte trouvé avec cet email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Mot de passe incorrect.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format d'email invalide.");
      } else if (err.code === "auth/user-disabled") {
        setError("Ce compte a été désactivé.");
      } else {
        setError(`Erreur de connexion: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetEmail(email || "");
    setResetError("");
    setResetSuccess("");
    setResetVisible(true);

    resetAnim.setValue(0);
    Animated.timing(resetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeReset = () => {
    Animated.timing(resetAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setResetVisible(false);
      setResetLoading(false);
      setResetError("");
      setResetSuccess("");
    });
  };

  const handlePasswordReset = async () => {
    setResetError("");
    setResetSuccess("");

    const e = (resetEmail || "").trim();
    if (!e) {
      setResetError("Veuillez saisir votre email.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, e);
      setResetSuccess("Email envoyé. Vérifiez votre boîte de réception.");
    } catch (err) {
      if (err?.code === "auth/invalid-email") {
        setResetError("Format d'email invalide.");
      } else if (err?.code === "auth/user-not-found") {
        setResetError("Aucun compte trouvé avec cet email.");
      } else {
        setResetError(`Erreur: ${err?.message || "Impossible d'envoyer l'email"}`);
      }
    } finally {
      setResetLoading(false);
    }
  };


  // =========================
  // UI
  // =========================
  return (
    <LinearGradient
      colors={["#052e1a", theme.colors.primaryDark, theme.colors.primary, "#F8FFFB"]}
      locations={[0, 0.28, 0.46, 0.46]}
      start={{ x: 0.15, y: 0.05 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.container}>
        <Modal
          transparent
          visible={resetVisible}
          animationType="none"
          onRequestClose={closeReset}
        >
          <View style={styles.resetOverlay}>
            <TouchableOpacity style={styles.resetBackdrop} activeOpacity={1} onPress={closeReset} />
            <Animated.View
              style={[
                styles.resetCard,
                {
                  opacity: resetAnim,
                  transform: [
                    {
                      translateY: resetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: resetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.resetHeader}>
                <View style={styles.resetIcon}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.primaryDark} />
                </View>
                <TouchableOpacity onPress={closeReset} style={styles.resetClose} activeOpacity={0.9}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.resetTitle}>Réinitialiser le mot de passe</Text>
              <Text style={styles.resetText}>
                Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </Text>

              {resetError ? (
                <View style={styles.resetMessageError}>
                  <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                  <Text style={styles.resetMessageErrorText}>{resetError}</Text>
                </View>
              ) : null}

              {resetSuccess ? (
                <View style={styles.resetMessageSuccess}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  <Text style={styles.resetMessageSuccessText}>{resetSuccess}</Text>
                </View>
              ) : null}

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse email"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, resetLoading && styles.buttonDisabled]}
                onPress={handlePasswordReset}
                disabled={resetLoading}
                activeOpacity={0.9}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Envoyer le lien</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetSecondary} onPress={closeReset} activeOpacity={0.9}>
                <Text style={styles.resetSecondaryText}>Retour</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

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
              <Text style={styles.subtitle}>Votre marché floral</Text>
            </View>

            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Connexion</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse email"
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
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
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Se connecter</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPassword} onPress={openReset} activeOpacity={0.9}>
                  <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.authOptions}>
                <TouchableOpacity
                  style={styles.signupButton}
                  onPress={() => router.push("/auth/register")}
                >
                  <Text style={styles.signupButtonText}>Créer un compte</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.vendorButton}
                  onPress={() => router.push("/auth/register-prestataire")}
                >
                  <Ionicons name="storefront-outline" size={18} color={theme.colors.primaryDark} />
                  <Text style={styles.vendorButtonText}>se connecter en tant que prestataire</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  resetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  resetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  resetCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    ...theme.shadows.lg,
  },
  resetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  resetClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  resetTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 8,
  },
  resetText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  resetMessageError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error + "10",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    gap: 8,
  },
  resetMessageErrorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    flex: 1,
  },
  resetMessageSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.success + "10",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    gap: 8,
  },
  resetMessageSuccessText: {
    ...theme.typography.body2,
    color: theme.colors.success,
    flex: 1,
  },
  resetSecondary: {
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
  },
  resetSecondaryText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: "700",
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
    textAlign: 'left',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginHorizontal: 12,
  },
  authOptions: {
    marginTop: 16,
  },
  signupButton: {
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  signupButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryDark,
  },
  vendorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  vendorButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryDark,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
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
});
