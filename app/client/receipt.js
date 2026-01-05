import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
} from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCart } from "./CartContext";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { SafeAreaView } from "react-native-safe-area-context";

const RECEIPT_COLORS = {
    paper: '#FFFFFF',
    text: '#1A202C',
    textDim: '#718096',
    primary: '#4A785D',
    accent: '#D4AF37',
    divider: '#E2E8F0',
    background: '#F1F5F9',
};

export default function Receipt() {
    const router = useRouter();
    const { orderData } = useLocalSearchParams();

    // Parse order data
    let order = null;
    try {
        if (orderData) {
            order = JSON.parse(orderData);
        }
    } catch (e) {
        console.error("Failed to parse order data", e);
    }

    const now = new Date();
    const dateStr = order?.date ? new Date(order.date).toLocaleDateString() + " " + new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderId = order?.id || ("FM-" + Math.floor(100000 + Math.random() * 900000));

    const displayItems = order?.items || [];
    if (!order) {
        return (
            <View style={styles.container}>
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={60} color={RECEIPT_COLORS.textDim} />
                    <Text style={{ marginTop: 20, fontSize: 18, color: RECEIPT_COLORS.text, fontWeight: '700' }}>Receipt Not Found</Text>
                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.push("/client")}>
                        <Text style={{ color: RECEIPT_COLORS.primary, fontWeight: '700' }}>Back to Shop</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        );
    }

    const subtotal = order.total || displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 5.0;
    const grandTotal = subtotal + deliveryFee;

    const handleExport = async () => {
        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1A202C; background: #fff; }
                            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #F1F5F9; padding-bottom: 20px; }
                            .logo { font-size: 28px; font-weight: 800; color: #4A785D; margin-bottom: 5px; }
                            .subtitle { font-size: 14px; color: #718096; text-transform: uppercase; letter-spacing: 2px; }
                            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                            .label { font-weight: 700; color: #718096; }
                            .value { font-weight: 600; }
                            .items-table { width: 100%; margin: 30px 0; border-collapse: collapse; }
                            .items-table th { text-align: left; padding: 12px; border-bottom: 1px solid #EDF2F7; color: #718096; text-transform: uppercase; font-size: 12px; }
                            .items-table td { padding: 12px; border-bottom: 1px solid #F7FAFC; font-size: 14px; }
                            .item-name { font-weight: 700; }
                            .totals { margin-top: 30px; border-top: 2px solid #F1F5F9; padding-top: 20px; }
                            .total-row { display: flex; justify-content: flex-end; margin-bottom: 8px; font-size: 14px; }
                            .grand-total { font-size: 20px; font-weight: 800; color: #4A785D; margin-top: 10px; }
                            .footer { margin-top: 50px; text-align: center; color: #A0AEC0; font-size: 12px; }
                            .address-section { background: #F8FAFC; padding: 20px; border-radius: 12px; margin-top: 30px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">FlowerMarket</div>
                            <div class="subtitle">Official Receipt</div>
                        </div>

                        <div class="info-row">
                            <span class="label">ORDER ID</span>
                            <span class="value">#${orderId}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">DATE</span>
                            <span class="value">${new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">PAYMENT</span>
                            <span class="value">${order?.paymentMethod || 'Credit Card'}</span>
                        </div>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${displayItems.map(item => `
                                    <tr>
                                        <td><div class="item-name">${item.name}</div></td>
                                        <td>${item.quantity}</td>
                                        <td>${(item.price * item.quantity).toFixed(2)} DHS</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="totals">
                            <div class="total-row">
                                <span class="label" style="margin-right: 50px;">Subtotal</span>
                                <span class="value">${subtotal.toFixed(2)} DHS</span>
                            </div>
                            <div class="total-row">
                                <span class="label" style="margin-right: 50px;">Delivery Fee</span>
                                <span class="value">${deliveryFee.toFixed(2)} DHS</span>
                            </div>
                            <div class="total-row grand-total">
                                <span style="margin-right: 50px;">Total Amount</span>
                                <span>${grandTotal.toFixed(2)} DHS</span>
                            </div>
                        </div>

                        <div class="address-section">
                            <div class="label" style="margin-bottom: 5px;">DELIVERY ADDRESS</div>
                            <div class="value">${order?.address || 'Not specified'}</div>
                        </div>

                        <div class="footer">
                            <p>Thank you for shopping with FlowerMarket!</p>
                            <p>For any inquiries, contact us at contact@flowermarket.com</p>
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error("Error generating/sharing PDF:", error);
            alert("Could not generate PDF receipt. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push("/client")} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={RECEIPT_COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Official Receipt</Text>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleExport}>
                        <Feather name="share" size={20} color={RECEIPT_COLORS.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animatable.View animation="fadeInUp" duration={800} style={styles.receiptCard}>

                        {/* LOGO & BRAND */}
                        <View style={styles.brandContainer}>
                            <View style={styles.logoBox}>
                                <MaterialCommunityIcons name="flower-tulip" size={30} color={RECEIPT_COLORS.paper} />
                            </View>
                            <Text style={styles.brandName}>FlowerMarket</Text>
                            <Text style={styles.tagline}>Exquisite Blooms Delivered</Text>
                        </View>

                        <View style={styles.dividerDots} />

                        {/* ORDER INFO */}
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Order ID</Text>
                                <Text style={styles.infoValue}>{orderId}</Text>
                            </View>
                            <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
                                <Text style={styles.infoLabel}>Date</Text>
                                <Text style={styles.infoValue}>{dateStr}</Text>
                            </View>
                        </View>

                        <View style={styles.dividerPaper} />

                        {/* ITEMS HEADER */}
                        <View style={styles.itemsHeader}>
                            <Text style={styles.itemsHeaderText}>Product</Text>
                            <Text style={styles.itemsHeaderText}>Total</Text>
                        </View>

                        {/* DYNAMIC ITEMS */}
                        {displayItems.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemQty}>QTY: {item.quantity} x {item.price.toFixed(2)} DHS</Text>
                                </View>
                                <Text style={styles.itemPrice}>{((item.price) * item.quantity).toFixed(2)} DHS</Text>
                            </View>
                        ))}

                        <View style={styles.dividerPaper} />

                        {/* TOTALS */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{subtotal.toFixed(2)} DHS</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Delivery Fee</Text>
                            <Text style={styles.totalValue}>{deliveryFee.toFixed(2)} DHS</Text>
                        </View>
                        <View style={[styles.totalRow, { marginTop: 10 }]}>
                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                            <Text style={styles.grandTotalValue}>{grandTotal.toFixed(2)} DHS</Text>
                        </View>

                        <View style={styles.dividerDots} />

                        {/* FOOTER MESSAGES */}
                        <View style={styles.footerInfo}>
                            <Text style={styles.footerTitle}>Payment Detail</Text>
                            <Text style={styles.footerValue}>
                                {order?.method || "N/A"}
                                {order?.last4 ? ` (•••• ${order.last4})` : ""}
                            </Text>

                            <Text style={[styles.footerTitle, { marginTop: 15 }]}>Delivery Address</Text>
                            <Text style={styles.footerValue}>{order?.address || "Address not provided"}</Text>
                            <Text style={styles.footerValue}>Phone: {order?.phone || "N/A"}</Text>
                        </View>

                        <View style={styles.thankYouBox}>
                            <Text style={styles.thankYouText}>Thank you for choosing us!</Text>
                        </View>
                    </Animatable.View>
                </ScrollView>

                {/* BOTTOM ACTION */}
                <View style={styles.footerAction}>
                    <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.push("/client")}>
                        <LinearGradient colors={['#4A785D', '#3D634D']} style={styles.gradientBtn}>
                            <Text style={styles.btnText}>Back to Home</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: RECEIPT_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: RECEIPT_COLORS.text,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    receiptCard: {
        backgroundColor: RECEIPT_COLORS.paper,
        borderRadius: 5, // Receipt paper usually sharp
        padding: 25,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: RECEIPT_COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    brandName: {
        fontSize: 24,
        fontWeight: '900',
        color: RECEIPT_COLORS.text,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 12,
        color: RECEIPT_COLORS.accent,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginTop: 2,
    },
    dividerDots: {
        height: 2,
        borderWidth: 1,
        borderColor: RECEIPT_COLORS.divider,
        borderStyle: 'dashed',
        marginVertical: 20,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: RECEIPT_COLORS.textDim,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
        color: RECEIPT_COLORS.text,
    },
    dividerPaper: {
        height: 1,
        backgroundColor: RECEIPT_COLORS.divider,
        marginVertical: 20,
    },
    itemsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    itemsHeaderText: {
        fontSize: 14,
        fontWeight: '800',
        color: RECEIPT_COLORS.text,
        textTransform: 'uppercase',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        color: RECEIPT_COLORS.text,
    },
    itemQty: {
        fontSize: 13,
        color: RECEIPT_COLORS.textDim,
        top: 2,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: '800',
        color: RECEIPT_COLORS.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 15,
        color: RECEIPT_COLORS.textDim,
    },
    totalValue: {
        fontSize: 15,
        fontWeight: '700',
        color: RECEIPT_COLORS.text,
    },
    grandTotalLabel: {
        fontSize: 18,
        fontWeight: '800',
        color: RECEIPT_COLORS.text,
    },
    grandTotalValue: {
        fontSize: 22,
        fontWeight: '900',
        color: RECEIPT_COLORS.primary,
    },
    footerInfo: {
        marginTop: 10,
    },
    footerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: RECEIPT_COLORS.text,
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    footerValue: {
        fontSize: 14,
        color: RECEIPT_COLORS.textDim,
        lineHeight: 20,
    },
    thankYouBox: {
        marginTop: 40,
        alignItems: 'center',
    },
    thankYouText: {
        fontSize: 16,
        fontWeight: '800',
        color: RECEIPT_COLORS.primary,
    },
    supportText: {
        fontSize: 12,
        color: RECEIPT_COLORS.textDim,
        marginTop: 5,
    },
    barcodeContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    barcodeLines: {
        width: '100%',
        height: 40,
        backgroundColor: '#000', // Mock barcode
        borderRadius: 2,
        opacity: 0.1,
    },
    barcodeNumber: {
        fontSize: 10,
        color: RECEIPT_COLORS.textDim,
        marginTop: 5,
        letterSpacing: 3,
    },
    footerAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    backHomeBtn: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
