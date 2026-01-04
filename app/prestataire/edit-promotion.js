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
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";
import SuccessModal from "../../src/components/SuccessModal";

const FLORAL_THEME = {
    background: "#FDFCFB",
    primary: "#4A785D",
    text: "#1A202C",
    textDim: "#718096",
    white: "#FFFFFF",
    warning: "#F6AD55",
    border: "#EDF2F7",
};

export default function EditPromotion() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse the promotion data passed as JSON string or individual params
    const initialData = params.promotion ? JSON.parse(params.promotion) : params;

    const [title, setTitle] = useState(initialData.title || "");
    const [discount, setDiscount] = useState(initialData.discount?.toString() || "");

    const [startDate, setStartDate] = useState(new Date(initialData.startDate || Date.now()));
    const [endDate, setEndDate] = useState(new Date(initialData.endDate || Date.now()));

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleUpdate = async () => {
        if (!discount || isNaN(discount) || Number(discount) <= 0 || Number(discount) > 100) {
            return Alert.alert("Erreur", "Remise invalide (1-100%)");
        }
        if (endDate <= startDate) {
            return Alert.alert("Erreur", "La date de fin doit être après le début");
        }

        setLoading(true);

        try {
            const payload = {
                discountPercent: Number(discount),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };

            await api.put(`/prestataire/promotions/${initialData.id}`, payload);
            setShowSuccessModal(true);
        } catch (err) {
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
                    <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={FLORAL_THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Modifier Promotion</Text>
                        <View style={{ width: 44 }} />
                    </Animatable.View>

                    <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formContainer}>
                        <Text style={styles.productNameIndicator}>Produit: {initialData.productName}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Titre</Text>
                            <TextInput
                                style={[styles.input, { opacity: 0.6 }]}
                                value={title}
                                editable={false}
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

                        <TouchableOpacity
                            style={styles.submit}
                            onPress={handleUpdate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.submitContent}>
                                    <Feather name="save" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.submitText}>Enregistrer les modifications</Text>
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
                    title="Mise à jour réussie !"
                    message="Votre promotion a été modifiée avec succès."
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
    productNameIndicator: {
        fontSize: 16,
        fontWeight: "700",
        color: FLORAL_THEME.primary,
        marginBottom: 20,
        backgroundColor: "#F0F7F3",
        padding: 12,
        borderRadius: 12,
        overflow: "hidden",
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
