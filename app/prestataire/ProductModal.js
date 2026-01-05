import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";

const CATEGORIES = ["Fleurs", "Plantes", "Bouquets"];

export default function ProductModal({
  title,
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            placeholder="Nom"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />

          <TextInput
            style={styles.input}
            placeholder="Prix"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
          />

          <TextInput
            style={styles.input}
            placeholder="Stock"
            keyboardType="numeric"
            value={form.stock}
            onChangeText={(v) => setForm({ ...form, stock: v })}
          />

          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.row}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setForm({ ...form, category: c })}
              >
                <Text style={[
                  styles.chip,
                  form.category === c && styles.chipActive
                ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { height: 90 }]}
            multiline
            placeholder="Description"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
          />

          <TextInput
            style={styles.input}
            placeholder="Image URL (optionnel)"
            value={form.imageUrl}
            onChangeText={(v) => setForm({ ...form, imageUrl: v })}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center" },
  modal: { backgroundColor: "#0f172a", margin: 20, borderRadius: 16, padding: 16 },
  title: { color: "#fff", fontSize: 20, textAlign: "center", marginBottom: 10 },
  label: { color: "#cbd5e1", marginBottom: 4 },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 10, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: { color: "#cbd5e1" },
  chipActive: { color: "#22c55e", fontWeight: "bold" },
  saveBtn: { backgroundColor: "#22c55e", padding: 12, borderRadius: 10 },
  saveText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  cancel: { color: "#f87171", textAlign: "center", marginTop: 10 },
});
