import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../src/services/firebase";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api, { API_BASE_URL } from "../../src/api/axios";
import { useCart } from "./CartContext";

const { width } = Dimensions.get("window");

const FLORAL_COLORS = {
  background: ['#FFFFFF', '#FDFCFB'],
  primary: '#4A785D',
  secondary: '#8AA682',
  accent: '#D4AF37', // Gold from mockup
  text: '#1A202C',
  textDim: '#718096',
  border: '#F1F5F9',
  white: '#FFFFFF',
};

const GRADIENTS = {
  primary: ['#4A785D', '#3D634D'],
  gold: ['#D4AF37', '#B8860B'],
};

const CATEGORIES = [
  { id: '1', name: 'All', icon: 'grid-outline' },
  { id: '2', name: 'Fleurs', icon: 'flower-outline' },
  { id: '3', name: 'Plantes', icon: 'leaf-outline' },
  { id: '4', name: 'Bouquets', icon: 'rose-outline' },
];

export default function ClientHome() {
  const router = useRouter();
  const { addToCart, cart } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/market/products");
      const all = resp.data?.data || [];
      setProducts(all.filter(p => p.isActive !== false));
    } catch (err) {
      console.log("Error loading products", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("uid");
      router.replace("/auth/Login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    loadData();
    // 🔔 Notify Admin of Client Visit
    api.post("/market/track-visit?type=Client").catch(() => { });
  }, []);

  /* =======================
     DATA MANIPULATION
  ======================= */
  const providers = useMemo(() => {
    const list = new Set();
    products.forEach(p => { if (p.prestataireName) list.add(p.prestataireName); });
    return Array.from(list);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (selectedProvider) {
      list = list.filter(p => p.prestataireName === selectedProvider);
    }
    if (searchQuery) {
      list = list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [products, selectedCategory, selectedProvider, searchQuery]);

  const promos = useMemo(() => {
    return products.filter(p => p.discount && p.discount > 0);
  }, [products]);

  /* =======================
     RENDERERS
  ======================= */
  const renderProductCard = (item, index) => {
    const imageUrl = item.imageUrl ? `${API_BASE_URL}${item.imageUrl}` : 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=500';
    const isPromo = item.discount > 0;

    return (
      <Animatable.View
        key={item.id}
        animation="fadeInUp"
        delay={index * 50}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            console.log("Navigating to product:", item?.id);
            if (item && item.id) {
              router.push(`/client/product/${item.id}`);
            } else {
              console.warn("Attempted to navigate to product with missing ID", item);
            }
          }}
          style={styles.cardContainer}
        >
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUrl }} style={styles.cardImage} />
            {isPromo && (
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>-{item.discount}%</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.quickAdd}
              onPress={() => addToCart(item, 1)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardStoreText}>{item.prestataireName || 'Boutique'}</Text>
            <Text style={styles.cardNameText} numberOfLines={1}>{item.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.cardPriceText}>{isPromo ? item.finalPrice : item.price} dhs</Text>
              {isPromo && <Text style={styles.cardOldPrice}>{item.price} dhs</Text>}
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={FLORAL_COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* SEARCH */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={22} color="#CBD5E1" />
              <TextInput
                placeholder="Search"
                placeholderTextColor="#CBD5E1"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.cartIconBtn}
              onPress={() => router.push('/client/cart')}
            >
              <Feather name="shopping-bag" size={24} color="white" />
              {cart.length > 0 && (
                <View style={styles.cartBtnBadge}>
                  <Text style={styles.cartBtnBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* BRANDS / PROVIDERS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providerScroll}
          >
            <TouchableOpacity
              style={[styles.providerChip, !selectedProvider && styles.providerChipActive]}
              onPress={() => setSelectedProvider(null)}
            >
              <Text style={[styles.providerText, !selectedProvider && styles.providerTextActive]}>All Stores</Text>
            </TouchableOpacity>
            {providers.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.providerChip, selectedProvider === p && styles.providerChipActive]}
                onPress={() => setSelectedProvider(p)}
              >
                <Text style={[styles.providerText, selectedProvider === p && styles.providerTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* CATEGORIES */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.name)}
                style={styles.catItem}
              >
                <View style={[styles.catIconWrap, selectedCategory === cat.name && styles.catIconActive]}>
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={selectedCategory === cat.name ? "white" : "#1A202C"}
                  />
                </View>
                <Text style={[styles.catLabel, selectedCategory === cat.name && styles.catLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* SPECIAL OFFERS */}
          {promos.length > 0 && (
            <View style={styles.promoWrap}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Special Offers</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoScroll}>
                {promos.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promoCard}
                    onPress={() => {
                      if (item && item.id) {
                        router.push(`/client/product/${item.id}`);
                      } else {
                        console.warn("Attempted to navigate to product with missing ID", item);
                      }
                    }}
                  >
                    <LinearGradient colors={['#F0FDF4', '#E6EDE9']} style={styles.promoInner}>
                      <Text style={styles.promoName}>{item.name}</Text>
                      <Text style={styles.promoStore}>{item.prestataireName}</Text>
                      <View style={styles.promoPriceRow}>
                        <Text style={styles.promoPrice}>{item.finalPrice} DHS</Text>
                        <Text style={styles.productPrice}>{item.price} DHS</Text>
                      </View>
                      <TouchableOpacity style={styles.promoAdd} onPress={() => addToCart(item, 1)}>
                        <Text style={styles.promoAddText}>Quick Add</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ALL PRODUCTS */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>All Bouquets</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={FLORAL_COLORS.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.gridContainer}>
              {filteredProducts.map((p, i) => renderProductCard(p, i))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  cartHeaderBtn: {
    position: 'absolute',
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 5,
    marginBottom: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    height: 55,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1A202C',
  },
  cartIconBtn: {
    width: 55,
    height: 55,
    backgroundColor: '#D4AF37',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  cartBtnBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4A785D',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  cartBtnBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '900',
  },
  providerScroll: {
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 10,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  providerChipActive: {
    backgroundColor: '#4A785D',
    borderColor: '#4A785D',
  },
  providerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
  },
  providerTextActive: {
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  catScroll: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  catItem: {
    alignItems: 'center',
    marginRight: 25,
  },
  catIconWrap: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  catIconActive: {
    backgroundColor: '#D4AF37',
  },
  catLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '700',
  },
  catLabelActive: {
    color: '#000',
  },
  promoWrap: {
    marginTop: 10,
  },
  promoScroll: {
    paddingHorizontal: 24,
    gap: 15,
  },
  promoCard: {
    width: width * 0.6,
    borderRadius: 24,
    overflow: 'hidden',
  },
  promoInner: {
    padding: 20,
    minHeight: 140,
  },
  promoName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1A202C',
    marginBottom: 4,
  },
  promoStore: {
    fontSize: 12,
    color: '#4A785D',
    fontWeight: '700',
    marginBottom: 10,
  },
  promoPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  promoPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A202C',
  },
  promoOldPrice: {
    fontSize: 13,
    color: '#718096',
    textDecorationLine: 'line-through',
  },
  promoAdd: {
    backgroundColor: 'white',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  promoAddText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A785D',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 20,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  imageBox: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  promoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  quickAdd: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#4A785D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardInfo: {
    padding: 12,
  },
  cardStoreText: {
    fontSize: 11,
    color: '#4A785D',
    fontWeight: '700',
    marginBottom: 2,
  },
  cardNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D4AF37',
  },
  cardOldPrice: {
    fontSize: 11,
    color: '#718096',
    textDecorationLine: 'line-through',
  },
});
