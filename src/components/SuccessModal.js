import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import { BlurView } from "expo-blur";

const FLORAL_COLORS = {
    primary: '#4A785D', // Sage Green
    text: '#1A202C', // Dark Slate
    textDim: '#718096',
    white: '#FFFFFF',
    gold: '#D4AF37',
};

const SuccessModal = ({ visible, title, message, onButtonClick, buttonText = "OK" }) => {
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
                        duration={400}
                        style={styles.container}
                    >
                        <View style={styles.iconContainer}>
                            <Animatable.View
                                animation="bounceIn"
                                delay={200}
                                duration={800}
                                style={styles.iconCircle}
                            >
                                <Ionicons name="checkmark" size={40} color="#fff" />
                            </Animatable.View>
                        </View>

                        <Text style={styles.title}>{title || "Succès"}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <TouchableOpacity style={styles.button} onPress={onButtonClick}>
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>
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
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 30,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: FLORAL_COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: FLORAL_COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: FLORAL_COLORS.text,
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        color: FLORAL_COLORS.textDim,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: FLORAL_COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: "100%",
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default SuccessModal;
