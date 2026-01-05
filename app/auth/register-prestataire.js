import React, { useState } from "react";
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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../src/theme";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../src/services/firebase";
import { API_BASE_URL } from "../../src/api/axios";

export default function RegisterPrestataire() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState(""); // ✅ NOUVEAU
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState("");
  const [pendingVisible, setPendingVisible] = useState(false);
  const [pendingAnim] = useState(() => new Animated.Value(0));

  const openPending = () => {
    setPendingVisible(true);
    pendingAnim.setValue(0);
    Animated.timing(pendingAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closePending = (navigateToLogin) => {
    Animated.timing(pendingAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setPendingVisible(false);
      if (navigateToLogin) router.replace("/auth/Login");
    });
  };


  const handleRegister = async () => {
    setError("");

    if (!fullName || !email || !password || !address) {
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
        address,
        role: "Prestataire",
        isApproved: false,
        createdAt: new Date(),
      });

      // 🔹 Exchange for JWT (even if not approved yet, helps with initial setup)
      try {
        const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/firebase-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: uid,
            email: email,
            fullName: fullName,
            role: "Prestataire",
            isApproved: false
          })
        });
        if (exchangeResponse.ok) {
          const data = await exchangeResponse.json();
          if (data.token) {
            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("uid", uid);
            await AsyncStorage.setItem("role", "Prestataire");
            await AsyncStorage.setItem("isApproved", "false");
          }
        }
      } catch (exchErr) {
        console.error("Firebase exchange failed:", exchErr);
      }

      openPending();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l’inscription");
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
        <Modal
          transparent
          visible={pendingVisible}
          animationType="none"
          onRequestClose={() => closePending(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => closePending(false)} />
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: pendingAnim,
                  transform: [
                    {
                      translateY: pendingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: pendingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalIcon}>
                <Ionicons name="time-outline" size={22} color={theme.colors.primaryDark} />
              </View>
              <Text style={styles.modalTitle}>Demande envoyée</Text>
              <Text style={styles.modalText}>
                Merci ! Votre compte prestataire est en attente de validation par l’administrateur.
                Vous pourrez vous connecter dès qu’il sera approuvé.
              </Text>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => closePending(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>Retour à la connexion</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => closePending(false)} style={styles.modalSecondaryBtn} activeOpacity={0.9}>
                <Text style={styles.modalSecondaryText}>Fermer</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <View pointerEvents="none" style={styles.decorWrap}>
          <View style={styles.decorA} />
          <View style={styles.decorB} />
        </View>
        <KeyboardAvoidingView enabled={Platform.OS === "ios"} behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          >
            <View style={styles.hero}>
              <View style={styles.heroRow}>
              </View>
              <Text style={styles.brandLine}>Flower Market</Text>
              <Text style={styles.subtitle}>Inscription Prestataire</Text>
            </View>

            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Créer un compte vendeur</Text>
              <Text style={styles.sheetHint}>
                Votre compte sera soumis à validation avant d’être activé.
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nom complet"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
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
                    value={password}
                    onChangeText={setPassword}
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

                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>S’inscrire</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace("/auth/Login")} style={styles.secondaryLink}>
                  <Text style={styles.secondaryLinkText}>← Retour à la connexion</Text>
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
  bg: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
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
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  modalPrimaryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.md,
  },
  modalPrimaryText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  modalSecondaryBtn: {
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
  },
  modalSecondaryText: {
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
  scrollContainer: { flexGrow: 1, justifyContent: "space-between" },

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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  backText: {
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
    marginBottom: 6,
  },
  sheetHint: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  formContainer: { marginBottom: 8 },

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
  inputIcon: { marginRight: 12 },
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
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },

  secondaryLink: {
    alignItems: "center",
    marginTop: 14,
  },
  secondaryLinkText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: "700",
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error + "10",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 16,
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
  },
});
