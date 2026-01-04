import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    ScrollView,
    TextInput,
    Modal,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCart } from "./CartContext";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";

const FLAT_COLORS = {
    primary: '#4A785D',
    secondary: '#8AA682',
    accent: '#D4AF37',
    background: '#FDFCFB',
    white: '#FFFFFF',
    text: '#1A202C',
    textDim: '#718096',
    border: '#F1F5F9',
    card: '#FFFFFF',
    danger: '#E53E3E',
};

const GRADIENTS = {
    primary: ['#4A785D', '#3D634D'],
    gold: ['#D4AF37', '#B8860B'],
};

export default function Payment() {
    const router = useRouter();
    const { shippingAddress, phone } = useLocalSearchParams();
    const { cart, getTotal, clearCart } = useCart();

    const [paymentMethod, setPaymentMethod] = useState("card"); // "card" or "cash"
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Card Details
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [cardName, setCardName] = useState("");

    const formatCardNumber = (text) => {
        let cleaned = text.replace(/\D/g, '');
        let matched = cleaned.match(/.{1,4}/g);
        return matched ? matched.join(' ') : cleaned;
    };

    const handlePlaceOrder = async () => {
        setLoading(true);
        try {
            const orderSummary = {
                items: cart.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                total: getTotal(),
                address: shippingAddress,
                phone: phone,
                method: paymentMethod === "card" ? "Card" : "Cash on Delivery",
                last4: paymentMethod === "card" ? cardNumber.slice(-4) : null
            };

            for (const item of cart) {
                await api.post("/market/orders", {
                    productId: item.id ?? item._id,
                    quantity: item.quantity,
                    shippingAddress,
                    phone,
                    paymentMethod: orderSummary.method,
                });
            }

            // Pass the summary to the receipt page
            clearCart();
            setShowSuccessModal(true);
            // Store the summary in a way that receipt.js can access it.
            // router.push provides params but they must be simple.
            // We'll pass it to receipt page in getReceipt.
            setLastOrder(orderSummary);
        } catch (err) {
            console.error(err);
            alert("Failed to place order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const [lastOrder, setLastOrder] = useState(null);

    const getReceipt = () => {
        setShowSuccessModal(false);
        router.push({
            pathname: "/client/receipt",
            params: { orderData: JSON.stringify(lastOrder) }
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <Ionicons name="chevron-back" size={24} color={FLAT_COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={styles.headerBtn} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* PAYMENT METHOD SELECTOR */}
                    <View style={styles.methodSelector}>
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('card')}
                            style={[styles.methodTab, paymentMethod === 'card' && styles.activeTab]}
                        >
                            <Ionicons name="card" size={20} color={paymentMethod === 'card' ? '#FFF' : FLAT_COLORS.textDim} />
                            <Text style={[styles.tabText, paymentMethod === 'card' && styles.activeTabText]}>Card</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('cash')}
                            style={[styles.methodTab, paymentMethod === 'cash' && styles.activeTab]}
                        >
                            <Ionicons name="cash" size={20} color={paymentMethod === 'cash' ? '#FFF' : FLAT_COLORS.textDim} />
                            <Text style={[styles.tabText, paymentMethod === 'cash' && styles.activeTabText]}>Cash</Text>
                        </TouchableOpacity>
                    </View>

                    {paymentMethod === 'card' ? (
                        <Animatable.View animation="fadeIn" duration={600} style={styles.cardSection}>
                            <View style={styles.cardWrapper}>
                                <LinearGradient
                                    colors={['#0F2027', '#203A43', '#2C5364']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.virtualCardPremium}
                                >
                                    {/* Glossy Overlay */}
                                    <LinearGradient
                                        colors={['rgba(255,255,255,0.15)', 'transparent']}
                                        style={styles.cardReflect}
                                    />

                                    <View style={styles.cardTop}>
                                        <MaterialCommunityIcons name="integrated-circuit-chip" size={38} color="#D4AF37" />
                                        <View style={styles.mastercardLogo}>
                                            <View style={[styles.mcCircle, { backgroundColor: '#EB001B', marginRight: -12 }]} />
                                            <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', opacity: 0.9 }]} />
                                        </View>
                                    </View>

                                    <Text style={styles.cardDisplayNumberPrimary}>
                                        {cardNumber || "•••• •••• •••• ••••"}
                                    </Text>

                                    <View style={styles.cardBottom}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardLabel}>CARD HOLDER</Text>
                                            <Text style={styles.cardValueLux} numberOfLines={1}>
                                                {(cardName || "NAME SURNAME").toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.cardLabel}>EXPIRES</Text>
                                            <Text style={styles.cardValueLux}>{expiry || "MM/YY"}</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* INPUT FORM */}
                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Card Number</Text>
                                    <TextInput
                                        style={styles.inputLux}
                                        placeholder="0000 0000 0000 0000"
                                        placeholderTextColor="#CBD5E1"
                                        keyboardType="numeric"
                                        maxLength={19}
                                        value={cardNumber}
                                        onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Cardholder Name</Text>
                                    <TextInput
                                        style={styles.inputLux}
                                        placeholder="Enter full name"
                                        placeholderTextColor="#CBD5E1"
                                        value={cardName}
                                        onChangeText={setCardName}
                                    />
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 15 }]}>
                                        <Text style={styles.inputLabel}>Expiry Date</Text>
                                        <TextInput
                                            style={styles.inputLux}
                                            placeholder="MM/YY"
                                            placeholderTextColor="#CBD5E1"
                                            keyboardType="numeric"
                                            maxLength={5}
                                            value={expiry}
                                            onChangeText={setExpiry}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>CVV</Text>
                                        <TextInput
                                            style={styles.inputLux}
                                            placeholder="123"
                                            placeholderTextColor="#CBD5E1"
                                            keyboardType="numeric"
                                            maxLength={3}
                                            secureTextEntry
                                            value={cvv}
                                            onChangeText={setCvv}
                                        />
                                    </View>
                                </View>
                            </View>
                        </Animatable.View>
                    ) : (
                        <Animatable.View animation="fadeIn" duration={600} style={styles.cashSection}>
                            <View style={styles.cashInfoCard}>
                                <View style={styles.cashIconBox}>
                                    <Ionicons name="wallet-outline" size={32} color={FLAT_COLORS.primary} />
                                </View>
                                <Text style={styles.cashTitle}>Standard Delivery</Text>
                                <Text style={styles.cashDesc}>
                                    You will pay for your order in cash when it reaches your doorstep.
                                    Please ensure you have the exact amount ready.
                                </Text>
                            </View>
                        </Animatable.View>
                    )}

                    {/* ORDER BRIEF */}
                    <View style={styles.briefCard}>
                        <View style={styles.briefRow}>
                            <Text style={styles.briefLabel}>Subtotal</Text>
                            <Text style={styles.briefValue}>{getTotal().toFixed(2)} DHS</Text>
                        </View>
                        <View style={styles.briefRow}>
                            <Text style={styles.briefLabel}>Delivery Fee</Text>
                            <Text style={styles.briefValue}>5.00 DHS</Text>
                        </View>
                        <View style={styles.briefDivider} />
                        <View style={styles.briefRow}>
                            <Text style={styles.totalText}>Total Amount</Text>
                            <Text style={styles.totalAmountText}>{(getTotal() + 5).toFixed(2)} DHS</Text>
                        </View>
                    </View>

                </ScrollView>

                <View style={styles.actionFooter}>
                    <TouchableOpacity
                        style={styles.placeOrderBtn}
                        onPress={handlePlaceOrder}
                        disabled={loading}
                    >
                        <LinearGradient colors={GRADIENTS.primary} style={styles.placeOrderGradient}>
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.placeOrderBtnText}>
                                        {paymentMethod === 'card' ? 'Authorize Payment' : 'Confirm & Place Order'}
                                    </Text>
                                    <Feather name="check-circle" size={20} color="#FFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* SUCCESS MODAL */}
                <Modal
                    visible={showSuccessModal}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View animation="zoomIn" duration={400} style={styles.modalCard}>
                            <View style={styles.successIconCircle}>
                                <Ionicons name="checkmark-done" size={40} color={FLAT_COLORS.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Success!</Text>
                            <Text style={styles.modalSubtitle}>Your order has been placed successfully.</Text>

                            <TouchableOpacity style={styles.modalBtn} onPress={getReceipt}>
                                <LinearGradient colors={GRADIENTS.gold} style={styles.modalBtnGradient}>
                                    <Text style={styles.modalBtnText}>Get Your Receipt</Text>
                                    <Ionicons name="receipt-outline" size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    router.push("/client/orders");
                                }}
                            >
                                <Text style={styles.secondaryBtnText}>View My History</Text>
                            </TouchableOpacity>
                        </Animatable.View>
                    </View>
                </Modal>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: FLAT_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: FLAT_COLORS.text,
    },
    scrollContent: {
        paddingBottom: 150,
    },
    methodSelector: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 6,
    },
    methodTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    activeTab: {
        backgroundColor: FLAT_COLORS.primary,
        ...Platform.select({
            ios: {
                shadowColor: FLAT_COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
        color: FLAT_COLORS.textDim,
    },
    activeTabText: {
        color: '#FFF',
    },
    cardSection: {
        marginTop: 25,
    },
    virtualCardPremium: {
        flex: 1,
        padding: 24,
        position: 'relative',
    },
    cardWrapper: {
        marginHorizontal: 20,
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    cardReflect: {
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        height: 300,
        transform: [{ rotate: '45deg' }],
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mastercardLogo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mcCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    cardDisplayNumberPrimary: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 25,
        marginBottom: 25,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        fontWeight: '700',
    },
    cardValueLux: {
        fontSize: 15,
        color: '#FFF',
        fontWeight: '800',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    formContainer: {
        paddingHorizontal: 20,
        marginTop: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: FLAT_COLORS.text,
        marginBottom: 10,
    },
    inputLux: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: FLAT_COLORS.text,
    },
    row: {
        flexDirection: 'row',
    },
    cashSection: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    cashInfoCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cashIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    cashTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: FLAT_COLORS.text,
        marginBottom: 10,
    },
    cashDesc: {
        fontSize: 14,
        color: FLAT_COLORS.textDim,
        textAlign: 'center',
        lineHeight: 22,
    },
    briefCard: {
        marginHorizontal: 20,
        marginTop: 30,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    briefRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    briefLabel: {
        fontSize: 15,
        color: FLAT_COLORS.textDim,
    },
    briefValue: {
        fontSize: 15,
        fontWeight: '700',
        color: FLAT_COLORS.text,
    },
    briefDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },
    totalText: {
        fontSize: 18,
        fontWeight: '800',
        color: FLAT_COLORS.text,
    },
    totalAmountText: {
        fontSize: 22,
        fontWeight: '900',
        color: FLAT_COLORS.primary,
    },
    actionFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -10 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
            },
            android: {
                elevation: 20,
            },
        }),
    },
    placeOrderBtn: {
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
    },
    placeOrderGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    placeOrderBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: FLAT_COLORS.primary,
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 16,
        color: FLAT_COLORS.textDim,
        textAlign: 'center',
        marginBottom: 35,
        lineHeight: 22,
    },
    modalBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 15,
    },
    modalBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    modalBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryBtn: {
        paddingVertical: 12,
    },
    secondaryBtnText: {
        color: FLAT_COLORS.textDim,
        fontSize: 16,
        fontWeight: '700',
    },
});
