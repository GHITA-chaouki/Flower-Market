import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";
import SuccessModal from "../../src/components/SuccessModal";

const FLORAL_THEME = {
    background: "#FDFCFB",
    primary: "#4A785D", // Sage Green
    text: "#1A202C", // Dark Slate
    textDim: "#718096",
    white: "#FFFFFF",
    error: "#E53E3E",
    border: "#EDF2F7",
};

export default function AddPromotion() {
    const router = useRouter();
    const { productId: preselectedId } = useLocalSearchParams();

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [title, setTitle] = useState("");
    const [discount, setDiscount] = useState("");
    const [description, setDescription] = useState("");

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 days

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingProducts, setFetchingProducts] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get("/prestataire/products");
            const list = res.data.data || [];
            setProducts(list);

            // Si on vient du Dashboard avec un ID pré-selectionné
            if (preselectedId) {
                setSelectedProduct(preselectedId);
            } else if (list.length > 0) {
                setSelectedProduct(list[0].id);
            }
        } catch (err) {
            Alert.alert("Erreur", "Impossible de charger les produits");
        } finally {
            setFetchingProducts(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct) return Alert.alert("Erreur", "Veuillez sélectionner un produit");
        if (!discount || isNaN(discount) || Number(discount) <= 0 || Number(discount) > 100) {
            return Alert.alert("Erreur", "Remise invalide (1-100%)");
        }
        if (endDate <= startDate) {
            return Alert.alert("Erreur", "La date de fin doit être après " + startDate.toLocaleDateString());
        }

        setLoading(true);

        try {
            const payload = {
                title: title || "Promotion Spéciale",
                description,
                discountPercent: Number(discount),
                productId: selectedProduct,
                startDate,
                endDate,
            };

            await api.post("/prestataire/promotions", payload);
            setShowSuccessModal(true);
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || err?.response?.data?.error || "Erreur inconnue";
            Alert.alert("Erreur", msg);
        } finally {
            setLoading(false);
        }
    };

    const onStartChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowStartPicker(false);
        }
        if (selectedDate) setStartDate(selectedDate);
    };

    const onEndChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowEndPicker(false);
        }
        if (selectedDate) setEndDate(selectedDate);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FDFCFB" }} edges={['top']}>
            <LinearGradient colors={["#FDFCFB", "#F5F7F5"]} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* HEADER */}
                    <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={FLORAL_THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Nouvelle Promotion</Text>
                        <View style={{ width: 44 }} />
                    </Animatable.View>

                    <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formContainer}>
                        {/* PRODUIT */}
                        <Text style={styles.sectionTitle}>Sélection du Produit</Text>
                        {fetchingProducts ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator color={FLORAL_THEME.primary} />
                            </View>
                        ) : (
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={selectedProduct}
                                    onValueChange={(itemValue) => setSelectedProduct(itemValue)}
                                    style={styles.picker}
                                    itemStyle={styles.pickerItem}
                                    dropdownIconColor={FLORAL_THEME.primary}
                                >
                                    {products.map((p) => (
                                        <Picker.Item key={p.id} label={`${p.name} (${p.price} DH)`} value={p.id} color={FLORAL_THEME.text} />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        {/* DETAILS */}
                        <Text style={styles.sectionTitle}>Détails de l'Offre</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Titre de la promotion</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Soldes d'Automne"
                                placeholderTextColor="#A0AEC0"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Remise (%)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: 20"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                value={discount}
                                onChangeText={setDiscount}
                            />
                        </View>

                        {/* DATES */}
                        <Text style={styles.label}>Période de validité</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                                <View>
                                    <Text style={styles.dateLabel}>Début</Text>
                                    <Text style={styles.dateValue}>{startDate.toLocaleDateString()}</Text>
                                </View>
                                <Ionicons name="calendar-outline" size={20} color={FLORAL_THEME.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                                <View>
                                    <Text style={styles.dateLabel}>Fin</Text>
                                    <Text style={styles.dateValue}>{endDate.toLocaleDateString()}</Text>
                                </View>
                                <Ionicons name="calendar-outline" size={20} color={FLORAL_THEME.primary} />
                            </TouchableOpacity>
                        </View>

                        {showStartPicker && (
                            <View style={Platform.OS === 'ios' ? styles.pickerContainer : null}>
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={styles.doneBtn} onPress={() => setShowStartPicker(false)}>
                                        <Text style={styles.doneBtnText}>Confirmer</Text>
                                    </TouchableOpacity>
                                )}
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                                    onChange={onStartChange}
                                    textColor={FLORAL_THEME.text}
                                />
                            </View>
                        )}
                        {showEndPicker && (
                            <View style={Platform.OS === 'ios' ? styles.pickerContainer : null}>
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={styles.doneBtn} onPress={() => setShowEndPicker(false)}>
                                        <Text style={styles.doneBtnText}>Confirmer</Text>
                                    </TouchableOpacity>
                                )}
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                                    onChange={onEndChange}
                                    minimumDate={startDate}
                                    textColor={FLORAL_THEME.text}
                                />
                            </View>
                        )}

                        <Text style={styles.label}>Description (Optionnel)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            multiline
                            placeholder="Conditions ou détails supplémentaires..."
                            placeholderTextColor="#A0AEC0"
                            value={description}
                            onChangeText={setDescription}
                        />

                        <TouchableOpacity
                            style={styles.submit}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.submitContent}>
                                    <Ionicons name="flash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.submitText}>Lancer la promotion</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                            <Text style={styles.cancelText}>Annuler</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                </ScrollView>

                <SuccessModal
                    visible={showSuccessModal}
                    title="Offre Lancée !"
                    message="Votre promotion a été créée avec succès et sera visible par vos clients."
                    onButtonClick={() => {
                        setShowSuccessModal(false);
                        router.back();
                    }}
                    buttonText="Terminer"
                />
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 40 },
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
    formContainer: { paddingHorizontal: 24 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: FLORAL_THEME.textDim,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 24,
        marginBottom: 16,
    },
    loadingBox: {
        height: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    pickerWrapper: {
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EDF2F7",
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
    inputGroup: { marginBottom: 20 },
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
        borderColor: "#EDF2F7",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    dateBtn: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#EDF2F7",
        borderRadius: 16,
        padding: 12,
        marginHorizontal: 4,
    },
    dateLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: FLORAL_THEME.textDim,
        textTransform: "uppercase",
    },
    dateValue: {
        fontSize: 14,
        fontWeight: "700",
        color: FLORAL_THEME.text,
    },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 16 },
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
    submitContent: { flexDirection: "row", alignItems: "center" },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    cancelBtn: { marginTop: 20, alignItems: "center", paddingVertical: 10, marginBottom: 20 },
    cancelText: { fontSize: 14, fontWeight: "700", color: FLORAL_THEME.textDim },
    pickerContainer: {
        backgroundColor: "#fff",
        borderRadius: 20,
        marginBottom: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: "#EDF2F7",
    },
    doneBtn: {
        alignSelf: 'flex-end',
        padding: 10,
        marginRight: 10,
    },
    doneBtnText: {
        color: FLORAL_THEME.primary,
        fontWeight: '800',
        fontSize: 16,
    }
});
