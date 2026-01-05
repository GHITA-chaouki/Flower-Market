import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Image,
} from "react-native";

import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";

import * as ImagePicker from 'expo-image-picker';
import SuccessModal from "../../src/components/SuccessModal";

const CATEGORIES = ["Fleurs", "Plantes", "Bouquets"];

const FLORAL_THEME = {
  background: "#FDFCFB",
  primary: "#4A785D", // Sage Green
  text: "#1A202C", // Dark Slate
  textDim: "#718096",
  white: "#FFFFFF",
  error: "#E53E3E",
  inputBg: "#FFFFFF",
  inputBorder: "#E2E8F0",
};

export default function AddProduct({ onProductAdded, onCancel }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Fleurs");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ================= IMAGE PICKER =================
  const pickImage = async () => {
    // Demander la permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission requise", "Vous devez autoriser l'accès à la galerie pour ajouter une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (!name || !price || !stock) {
      Alert.alert("Erreur", "Tous les champs obligatoires (Nom, Prix, Stock) sont requis");
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append("Name", name);
    data.append("Price", parseFloat(price));
    data.append("Stock", parseInt(stock));
    data.append("Category", category);
    data.append("Description", description);

    if (image) {
      // Obtenir le nom de fichier et le type s'ils sont disponibles, sinon des valeurs par défaut
      const filename = image.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      data.append('Image', {
        uri: image,
        name: filename,
        type: type,
      });
    }

    try {
      await api.post("/prestataire/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      setShowSuccessModal(true);

      setName("");
      setPrice("");
      setStock("");
      setCategory("Fleurs");
      setDescription("");
      setImage(null);

      onProductAdded && onProductAdded();
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Ajout du produit échoué");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDFCFB" }} edges={['top']}>
      <LinearGradient colors={["#FDFCFB", "#F5F7F5"]} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={FLORAL_THEME.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Nouveau Produit</Text>
            <View style={{ width: 44 }} />
          </Animatable.View>

          <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formContainer}>
            {/* IMAGE SECTION */}
            <Text style={styles.sectionTitle}>Visuel du Produit</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="image-outline" size={32} color={FLORAL_THEME.primary} />
                  </View>
                  <Text style={styles.imageText}>Ajouter une photo haute qualité</Text>
                  <Text style={styles.imageSubtext}>JPG ou PNG, max 5MB</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* BASIC INFO */}
            <Text style={styles.sectionTitle}>Informations de Base</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom du produit</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Roses Rouges Premium"
                placeholderTextColor="#A0AEC0"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Prix (DHS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#A0AEC0"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#A0AEC0"
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                dropdownIconColor={FLORAL_THEME.primary}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {CATEGORIES.map((c) => (
                  <Picker.Item
                    key={c}
                    label={c}
                    value={c}
                    color={FLORAL_THEME.text}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Décrivez votre produit..."
              placeholderTextColor="#A0AEC0"
              value={description}
              onChangeText={setDescription}
            />

            {/* SUBMIT */}
            <TouchableOpacity
              style={[styles.submit, (!name || !price || !stock) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading || !name || !price || !stock}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.submitContent}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Créer le produit</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>

        <SuccessModal
          visible={showSuccessModal}
          title="Magnifique !"
          message="Votre produit a été ajouté avec succès à votre boutique."
          onButtonClick={() => {
            setShowSuccessModal(false);
            onProductAdded && onProductAdded();
          }}
          buttonText="Continuer"
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: FLORAL_THEME.text,
    letterSpacing: -0.5,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: FLORAL_THEME.textDim,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 16,
  },
  imagePicker: {
    width: "100%",
    height: 200,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#F0F2F5",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  imagePlaceholder: {
    alignItems: "center",
    padding: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F7F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageText: {
    fontSize: 15,
    fontWeight: "700",
    color: FLORAL_THEME.text,
    marginBottom: 4,
  },
  imageSubtext: {
    fontSize: 12,
    color: FLORAL_THEME.textDim,
  },
  imagePreviewContainer: {
    width: "100%",
    height: "100%",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  editBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: FLORAL_THEME.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: FLORAL_THEME.text,
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: FLORAL_THEME.text,
    borderWidth: 1,
    borderColor: "#F0F2F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F2F5",
    marginBottom: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 55,
    color: FLORAL_THEME.text,
  },
  pickerItem: {
    fontSize: 15,
    height: Platform.OS === 'ios' ? 180 : 55,
    color: FLORAL_THEME.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  submit: {
    backgroundColor: FLORAL_THEME.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 30,
    shadowColor: FLORAL_THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  submitDisabled: {
    backgroundColor: "#A0AEC0",
    shadowOpacity: 0.1,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cancelBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: FLORAL_THEME.textDim,
  },
});
