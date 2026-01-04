import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  FlatList,
  StatusBar
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../src/services/firebase";

// Install these packages: expo-blur, react-native-animatable
// npm install expo-blur react-native-animatable
import * as Animatable from 'react-native-animatable';

import api, { API_BASE_URL } from "../../src/api/axios";
import AddProduct from "./add-product";
import { COLORS, SIZES, SHADOWS } from "../../src/theme";
import GlassCard from "../../src/components/GlassCard";
import ConfirmModal from "../../src/components/ConfirmModal";
import SuccessModal from "../../src/components/SuccessModal";
import { signOut } from "firebase/auth";

const { width, height } = Dimensions.get('window');

const TABS = {
  DASHBOARD: "dashboard",
  PRODUCTS: "products",
  ORDERS: "orders",
  PROMOTIONS: "promotions",
  NOTIFICATIONS: "notifications",
};

const normalizeStatus = (s) => {
  if (!s) return 'pending';
  const low = s.toLowerCase().replace(/[^a-z]/g, '');
  if (low === 'validated' || low === 'validee') return 'validated';
  if (low === 'shipped' || low === 'expediee') return 'shipped';
  if (low === 'delivered' || low === 'livree') return 'delivered';
  if (low === 'pending' || low === 'enattente') return 'pending';
  return low;
};

const getStatusColor = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case 'pending': return { bg: '#FEF3C7', text: '#B45309' }; // Amber/Warning
    case 'validated': return { bg: '#E0F2FE', text: '#0284C7' }; // Blue/Info
    case 'shipped': return { bg: '#FFEDD5', text: '#EA580C' }; // Orange/Action
    case 'delivered': return { bg: '#DCFCE7', text: '#16A34A' }; // Green/Success
    default: return { bg: '#F1F5F9', text: '#64748B' };
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
  }).format(amount).replace('MAD', 'DHS');
};

// --- PURE FLORAL THEME ---
const FLORAL_COLORS = {
  background: ['#FDFCFB', '#F7F9F7'],
  surface: '#FFFFFF',
  primary: '#4A785D', // Sage Green
  secondary: '#8AA682', // Soft Moss
  accent: '#D4AF37', // Botanical Gold
  text: '#1A202C', // Dark Slate
  textDim: '#718096',
  border: '#EDF2F7',
  shadow: 'rgba(0, 0, 0, 0.05)',
  success: '#38A169',
  warning: '#ECC94B',
  danger: '#E53E3E',
};

const GRADIENTS = {
  primary: ['#4A785D', '#3D634D'],
  sage: ['#F0F7F3', '#E6EDE9'],
  white: ['#FFFFFF', '#F8FAFC'],
  gold: ['#D4AF37', '#B8860B'],
};

