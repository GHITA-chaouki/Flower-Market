import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api, { API_BASE_URL } from "../../../src/api/api";
import { useCart } from "../CartContext";

const { width } = Dimensions.get("window");

const FLORAL_COLORS = {
    background: ['#FFFFFF', '#FDFCFB'],
    primary: '#4A785D',
    secondary: '#8AA682',
    accent: '#D4AF37', // Botanical Gold
    text: '#1A202C',
    textDim: '#718096',
    border: '#F1F5F9',
    white: '#FFFFFF',
};

const GRADIENTS = {
    primary: ['#4A785D', '#3D634D'],
    gold: ['#D4AF37', '#B8860B'],
};

export default function ProductDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProduct = async () => {
            console.log("--- DEBUG: ProductDetail Start ---");
            console.log("ID from router:", id);
            try {
                setLoading(true);
                const fullUrl = `${api.defaults.baseURL}/market/products/${id}`;
                console.log("Full Request URL:", fullUrl);

                const res = await api.get(`/market/products/${id}`);
                console.log("Detail Response Status:", res.status);
                console.log("Detail Response Data Body:", JSON.stringify(res.data));

                if (res.data && res.data.data) {
                    setProduct(res.data.data);
                } else if (res.data) {
                    setProduct(res.data);
                } else {
                    console.warn("Detail: No data found in response");
                    setProduct(null);
                }
            } catch (err) {
                console.error("Detail Error Message:", err.message);
                if (err.response) {
                    console.error("Detail Error Status:", err.response.status);
                    console.error("Detail Error Data:", JSON.stringify(err.response.data));
                } else if (err.request) {
                    console.error("Detail Error: No response received from server.");
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchProduct();
        else console.log("Detail Debug: ID is undefined or null");
    }, [id]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={FLORAL_COLORS.accent} />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color={FLORAL_COLORS.accent} />
                <Text style={styles.errorText}>Product not found</Text>
                <Text style={{ color: '#718096', marginTop: 5 }}>ID: {id}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const imageUrl = product.imageUrl
        ? `${API_BASE_URL}${product.imageUrl}`
        : 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#1A202C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{product.category || 'Details'}</Text>
                <TouchableOpacity onPress={() => router.push('/client/cart')} style={styles.headerBtn}>
                    <Feather name="shopping-bag" size={22} color="#1A202C" />
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* IMAGE - Large and Premium */}
                <Animatable.View animation="fadeIn" duration={800} style={styles.imageBox}>
                    <Image source={{ uri: imageUrl }} style={styles.mainImage} />
                    {product.discount > 0 && (
                        <View style={styles.promoPill}>
                            <Text style={styles.promoPillText}>-{product.discount}% OFF</Text>
                        </View>
                    )}
                </Animatable.View>

                {/* INFO */}
                <Animatable.View animation="fadeInUp" duration={600} style={styles.infoBox}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{product.name}</Text>
                            <View style={styles.providerRow}>
                                <MaterialCommunityIcons name="storefront-outline" size={16} color={FLORAL_COLORS.primary} />
                                <Text style={styles.providerName}>{product.prestataireName || product.storeName}</Text>
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.itemPrice}>{product.finalPrice || product.price} DHS</Text>
                            {product.discount > 0 && <Text style={styles.oldPriceDetail}>{product.price} DHS</Text>}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.descSection}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descText}>
                            {product.description || "A beautiful choice for any occasion. Freshly sourced and hand-crafted with the finest selection."}
                        </Text>
                    </View>

                    <View style={styles.qtyRow}>
                        <Text style={styles.sectionTitle}>Quantity</Text>
                        <View style={styles.qtyBox}>
                            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                                <Feather name="minus" size={18} color="#1A202C" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{quantity}</Text>
                            <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                                <Feather name="plus" size={18} color="#1A202C" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.mainAddBtn}
                        onPress={() => {
                            addToCart(product, quantity);
                            router.push('/client/cart');
                        }}
                    >
                        <LinearGradient colors={GRADIENTS.primary} style={styles.addBtnGradient}>
                            <Feather name="shopping-cart" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.addBtnLabel}>Add to Cart</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </Animatable.View>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    errorText: {
        fontSize: 18,
        color: '#718096',
        fontWeight: '700',
    },
    backLink: {
        marginTop: 15,
        padding: 10,
    },
    backLinkText: {
        color: '#4A785D',
        fontWeight: '800',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: 'white',
        zIndex: 10,
    },
    headerBtn: {
        width: 45,
        height: 45,
        borderRadius: 15,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A202C',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    imageBox: {
        width: width,
        height: width,
        padding: 24,
    },
    mainImage: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        resizeMode: 'cover',
    },
    promoPill: {
        position: 'absolute',
        top: 40,
        right: 40,
        backgroundColor: '#D4AF37',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    promoPillText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
    },
    infoBox: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: -30,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1A202C',
        marginBottom: 8,
    },
    providerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    providerName: {
        fontSize: 15,
        color: '#4A785D',
        fontWeight: '700',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    itemPrice: {
        fontSize: 24,
        fontWeight: '900',
        color: '#D4AF37',
    },
    oldPriceDetail: {
        fontSize: 14,
        color: '#718096',
        textDecorationLine: 'line-through',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A202C',
        marginBottom: 12,
    },
    descText: {
        fontSize: 15,
        color: '#718096',
        lineHeight: 24,
    },
    qtyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 25,
    },
    qtyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        padding: 5,
    },
    qtyBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    qtyText: {
        fontSize: 18,
        fontWeight: '900',
        marginHorizontal: 18,
        color: '#1A202C',
    },
    mainAddBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: '#4A785D',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    addBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    addBtnGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnLabel: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    },
});
