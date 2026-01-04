import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "./CartContext";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";

const FLORAL_COLORS = {
  background: ['#FFFFFF', '#FDFCFB'],
  primary: '#4A785D',
  secondary: '#8AA682',
  accent: '#D4AF37', // Botanical Gold
  text: '#1A202C',
  textDim: '#718096',
  border: '#F1F5F9',
  danger: '#E53E3E',
  white: '#FFFFFF',
};

const GRADIENTS = {
  primary: ['#4A785D', '#3D634D'],
  gold: ['#D4AF37', '#B8860B'],
};

export default function Cart() {
  const {
    cart,
    changeQuantity,
    removeFromCart,
    getTotal,
    clearCart,
    updateItem,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");

  const router = useRouter();

  const handleCheckout = async () => {
    if (!cart.length) return Alert.alert("Empty Cart", "Add some products first.");
    if (!shippingAddress.trim()) {
      setShowAddressModal(true);
      return;
    }

    setLoading(true);
    // Instead of immediate checkout, we go to payment page
    router.push({
      pathname: "/client/payment",
      params: {
        shippingAddress,
        phone
      }
    });
    setLoading(false);
  };

  const goToHistory = () => {
    setShowSuccessModal(false);
    router.push("/client/orders");
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* HEADER - Matches Image 2 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity onPress={clearCart} style={styles.headerBtn}>
            <Feather name="trash-2" size={20} color={FLORAL_COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* MODAL ADRESSE - Premium Redesign with Keyboard handling */}
        <Modal visible={showAddressModal} transparent animationType="fade">
          <View style={styles.modalBg}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowAddressModal(false);
              }}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animatable.View animation="zoomIn" duration={400} style={styles.modalContent}>
                  <View style={styles.modalHeaderIcon}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="location" size={28} color={FLORAL_COLORS.primary} />
                    </View>
                  </View>

                  <Text style={styles.modalTitle}>Shipping Details</Text>
                  <Text style={styles.modalSubtitle}>Where should we send your beautiful flowers?</Text>

                  <View style={styles.modalInputWrapper}>
                    <Ionicons name="map-outline" size={20} color={FLORAL_COLORS.textDim} style={styles.modalIcon} />
                    <TextInput
                      style={styles.modalInputLux}
                      placeholder="Full Delivery Address"
                      placeholderTextColor={FLORAL_COLORS.textDim}
                      value={shippingAddress}
                      onChangeText={setShippingAddress}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.modalInputWrapper}>
                    <Ionicons name="call-outline" size={20} color={FLORAL_COLORS.textDim} style={styles.modalIcon} />
                    <TextInput
                      style={styles.modalInputLux}
                      placeholder="Phone Number"
                      placeholderTextColor={FLORAL_COLORS.textDim}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={styles.modalActionsLux}>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowAddressModal(false);
                      }}
                      style={styles.modalCancelLux}
                    >
                      <Text style={styles.modalCancelText}>Go Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowAddressModal(false);
                        handleCheckout();
                      }}
                      style={styles.modalConfirmLux}
                    >
                      <LinearGradient colors={GRADIENTS.primary} style={styles.modalConfirmGradient}>
                        <Text style={styles.modalConfirmText}>Confirm Order</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animatable.View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* SUCCESS MODAL */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.successOverlay}>
            <Animatable.View
              animation="zoomIn"
              duration={400}
              style={styles.successCard}
            >
              <LinearGradient
                colors={['#EBF8F1', '#FFFFFF']}
                style={styles.successGradient}
              >
                <Animatable.View
                  animation="bounceIn"
                  delay={400}
                  style={styles.successIconCircle}
                >
                  <Ionicons name="checkmark-done" size={40} color={FLORAL_COLORS.primary} />
                </Animatable.View>

                <Text style={styles.successTitle}>Order Placed!</Text>
                <Text style={styles.successSubtitle}>
                  Thank you for your purchase. Your order has been successfully recorded.
                </Text>

                <TouchableOpacity
                  style={styles.successButton}
                  onPress={goToHistory}
                >
                  <LinearGradient
                    colors={GRADIENTS.primary}
                    style={styles.successButtonGradient}
                  >
                    <Text style={styles.successButtonText}>View History</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.successSecondaryButton}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push("/client");
                  }}
                >
                  <Text style={styles.successSecondaryText}>Continue Shopping</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animatable.View>
          </View>
        </Modal>

        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/client')}>
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(item) => String(item.id ?? item._id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const currentPrice = item.finalPrice || item.price;
              const lineTotal = currentPrice * item.quantity;
              const isPromo = item.discount > 0;

              return (
                <Animatable.View animation="fadeInUp" delay={index * 100} style={styles.cartCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(item.id ?? item._id)}>
                      <Ionicons name="close-circle-outline" size={24} color={FLORAL_COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardMid}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.itemPrice}>{currentPrice} DHS</Text>
                      {isPromo && <Text style={styles.oldPrice}>{item.price} DHS</Text>}
                    </View>

                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        onPress={() => changeQuantity(item.id ?? item._id, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => changeQuantity(item.id ?? item._id, item.quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>{lineTotal.toFixed(2)} DHS</Text>
                  </View>
                </Animatable.View>
              );
            }}
          />
        )}

        {/* FOOTER - Matches Image 2 */}
        {cart.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{getTotal().toFixed(2)} DHS</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={handleCheckout}
              disabled={loading}
            >
              <LinearGradient colors={GRADIENTS.primary} style={styles.checkoutGradient}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.checkoutText}>Checkout</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  headerBtn: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A202C',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 10,
  },
  cartCard: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A202C',
  },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4A785D',
  },
  oldPrice: {
    fontSize: 14,
    color: '#718096',
    textDecorationLine: 'line-through',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 15,
    color: '#1A202C',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A202C',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 20,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#718096',
  },
  grandTotalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A202C',
  },
  checkoutBtn: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  checkoutGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  checkoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A202C',
    marginTop: 20,
    marginBottom: 20,
  },
  shopNowBtn: {
    backgroundColor: '#4A785D',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  shopNowText: {
    color: 'white',
    fontWeight: '800',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 35,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 25,
  },
  modalHeaderIcon: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalIcon: {
    marginRight: 12,
  },
  modalInputLux: {
    flex: 1,
    height: 55,
    fontSize: 15,
    color: '#1A202C',
    fontWeight: '600',
  },
  modalActionsLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  modalCancelLux: {
    flex: 1,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  modalConfirmLux: {
    flex: 2,
    height: 55,
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  shippingButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // SUCCESS MODAL STYLES
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  successGradient: {
    padding: 30,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: FLORAL_COLORS.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: FLORAL_COLORS.primary,
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 16,
    color: FLORAL_COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  successButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  successButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  successSecondaryButton: {
    paddingVertical: 10,
  },
  successSecondaryText: {
    color: FLORAL_COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