export default function PrestataireDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const scrollY = useRef(new Animated.Value(0)).current;

  const onHandleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("uid");
      router.replace("/auth/Login");
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Erreur", "Impossible de se déconnecter");
    }
  };
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  // Data State
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ sales: 0, orders: 0, pending: 0, products: 0 });
  const [userName, setUserName] = useState("Fleuriste");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-refresh
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // 1. Fetch User Name immediately (independent of API)
      const currentUser = auth.currentUser;
      let uid = currentUser?.uid;

      if (!uid) {
        uid = await AsyncStorage.getItem("uid");
      }

      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");

      console.log("Dashboard: Fetching data for UID:", uid, "Role:", role);

      if (uid) {
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("Dashboard: User data found:", userData);
            const name = userData.fullName || userData.displayName || (userData.email ? userData.email.split('@')[0] : "Maha");
            setUserName(name);
          } else {
            console.log("Dashboard: User doc not found in Firestore");
            setUserName("Maha");
          }
        } catch (fsErr) {
          console.error("Dashboard: Firestore error:", fsErr);
          setUserName("Maha");
        }
      }

      let realProducts = [];
      let realOrders = [];
      let realPromos = [];
      let realNotifs = [];

      try {
        const prodRes = await api.get("/prestataire/products");
        realProducts = prodRes.data?.data || prodRes.data || [];
        console.log(`Dashboard: ${realProducts.length} products loaded`);
      } catch (pErr) {
        console.error("Dashboard: Products API failed:", pErr.message);
        if (pErr.response?.status === 500) {
          console.error("Dashboard: 500 Error at /prestataire/products. Check backend console.");
        }
      }

      try {
        const ordRes = await api.get("/prestataire/orders");
        realOrders = ordRes.data?.data || ordRes.data || [];
        console.log(`Dashboard: ${realOrders.length} orders loaded`);
      } catch (oErr) {
        console.error("Dashboard: Orders API failed:", oErr.message);
      }

      try {
        const promoRes = await api.get("/prestataire/promotions");
        realPromos = promoRes.data?.data || promoRes.data || [];
        console.log(`Dashboard: ${realPromos.length} promotions loaded`);
      } catch (pErr) {
        console.error("Dashboard: Promotions API failed:", pErr.message);
      }

      // 4. Fetch Notifications (Authorized)
      const isPrestataire = role?.trim().toLowerCase() === "prestataire";
      if (token && isPrestataire) {

        // 4.1 Unread Count
        try {
          const notifRes = await api.get("/notifications/unread-count");
          setUnreadCount(notifRes.data?.count || 0);
        } catch (nErr) {
          // ignore
        }

        // 4.2 Full List
        try {
          const notifListRes = await api.get(`/notifications?_t=${Date.now()}`);
          realNotifs = notifListRes.data?.data || notifListRes.data || [];
        } catch (nErr) {
          // ignore
        }
      }

      setProducts(realProducts);
      setOrders(realOrders);
      setPromotions(realPromos);

      // 🛠️ FRONTEND DEBUG: If still zero, add a fake one to test UI
      if (realNotifs.length === 0) {
        console.log("Dashboard: No notifications from API, adding frontend test...");
        realNotifs = [{
          id: "debug-1",
          title: "Test de Visualisation",
          message: "Si vous voyez ceci, l'affichage fonctionne. Le système attend de nouvelles alertes du serveur.",
          type: "Info",
          isRead: false,
          createdAt: new Date().toISOString()
        }];
      }

      setNotifications(realNotifs);

      // Calc Stats
      const totalSales = realOrders.reduce((sum, o) => sum + (o.totalAmount || o.totalPrice || 0), 0);
      const pendingCount = realOrders.filter(o =>
        normalizeStatus(o.status) === 'pending' ||
        normalizeStatus(o.status) === 'enattente'
      ).length;

      setStats({
        sales: totalSales,
        orders: realOrders.length,
        pending: pendingCount,
        products: realProducts.length,
        promotions: realPromos.length
      });

    } catch (err) {
      console.error('Dashboard: unexpected error in loadData:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // 🔄 REAL-TIME POLLING (30 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");
      const isPrestataire = role?.trim().toLowerCase() === "prestataire";

      if (token && isPrestataire) {
        console.log("Dashboard: Auto-refreshing data...");
        loadData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Status Actions
  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/prestataire/orders/${orderId}`, { status: newStatus });
      setSuccessMsg(`Commande mise à jour: ${newStatus}`);
      setShowSuccessModal(true);
      loadData();
    } catch (err) {
      console.error("Status Update Failed:", err);
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
    }
  };

  const markNotificationRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.put(`/notifications/${id}/read`);
      // Refresh count
      const notifRes = await api.get("/notifications/unread-count");
      setUnreadCount(notifRes.data?.count || 0);
    } catch (err) {
      console.error("Mark Read failed:", err);
    }
  };

  const traiterCommande = (o) => updateStatus(o.id, "Validated");
  const expédierCommande = (o) => updateStatus(o.id, "Shipped");
  const livrerCommande = (o) => updateStatus(o.id, "Delivered");

  // Actions RESTORED
  const openEdit = (p) => {
    router.push({
      pathname: "/prestataire/edit-product",
      params: { product: JSON.stringify(p) }
    });
  };

  const goToPromote = (p) => {
    router.push({
      pathname: "/prestataire/add-promotion",
      params: { productId: p.id }
    });
  };

  const deleteProduct = (p) => {
    setProductToDelete(p);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/prestataire/products/${productToDelete.id}`);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      setSuccessMsg("Produit supprimé avec succès");
      setShowSuccessModal(true);
      loadData();
    } catch (err) {
      Alert.alert("Erreur", "Impossible de supprimer le produit");
    }
  };


  // --- RENDERERS ---

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <Animatable.View animation="fadeInLeft" duration={800}>
        <Text style={styles.greetingHeader}>Bonjour,</Text>
        <Text style={styles.userNameHeader}>{userName}</Text>
      </Animatable.View>
      <Animatable.View animation="fadeInRight" duration={800}>
        <TouchableOpacity
          style={styles.notifBadge}
          onPress={() => setActiveTab(TABS.NOTIFICATIONS || "notifications")}
        >
          <Feather name="bell" size={20} color={FLORAL_COLORS.primary} />
          {unreadCount > 0 && (
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animatable.View>
    </Animated.View>
  );

  const StatCard = ({ title, value, icon, index }) => (
    <Animatable.View
      animation="fadeInUp"
      duration={1000}
      delay={index * 150}
      style={styles.statCardWrapper}
    >
      <View style={styles.floralCard}>
        <View style={styles.statIconCircle}>
          {icon}
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValueLux}>{value}</Text>
          <Text style={styles.statLabelLux}>{title}</Text>
        </View>
      </View>
    </Animatable.View>
  );

  const renderDashboard = () => (
    <Animated.ScrollView
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
          colors={['#fff']}
        />
      }
    >
      {renderHeader()}

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.statsGrid}>
          <StatCard
            title="Chiffre d'Affaires"
            value={formatCurrency(stats.sales)}
            icon={<Feather name="trending-up" size={18} color={FLORAL_COLORS.primary} />}
            index={0}
          />
          <StatCard
            title="Commandes"
            value={stats.orders}
            icon={<Feather name="shopping-bag" size={18} color={FLORAL_COLORS.primary} />}
            index={1}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            title="Promotions"
            value={stats.promotions}
            icon={<Feather name="tag" size={18} color={FLORAL_COLORS.primary} />}
            index={2}
          />
          <StatCard
            title="Produits"
            value={stats.products}
            icon={<Feather name="box" size={18} color={FLORAL_COLORS.primary} />}
            index={3}
          />
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.recentOrdersContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Commandes Récentes</Text>
          <TouchableOpacity
            onPress={() => setActiveTab(TABS.ORDERS)}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAll}>Voir tout</Text>
            <Feather name="chevron-right" size={16} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={orders.slice(0, 5)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
          renderItem={({ item: order, index }) => (
            <Animatable.View
              animation="fadeInRight"
              duration={600}
              delay={index * 150}
              style={styles.orderCardWrapper}
            >
              <View style={styles.floralCard}>
                <View style={styles.orderHeaderMini}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status).text }]} />
                  <Text style={styles.orderIdLuxMini}>#{order.id}</Text>
                </View>
                <Text style={styles.customerNameLuxMini} numberOfLines={1}>
                  {order.customerName || "Client"}
                </Text>
                <Text style={styles.orderAmountLuxMini}>{formatCurrency(order.totalAmount || 0)}</Text>
              </View>
            </Animatable.View>
          )}
          keyExtractor={(order) => order.id.toString()}
        />
      </View>

      {/* Top Products */}
      {products.length > 0 && (
        <View style={styles.topProductsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits Populaires</Text>
            <TouchableOpacity
              onPress={() => setActiveTab(TABS.PRODUCTS)}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAll}>Voir tout</Text>
              <Feather name="chevron-right" size={16} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {products.slice(0, 4).map((product, index) => (
              <Animatable.View
                key={product.id}
                animation="fadeInUp"
                duration={600}
                delay={index * 100}
                style={styles.topProductCard}
              >
                <TouchableOpacity onPress={() => openEdit(product)}>
                  <Image
                    source={{ uri: product.imageUrl ? `${API_BASE_URL}${product.imageUrl}` : 'https://images.unsplash.com/photo-1557090495-fc9312e77b28?w=400' }}
                    style={styles.topProductImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.productGradient}
                  >
                    <Text style={styles.topProductName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.topProductPrice}>{formatCurrency(product.price)}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.ScrollView>
  );

  const renderProducts = () => (
    <View style={{ flex: 1 }}>
      <BlurView intensity={90} style={styles.tabHeaderBlur}>
        <View style={styles.tabHeader}>
          <View>
            <Text style={styles.tabTitle}>Mes Produits</Text>
            <Text style={styles.tabSubtitle}>{products.length} produits actifs</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtnLarge}
            onPress={() => setShowAddProduct(true)}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>

      <FlatList
        data={products}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FLORAL_COLORS.primary}
          />
        }
        renderItem={({ item: product, index }) => (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={index * 100}
            style={styles.productCardWrapper}
          >
            <TouchableOpacity onPress={() => openEdit(product)}>
              <View style={[styles.floralCard, { padding: 0 }]}>
                <Image
                  source={{ uri: product.imageUrl ? `${API_BASE_URL}${product.imageUrl}` : 'https://images.unsplash.com/photo-1557090495-fc9312e77b28?w=400' }}
                  style={styles.productImageLux}
                />
                <View style={styles.productInfoLux}>
                  <Text style={styles.productNameLux} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productPriceLux}>{formatCurrency(product.price)}</Text>
                  <View style={styles.productFooterLux}>
                    <View style={styles.stockBadgeLux}>
                      <Text style={styles.stockTextLux}>{product.stock} en stock</Text>
                    </View>
                    <View style={styles.productActionsRow}>
                      <TouchableOpacity
                        onPress={() => deleteProduct(product)}
                        style={styles.deleteBtnLux}
                      >
                        <Feather name="trash-2" size={14} color={FLORAL_COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animatable.View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );

  const renderOrders = () => (
    <View style={{ flex: 1 }}>
      <BlurView intensity={90} style={styles.tabHeaderBlur}>
        <View style={styles.tabHeader}>
          <View>
            <Text style={styles.tabTitle}>Commandes</Text>
            <Text style={styles.tabSubtitle}>{orders.length} commandes totales</Text>
          </View>
          <View style={styles.filterContainer}>
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="filter" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <FlatList
        data={orders}
        contentContainerStyle={styles.ordersListContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FLORAL_COLORS.primary}
          />
        }
        renderItem={({ item: order, index }) => (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={index * 50}
            style={styles.orderItemWrapper}
          >
            <View style={styles.floralCard}>
              <View style={styles.orderHeaderLux}>
                <View>
                  <Text style={styles.orderIdLux}>COMMANDE #{order.id}</Text>
                  <Text style={styles.orderDateLux}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadgeLux, { backgroundColor: getStatusColor(order.status).bg }]}>
                  <Text style={[styles.statusTextLux, { color: getStatusColor(order.status).text }]}>
                    {(order.status || "").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderCustomerLux}>
                <View style={styles.avatarLux}>
                  <Text style={styles.avatarTextLux}>{(order.customerName || "C").charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.customerNameLux}>{order.customerName || "Client"}</Text>
                  <Text style={styles.customerEmailLux}>{order.customerEmail || "No Email"}</Text>
                </View>
              </View>

              <View style={styles.orderFooterLux}>
                <Text style={styles.orderTotalLux}>{formatCurrency(order.totalAmount || order.totalPrice || 0)}</Text>
                <View style={styles.orderActionsLux}>
                  {normalizeStatus(order.status) === 'pending' ? (
                    <TouchableOpacity
                      style={[styles.actionBtnLux, { backgroundColor: FLORAL_COLORS.primary }]}
                      onPress={() => traiterCommande(order)}
                    >
                      <Text style={styles.actionBtnTextLux}>VALIDER</Text>
                    </TouchableOpacity>
                  ) : normalizeStatus(order.status) === 'validated' ? (
                    <TouchableOpacity
                      style={[styles.actionBtnLux, { backgroundColor: '#B45309' }]} // Brown/Orange
                      onPress={() => expédierCommande(order)}
                    >
                      <Text style={styles.actionBtnTextLux}>EXPÉDIER</Text>
                    </TouchableOpacity>
                  ) : normalizeStatus(order.status) === 'shipped' ? (
                    <TouchableOpacity
                      style={[styles.actionBtnLux, { backgroundColor: FLORAL_COLORS.success }]}
                      onPress={() => livrerCommande(order)}
                    >
                      <Text style={styles.actionBtnTextLux}>LIVRER</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.completedBadgeLux}>
                      <Ionicons name="checkmark-circle" size={16} color={FLORAL_COLORS.success} />
                      <Text style={styles.completedTextLux}>TERMINÉ</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animatable.View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );

  const renderPromotions = () => (
    <View style={{ flex: 1 }}>
      <BlurView intensity={90} style={styles.tabHeaderBlur}>
        <View style={styles.tabHeader}>
          <View>
            <Text style={styles.tabTitle}>Promotions</Text>
            <Text style={styles.tabSubtitle}>{promotions.length} offres actives</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtnLarge}
            onPress={() => router.push("/prestataire/add-promotion")}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.addBtnGradient}
            >
              <Feather name="gift" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>

      <FlatList
        data={promotions}
        contentContainerStyle={styles.ordersListContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FLORAL_COLORS.primary}
          />
        }
        renderItem={({ item: promo, index }) => (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={index * 50}
            style={styles.orderItemWrapper}
          >
            <View style={styles.floralCard}>
              <View style={styles.orderHeaderLux}>
                <View>
                  <View style={styles.promoCodeBadge}>
                    <Text style={styles.promoCodeText}>{promo.code}</Text>
                  </View>
                  <Text style={styles.promoNameLux}>{promo.productName}</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{promo.discount}%</Text>
                </View>
              </View>

              <View style={styles.promoDetailsRow}>
                <View style={styles.promoDetailItem}>
                  <Feather name="calendar" size={14} color={FLORAL_COLORS.textDim} />
                  <Text style={styles.promoDetailText}>
                    Jusqu'au {new Date(promo.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.promoDetailItem}>
                  <Feather name="bar-chart-2" size={14} color={FLORAL_COLORS.textDim} />
                  <Text style={styles.promoDetailText}>
                    {promo.usageCount} utilisations
                  </Text>
                </View>
              </View>

              <View style={styles.orderFooterLux}>
                <Text style={styles.promoTitleLux}>{promo.title}</Text>
                <View style={styles.orderActionsLux}>
                  <TouchableOpacity
                    style={styles.detailsBtnLux}
                    onPress={() => {
                      router.push({
                        pathname: "/prestataire/edit-promotion",
                        params: { promotion: JSON.stringify(promo) }
                      });
                    }}
                  >
                    <Feather name="edit-2" size={14} color={FLORAL_COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animatable.View>
        )}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="tag" size={60} color={FLORAL_COLORS.border} />
            <Text style={styles.emptyText}>Aucune promotion active</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/prestataire/add-promotion")}
            >
              <Text style={styles.emptyBtnText}>Créer ma première offre</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );

  const renderNotifications = () => (
    <View style={{ flex: 1 }}>
      <BlurView intensity={90} style={styles.tabHeaderBlur}>
        <View style={styles.tabHeader}>
          <View>
            <Text style={styles.tabTitle}>Notifications</Text>
            <Text style={styles.tabSubtitle}>{unreadCount} nouvelles alertes</Text>
          </View>
        </View>
      </BlurView>

      <FlatList
        data={notifications}
        contentContainerStyle={styles.ordersListContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FLORAL_COLORS.primary}
          />
        }
        renderItem={({ item, index }) => (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={index * 50}
            style={styles.orderItemWrapper}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => !item.isRead && markNotificationRead(item.id)}
            >
              <View style={[styles.floralCard, item.isRead && { opacity: 0.7 }]}>
                <View style={styles.orderHeaderLux}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.promoNameLux, item.isRead && { color: FLORAL_COLORS.textDim }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.orderDateLux}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {!item.isRead && <View style={styles.notifDotSmall} />}
                </View>

                <Text style={[styles.promoTitleLux, { marginTop: 8, fontStyle: 'normal' }]}>
                  {item.message}
                </Text>

                <View style={styles.orderFooterLux}>
                  <Text style={styles.promoDetailText}>{item.type || 'Alerte'}</Text>
                  {!item.isRead && (
                    <Text style={{ color: FLORAL_COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                      Nouveau
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animatable.View>
        )}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={60} color={FLORAL_COLORS.border} />
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <LinearGradient
      colors={FLORAL_COLORS.background}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={{ flex: 1 }}>
        {activeTab === TABS.DASHBOARD && renderDashboard()}
        {activeTab === TABS.PRODUCTS && renderProducts()}
        {activeTab === TABS.ORDERS && renderOrders()}
        {activeTab === TABS.PROMOTIONS && renderPromotions()}
        {activeTab === TABS.NOTIFICATIONS && renderNotifications()}
      </SafeAreaView>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Supprimer le produit ?"
        message={`Êtes-vous sûr de vouloir supprimer "${productToDelete?.name}" ? Cette action est irréversible.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setProductToDelete(null);
        }}
      />

      <SuccessModal
        visible={showSuccessModal}
        title="Succès"
        message={successMsg}
        onButtonClick={() => setShowSuccessModal(false)}
      />

      {/* Modern Floating Bottom Navigation */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNavLux}>
          {Object.entries({
            [TABS.DASHBOARD]: { icon: 'grid' },
            [TABS.PRODUCTS]: { icon: 'shopping-bag' },
            [TABS.ORDERS]: { icon: 'file-text' },
            [TABS.PROMOTIONS]: { icon: 'tag' },
            [TABS.NOTIFICATIONS]: { icon: 'bell' }
          }).map(([key, { icon }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={styles.navItemLux}
            >
              <Feather
                name={icon}
                size={22}
                color={activeTab === key ? FLORAL_COLORS.primary : FLORAL_COLORS.textDim}
              />
              {activeTab === key && (
                <View style={styles.activeIndicatorLux} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.fabLux}
            onPress={() => onHandleLogout()}
          >
            <LinearGradient
              colors={['#FF4B2B', '#FF416C']} // Reddish gradient for logout
              style={styles.fabGradientLux}
            >
              <Feather name="log-out" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Modal */}
      <Modal
        visible={showAddProduct}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} style={styles.modalBlur}>
            <Animatable.View
              animation="slideInUp"
              duration={400}
              style={styles.modalContainer}
            >
              <TouchableOpacity
                style={styles.closeModal}
                onPress={() => setShowAddProduct(false)}
              >
                <BlurView intensity={20} style={styles.closeButtonLux}>
                  <Ionicons name="close" size={24} color={FLORAL_COLORS.primary} />
                </BlurView>
              </TouchableOpacity>
              <AddProduct
                onProductAdded={() => {
                  setShowAddProduct(false);
                  loadData();
                }}
                onCancel={() => setShowAddProduct(false)}
              />
            </Animatable.View>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient >
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
  },
  greetingHeader: {
    fontSize: 14,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  userNameHeader: {
    fontSize: 24,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    letterSpacing: -0.5,
  },
  notifBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FLORAL_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FLORAL_COLORS.danger,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  quickStatsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCardWrapper: {
    width: '48%',
  },
  floralCard: {
    backgroundColor: FLORAL_COLORS.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValueLux: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  statLabelLux: {
    fontSize: 11,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: FLORAL_COLORS.primary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ordersList: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  orderCardWrapper: {
    marginRight: 12,
    width: 160,
  },
  orderHeaderMini: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  orderIdLuxMini: {
    fontSize: 10,
    fontWeight: '800',
    color: FLORAL_COLORS.textDim,
    letterSpacing: 0.5,
  },
  customerNameLuxMini: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
    marginBottom: 2,
  },
  orderAmountLuxMini: {
    fontSize: 15,
    fontWeight: '800',
    color: FLORAL_COLORS.primary,
  },
  topProductsContainer: {
    marginTop: 24,
  },
  productsScroll: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  topProductCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  topProductImage: {
    width: '100%',
    height: 140,
  },
  productGradient: {
    padding: 10,
  },
  topProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
  },
  topProductPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: FLORAL_COLORS.primary,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  tabSubtitle: {
    fontSize: 13,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  addBtnLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCardWrapper: {
    width: '50%',
    padding: 8,
  },
  productImageLux: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  productInfoLux: {
    padding: 12,
  },
  productNameLux: {
    fontSize: 15,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
  },
  productPriceLux: {
    fontSize: 14,
    fontWeight: '600',
    color: FLORAL_COLORS.primary,
    marginTop: 2,
  },
  productFooterLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  productActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockBadgeLux: {
    backgroundColor: '#F0F7F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockTextLux: {
    fontSize: 10,
    color: FLORAL_COLORS.primary,
    fontWeight: '800',
  },
  deleteBtnLux: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ordersListContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  orderItemWrapper: {
    marginBottom: 16,
  },
  orderHeaderLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdLux: {
    fontSize: 10,
    fontWeight: '800',
    color: FLORAL_COLORS.textDim,
    letterSpacing: 1,
  },
  orderDateLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    marginTop: 2,
  },
  statusBadgeLux: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextLux: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderCustomerLux: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
  },
  avatarLux: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FLORAL_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTextLux: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  customerNameLux: {
    fontSize: 15,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
  },
  customerEmailLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
  },
  orderFooterLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: FLORAL_COLORS.border,
  },
  orderTotalLux: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  orderActionsLux: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnLux: {
    backgroundColor: FLORAL_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnTextLux: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  detailsBtnLux: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  bottomNavLux: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  navItemLux: {
    alignItems: 'center',
    padding: 8,
  },
  activeIndicatorLux: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FLORAL_COLORS.primary,
    marginTop: 4,
  },
  fabLux: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: FLORAL_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  fabGradientLux: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soonTextLux: {
    fontSize: 18,
    color: FLORAL_COLORS.textDim,
    fontWeight: '700',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBlur: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    marginTop: 60,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  closeButtonLux: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  promoCodeBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  promoCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: FLORAL_COLORS.warning,
    letterSpacing: 1,
  },
  promoNameLux: {
    fontSize: 16,
    fontWeight: '700',
    color: FLORAL_COLORS.text,
  },
  discountBadge: {
    backgroundColor: '#F0F7F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountText: {
    fontSize: 18,
    fontWeight: '900',
    color: FLORAL_COLORS.primary,
  },
  promoDetailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  promoDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoDetailText: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  promoTitleLux: {
    fontSize: 14,
    fontWeight: '600',
    color: FLORAL_COLORS.textDim,
    fontStyle: 'italic',
  },
  notifDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FLORAL_COLORS.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: FLORAL_COLORS.primary,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  notifDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A785D',
    marginLeft: 8,
  },
});
