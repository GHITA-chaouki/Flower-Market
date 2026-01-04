import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../src/api/axios";

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
};

const getStatusColor = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'livree' || s === 'livré') return { bg: '#F0FDF4', text: '#15803D' };
  if (s === 'enattente') return { bg: '#FFFBEB', text: '#B45309' };
  if (s === 'annule' || s === 'annulé') return { bg: '#FEF2F2', text: '#B91C1C' };
  return { bg: '#EFF6FF', text: '#1D4ED8' };
};

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      console.log("Fetching orders from /market/my-orders...");
      const res = await api.get("/market/my-orders");
      console.log("Orders received:", res.data?.data?.length || 0);
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // auto-rafraîchissement toutes les 10s pour voir les mises à jour de statut
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <LinearGradient colors={FLORAL_COLORS.background} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* HEADER */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.headerLux}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLux}>
            <Ionicons name="chevron-back" size={24} color={FLORAL_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLux}>History</Text>
          <TouchableOpacity onPress={load} style={styles.refreshBtnLux}>
            <Feather name="refresh-cw" size={20} color={FLORAL_COLORS.primary} />
          </TouchableOpacity>
        </Animatable.View>

        {loading && orders.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={FLORAL_COLORS.primary} />
          </View>
        ) : orders.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={60} color={FLORAL_COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No History</Text>
            <Text style={styles.emptySub}>You haven't placed any orders yet. Your future bouquets will appear here!</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/client/products')}>
              <Text style={styles.shopBtnText}>Go to Shop</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(o) => String(o.id ?? o._id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const statusStyle = getStatusColor(item.status);
              const totalAmount = item.totalPrice ?? item.totalAmount ?? item.total;
              return (
                <Animatable.View animation="fadeInUp" delay={index * 100} style={styles.cardLux}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openOrderModal(item)}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.orderIdLux}>Order #{item.id}</Text>
                        <Text style={styles.dateLux}>{new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <View style={[styles.statusBadgeLux, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusTextLux, { color: statusStyle.text }]}>{item.status?.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.productRowLux}>
                      <View style={styles.productIconWrap}>
                        <MaterialCommunityIcons name="flower" size={20} color={FLORAL_COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productNameLux} numberOfLines={1}>{item.productName}</Text>
                        <Text style={styles.storeNameLux}>{item.storeName}</Text>
                      </View>
                      <View style={styles.qteBadge}>
                        <Text style={styles.qteText}>x{item.quantity}</Text>
                      </View>
                    </View>

                    <View style={styles.cardFooterLux}>
                      <Text style={styles.totalLabelLux}>Total Paid</Text>
                      <Text style={styles.totalValueLux}>{totalAmount} DHS</Text>
                    </View>

                    <View style={styles.detailsBtnLux}>
                      <Text style={styles.detailsBtnText}>View Details</Text>
                      <Ionicons name="arrow-forward" size={16} color={FLORAL_COLORS.primary} />
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              );
            }}
          />
        )}

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalBg}>
            <Animatable.View animation="zoomIn" duration={400} style={styles.modalLux}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitleLux}>Order Details</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedOrder(null); }}>
                  <Ionicons name="close" size={24} color={FLORAL_COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Items</Text>
                  {selectedOrder && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((it, idx) => (
                      <View key={idx} style={styles.modalItemRow}>
                        <Text style={styles.modalItemName}>{it.name || it.productName} <Text style={{ fontWeight: '400' }}>x {it.quantity}</Text></Text>
                        <Text style={styles.modalItemPrice}>{it.price ? `${it.price} DHS` : ''}</Text>
                      </View>
                    ))
                  ) : selectedOrder ? (
                    <View style={styles.modalItemRow}>
                      <Text style={styles.modalItemName}>{selectedOrder.productName} <Text style={{ fontWeight: '400' }}>x {selectedOrder.quantity}</Text></Text>
                    </View>
                  ) : null}
                </View>

                {selectedOrder?.shippingAddress && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Shipping</Text>
                    <View style={styles.infoBoxLux}>
                      <Ionicons name="location-outline" size={18} color={FLORAL_COLORS.primary} />
                      <Text style={styles.infoTextLux}>{selectedOrder.shippingAddress}</Text>
                    </View>
                  </View>
                )}

                {selectedOrder?.customerPhone && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Customer Contact</Text>
                    <View style={styles.infoBoxLux}>
                      <Ionicons name="call-outline" size={18} color={FLORAL_COLORS.primary} />
                      <Text style={styles.infoTextLux}>{selectedOrder.customerPhone}</Text>
                    </View>
                  </View>
                )}

                {selectedOrder?.paymentMethod && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Payment Method</Text>
                    <View style={styles.infoBoxLux}>
                      <Ionicons
                        name={selectedOrder.paymentMethod === 'Card' ? "card-outline" : "cash-outline"}
                        size={18}
                        color={FLORAL_COLORS.primary}
                      />
                      <Text style={styles.infoTextLux}>{selectedOrder.paymentMethod}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.getReceiptBtnLux}
                  onPress={() => {
                    if (!selectedOrder) return;

                    const orderSummary = {
                      id: selectedOrder.id,
                      items: selectedOrder.items || [{
                        name: selectedOrder.productName,
                        price: (selectedOrder.totalPrice / selectedOrder.quantity),
                        quantity: selectedOrder.quantity
                      }],
                      total: selectedOrder.totalPrice,
                      address: selectedOrder.shippingAddress,
                      phone: selectedOrder.customerPhone,
                      method: selectedOrder.paymentMethod,
                      date: selectedOrder.createdAt
                    };

                    setModalVisible(false);
                    router.push({
                      pathname: "/client/receipt",
                      params: { orderData: JSON.stringify(orderSummary) }
                    });
                  }}
                >
                  <Ionicons name="receipt-outline" size={18} color={FLORAL_COLORS.accent} />
                  <Text style={styles.getReceiptTextLux}>Download Receipt</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setModalVisible(false); setSelectedOrder(null); }}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.modalCloseGradient}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </Modal>
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
  refreshBtnLux: {
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
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  cardLux: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  orderIdLux: {
    fontSize: 18,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  dateLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadgeLux: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusTextLux: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardDivider: {
    height: 1,
    backgroundColor: FLORAL_COLORS.border,
    marginBottom: 15,
  },
  productRowLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  productIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNameLux: {
    fontSize: 15,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  storeNameLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  qteBadge: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qteText: {
    fontSize: 12,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  cardFooterLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDFCFB',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  totalLabelLux: {
    fontSize: 13,
    color: FLORAL_COLORS.textDim,
    fontWeight: '700',
  },
  totalValueLux: {
    fontSize: 17,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  detailsBtnLux: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: FLORAL_COLORS.primary,
  },
  emptyState: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDFCFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: FLORAL_COLORS.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  shopBtn: {
    backgroundColor: FLORAL_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  shopBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalLux: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleLux: {
    fontSize: 22,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: FLORAL_COLORS.textDim,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: FLORAL_COLORS.primary,
  },
  infoBoxLux: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFCFB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
    gap: 12,
  },
  infoTextLux: {
    flex: 1,
    fontSize: 14,
    color: FLORAL_COLORS.text,
    lineHeight: 20,
  },
  modalCloseBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalCloseGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  getReceiptBtnLux: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.accent,
    backgroundColor: '#FFFCF0',
  },
  getReceiptTextLux: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.accent,
  },
});