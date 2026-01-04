import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";
import { useCart } from "./CartContext";

const { width } = Dimensions.get('window');

const FLORAL_COLORS = {
  background: ['#FDFCFB', '#F7F9F7'],
  primary: '#4A785D',
  secondary: '#8AA682',
  accent: '#D4AF37',
  text: '#1A202C',
  textDim: '#718096',
  border: '#EDF2F7',
  white: '#FFFFFF',
};

const GRADIENTS = {
  primary: ['#4A785D', '#3D634D'],
  sage: ['#F0F7F3', '#E6EDE9'],
  white: ['#FFFFFF', '#F8FAFC'],
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrestataire, setSelectedPrestataire] = useState(null);

  const { addToCart, cart } = useCart();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/market/products");
        const all = res.data?.data || [];
        setProducts(all.filter((p) => p.isActive !== false));
      } catch (e) {
        console.log("Erreur chargement produits", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* =======================
     HELPERS
  ======================= */
  const hasPromo = (item) => item.discount && item.discount > 0;

  const getDisplayPrice = (item) => {
    if (!hasPromo(item)) return item.price;
    return item.finalPrice; // Backend already calculates this
  };

  /* =======================
     FILTERS & DATA
  ======================= */
  const prestataires = useMemo(() => {
    const list = [];
    const names = new Set();
    products.forEach(p => {
      if (p.prestataireName && !names.has(p.prestataireName)) {
        names.add(p.prestataireName);
        list.push(p.prestataireName);
      }
    });
    return list;
  }, [products]);

  const filteredProducts = selectedPrestataire
    ? products.filter(p => p.prestataireName === selectedPrestataire)
    : products;

  const promoProducts = products.filter(hasPromo);
  const filteredPromos = selectedPrestataire
    ? promoProducts.filter(p => p.prestataireName === selectedPrestataire)
    : promoProducts;


  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <LinearGradient colors={FLORAL_COLORS.background} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="dark-content" />

        {/* HEADER */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.headerLux}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLux}>
            <Ionicons name="chevron-back" size={24} color={FLORAL_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLux}>Shop</Text>
          <TouchableOpacity onPress={() => router.push('/client/cart')} style={styles.cartBtnLux}>
            <Feather name="shopping-bag" size={22} color={FLORAL_COLORS.primary} />
            {cart.length > 0 && (
              <View style={styles.badgeLux}>
                <Text style={styles.badgeTextLux}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animatable.View>

        {/* FILTERS */}
        <Animatable.View animation="fadeIn" delay={300} style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.chipLux, !selectedPrestataire && styles.chipActiveLux]}
              onPress={() => setSelectedPrestataire(null)}
            >
              <Text style={[styles.chipTextLux, !selectedPrestataire && styles.chipTextActiveLux]}>All</Text>
            </TouchableOpacity>

            {prestataires.map((pName, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={[styles.chipLux, selectedPrestataire === pName && styles.chipActiveLux]}
                onPress={() => setSelectedPrestataire(pName)}
              >
                <Text style={[styles.chipTextLux, selectedPrestataire === pName && styles.chipTextActiveLux]}>
                  {pName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {filteredPromos.length > 0 && (
                <View style={styles.promoSection}>
                  <Text style={styles.sectionTitleLux}>🔥 Special Offers</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {filteredPromos.map((item, idx) => (
                      <Animatable.View key={idx} animation="fadeInRight" delay={idx * 100} style={styles.promoCardLux}>
                        <LinearGradient colors={GRADIENTS.sage} style={styles.promoInner}>
                          <View style={styles.promoTagLux}>
                            <Text style={styles.promoTagTextLux}>-{item.discount}%</Text>
                          </View>
                          <Text style={styles.promoNameLux} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.promoStoreLux}>{item.prestataireName}</Text>
                          <View style={styles.promoPriceRow}>
                            <Text style={styles.promoFinalPriceLux}>{item.finalPrice} DHS</Text>
                            <Text style={styles.promoOldPriceLux}>{item.price} DHS</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.addSmallLux}
                            onPress={() => addToCart({ ...item, finalPrice: item.finalPrice }, 1)}
                            disabled={item.stock <= 0}
                          >
                            <Text style={styles.addSmallTextLux}>{item.stock > 0 ? "Add" : "Sold Out"}</Text>
                          </TouchableOpacity>
                        </LinearGradient>
                      </Animatable.View>
                    ))}
                  </ScrollView>
                </View>
              )}
              <Text style={styles.sectionTitleLux}>All our bouquets</Text>
            </>
          )}
          renderItem={({ item, index }) => {
            const isPromo = hasPromo(item);
            return (
              <Animatable.View animation="fadeInUp" delay={200 + (index * 50)} style={styles.productCardLux}>
                <View style={styles.cardInfoLux}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productNameLux}>{item.name}</Text>
                      <View style={styles.storeRow}>
                        <Ionicons name="storefront-outline" size={14} color={FLORAL_COLORS.primary} />
                        <Text style={styles.storeNameLux}>{item.prestataireName}</Text>
                      </View>
                    </View>
                    {isPromo && (
                      <View style={styles.promoPillLux}>
                        <Text style={styles.promoPillTextLux}>PROMO</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooterLux}>
                    <View>
                      {isPromo ? (
                        <View style={styles.priceContainerLux}>
                          <Text style={styles.finalPriceLux}>{item.finalPrice} DHS</Text>
                          <Text style={styles.oldPriceSmallLux}>{item.price} DHS</Text>
                        </View>
                      ) : (
                        <Text style={styles.finalPriceLux}>{item.price} DHS</Text>
                      )}
                      <Text style={styles.stockTextLux}>{item.stock > 0 ? `${item.stock} en stock` : 'Indisponible'}</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => addToCart({ ...item, finalPrice: isPromo ? item.finalPrice : item.price }, 1)}
                      disabled={item.stock <= 0}
                    >
                      <LinearGradient
                        colors={item.stock > 0 ? GRADIENTS.primary : ['#CBD5E1', '#94A3B8']}
                        style={styles.addButtonLux}
                      >
                        <Feather name="shopping-cart" size={18} color="white" />
                        <Text style={styles.addBtnTextLux}>Add</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animatable.View>
            );
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  headerTitleLux: {
    fontSize: 22,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    letterSpacing: -0.5,
  },
  backBtnLux: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cartBtnLux: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeLux: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: FLORAL_COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTextLux: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  chipLux: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
  },
  chipActiveLux: {
    backgroundColor: FLORAL_COLORS.primary,
    borderColor: FLORAL_COLORS.primary,
  },
  chipTextLux: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
  },
  chipTextActiveLux: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: 24,
  },
  sectionTitleLux: {
    fontSize: 20,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    marginBottom: 20,
    marginTop: 10,
  },
  promoSection: {
    marginBottom: 30,
  },
  horizontalScroll: {
    paddingRight: 20,
    gap: 16,
  },
  promoCardLux: {
    width: width * 0.65,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  promoInner: {
    padding: 20,
    flex: 1,
  },
  promoTagLux: {
    alignSelf: 'flex-start',
    backgroundColor: FLORAL_COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  promoTagTextLux: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
  },
  promoNameLux: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    marginBottom: 4,
  },
  promoStoreLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    marginBottom: 12,
    fontWeight: '600',
  },
  promoPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  promoFinalPriceLux: {
    fontSize: 20,
    fontWeight: '900',
    color: FLORAL_COLORS.primary,
  },
  promoOldPriceLux: {
    fontSize: 14,
    color: FLORAL_COLORS.textDim,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  addSmallLux: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
  },
  addSmallTextLux: {
    color: FLORAL_COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  productCardLux: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  cardInfoLux: {
    padding: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productNameLux: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    marginBottom: 4,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeNameLux: {
    fontSize: 13,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  promoPillLux: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoPillTextLux: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },
  cardDivider: {
    height: 1,
    backgroundColor: FLORAL_COLORS.border,
    marginVertical: 15,
  },
  cardFooterLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainerLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalPriceLux: {
    fontSize: 22,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  oldPriceSmallLux: {
    fontSize: 14,
    color: FLORAL_COLORS.textDim,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  stockTextLux: {
    fontSize: 11,
    color: FLORAL_COLORS.textDim,
    marginTop: 2,
    fontWeight: '600',
  },
  addButtonLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addBtnTextLux: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
