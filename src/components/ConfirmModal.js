import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import { BlurView } from "expo-blur";

const FLORAL_COLORS = {
    primary: '#4A785D', // Sage Green
    text: '#1A202C', // Dark Slate
    textDim: '#718096',
    white: '#FFFFFF',
    danger: '#E53E3E',
};

const ConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmText = "Supprimer", cancelText = "Annuler" }) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
        >
            <View style={styles.overlay}>
                <BlurView intensity={30} style={styles.blur}>
                    <Animatable.View
                        animation="zoomIn"
                        duration={300}
                        style={styles.container}
                    >
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <Feather name="trash-2" size={32} color={FLORAL_COLORS.danger} />
                            </View>
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animatable.View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    blur: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 28,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF5F5',
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: FLORAL_COLORS.text,
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        fontSize: 15,
        color: FLORAL_COLORS.textDim,
        textAlign: "center",
        marginBottom: 28,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: "#F7FAFC",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EDF2F7",
    },
    cancelButtonText: {
        color: FLORAL_COLORS.textDim,
        fontSize: 15,
        fontWeight: "700",
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: FLORAL_COLORS.danger,
        alignItems: "center",
        shadowColor: FLORAL_COLORS.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
});

export default ConfirmModal;
