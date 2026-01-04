import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Animated,
  StatusBar,
  TextInput,
  Alert,
  Platform,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from 'expo-blur';
import * as Animatable from 'react-native-animatable';
import api, { API_BASE_URL } from "../../src/api/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../../src/theme";
import GlassCard from "../../src/components/GlassCard";

// 🔥 FIREBASE
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../src/services/firebase";

const { width, height } = Dimensions.get("window");

// --- PURE FLORAL THEME (Matching Prestataire) ---
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

const TABS = {
  DASHBOARD: "dashboard",
  CLIENTS: "clients",
  PRESTATAIRES: "prestataires",
  PRODUITS: "products",
  COMMANDES: "orders",
  NOTIFICATIONS: "notifications",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);

  // Data State
  const [clients, setClients] = useState([]);
  const [prestataires, setPrestataires] = useState([]);
  const [pendingPrestataires, setPendingPrestataires] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductPrestataire, setSelectedProductPrestataire] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;

  /* ===================== DATA LOADING ===================== */
  const loadData = async () => {
    const token = await AsyncStorage.getItem("token");
    const role = await AsyncStorage.getItem("role");

    // NEW: Role-Guard to prevent unauthorized polling
    const isAdmin = role?.trim().toLowerCase() === "admin";
    if (!token || !isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Users from Firestore
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(users.filter(u => u.role === "Client"));
      setPrestataires(users.filter(u => u.role === "Prestataire" && u.isApproved));
      setPendingPrestataires(users.filter(u => u.role === "Prestataire" && !u.isApproved));

      // 2. Products from Backend
      try {
        const prodRes = await api.get("/admin/products");
        setProducts(prodRes.data.data || []);
      } catch (e) { console.log("Prod Error", e); }

      // 3. Orders from Backend
      try {
        const ordRes = await api.get("/admin/orders");
        setOrders(ordRes.data.data || []);
      } catch (e) { console.log("Ord Error", e); }

      // 4. Notifications
      try {
        const notifRes = await api.get("/notifications/unread-count");
        setUnreadCount(notifRes.data?.count || 0);

        const notifListRes = await api.get("/notifications");
        const realNotifs = notifListRes.data?.data || notifListRes.data || [];
        setNotifications(realNotifs);
        console.log(`AdminDashboard: ${realNotifs.length} notifications loaded`);
      } catch (nErr) {
        console.error("AdminDashboard: Notifications API failed:", nErr.message);
      }

    } catch (e) {
      console.error("Load Error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // 🔄 REAL-TIME POLLING (15 seconds)
    const interval = setInterval(() => {
      console.log("AdminDashboard: Auto-refreshing data...");
      loadData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const approvePrestataire = async (uid) => {
    await updateDoc(doc(db, "users", uid), { isApproved: true });
    loadData();
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/auth/Login");
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Erreur", "Impossible de se déconnecter.");
    }
  };

  /* ===================== RENDER HELPERS ===================== */
  const getUniquePrestataires = (items) =>
    [...new Set(items.map(i => i.prestataireName).filter(Boolean))];

  const filteredClients = clients.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrestataires = prestataires.filter(p =>
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedProductPrestataire ? p.prestataireName === selectedProductPrestataire : true;
    return matchesSearch && matchesFilter;
  });

  const filteredOrders = orders.filter(o =>
    o.id.toString().includes(searchQuery) ||
    (o.productName && o.productName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIconName = (route) => {
    switch (route) {
      case TABS.DASHBOARD: return "grid";
      case TABS.CLIENTS: return "people";
      case TABS.PRESTATAIRES: return "storefront";
      case TABS.PRODUITS: return "cube";
      case TABS.COMMANDES: return "receipt";
      case TABS.NOTIFICATIONS: return "notifications";
      default: return "grid";
    }
  };

  /* ===================== SCREENS ===================== */

  /* ===================== RENDER HELPERS ===================== */
  const renderHeader = () => (
    <View style={styles.headerLux}>
      <Animatable.View animation="fadeInLeft" duration={800}>
        <Text style={styles.dateLux}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={styles.welcomeLux}>Bonjour, Admin 👋</Text>
      </Animatable.View>
      <Animatable.View animation="fadeInRight" duration={800}>
        <TouchableOpacity style={styles.profileBtnLux} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={FLORAL_COLORS.primary} />
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );

  // 1. DASHBOARD HOME
  const renderDashboard = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {renderHeader()}

      {/* Hero Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollLux}
      >
        <StatCard
          title="Ventes Totales"
          value={`${orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)} DHS`}
          icon="wallet"
          index={0}
        />
        <StatCard
          title="Commandes"
          value={orders.length}
          icon="receipt"
          index={1}
        />
        <StatCard
          title="Clients"
          value={clients.length}
          icon="people"
          index={2}
        />
      </ScrollView>

      {/* Action Center - Pending Approvals */}
      {pendingPrestataires.length > 0 && (
        <View style={styles.actionSectionLux}>
          <Text style={styles.sectionTitleLux}>⚠️ Actions requises</Text>
          {pendingPrestataires.map(p => (
            <GlassCard key={p.id} style={styles.pendingCardLux}>
              <View style={styles.pendingInfoLux}>
                <View style={styles.iconBoxWarningLux}>
                  <Ionicons name="storefront" size={24} color={FLORAL_COLORS.accent} />
                </View>
                <View>
                  <Text style={styles.cardTitleLux}>{p.fullName}</Text>
                  <Text style={styles.cardSubLux}>{p.email}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.approveBtnLux}
                onPress={() => approvePrestataire(p.id)}
              >
                <LinearGradient colors={GRADIENTS.primary} style={styles.approveGradientLux}>
                  <Text style={styles.approveTextLux}>Approuver</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          ))}
        </View>
      )}

      {/* Recent Orders Preview */}
      <View style={styles.sectionHeaderLux}>
        <Text style={styles.sectionTitleLux}>Commandes Récentes</Text>
        <TouchableOpacity onPress={() => setActiveTab(TABS.COMMANDES)}>
          <Text style={styles.seeAllLux}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        {orders.slice(0, 5).map(order => (
          <GlassCard key={order.id} style={styles.miniOrderCardLux}>
            <View style={styles.miniOrderIconLux}>
              <Ionicons name="bag-handle" size={20} color={FLORAL_COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniOrderTitleLux}>{order.productName}</Text>
              <Text style={styles.miniOrderSubLux}>{order.prestataireName || "Inconnu"}</Text>
            </View>
            <Text style={styles.miniOrderPriceLux}>{order.totalPrice} DHS</Text>
          </GlassCard>
        ))}
      </View>

    </ScrollView>
  );

  // 2. LIST RENDERING (Generic)
  const renderListScreen = (title, data, renderItem, searchPlaceholder = "Rechercher...") => (
    <View style={{ flex: 1 }}>
      <View style={styles.listHeaderLux}>
        <Text style={styles.listTitleLux}>{title}</Text>
        <GlassCard style={styles.searchBarLux}>
          <Ionicons name="search" size={20} color={FLORAL_COLORS.textDim} />
          <TextInput
            style={styles.searchInputLux}
            placeholder={searchPlaceholder}
            placeholderTextColor={FLORAL_COLORS.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </GlassCard>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyStateLux}>
            <Ionicons name="search" size={64} color={FLORAL_COLORS.border} />
            <Text style={styles.emptyTextLux}>Aucun résultat trouvé</Text>
          </View>
        }
      />
    </View>
  );

  // 3. MAIN RENDER SWITCH
  const renderContent = () => {
    switch (activeTab) {
      case TABS.DASHBOARD: return renderDashboard();

      case TABS.CLIENTS: return renderListScreen("Clients", filteredClients, ({ item }) => (
        <GlassCard style={styles.listCardLux}>
          <View style={[styles.avatarLux, { backgroundColor: '#F0F7F3' }]}>
            <Text style={{ color: FLORAL_COLORS.primary, fontWeight: 'bold' }}>{item.fullName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.cardTitleLux}>{item.fullName}</Text>
            <Text style={styles.cardSubLux}>{item.email}</Text>
          </View>
        </GlassCard>
      ), "Rechercher un client...");

      case TABS.PRESTATAIRES: return renderListScreen("Prestataires", filteredPrestataires, ({ item }) => (
        <GlassCard style={styles.listCardLux}>
          <View style={[styles.avatarLux, { backgroundColor: '#FDFBE7' }]}>
            <Ionicons name="storefront" size={20} color={FLORAL_COLORS.accent} />
          </View>
          <View>
            <Text style={styles.cardTitleLux}>{item.fullName}</Text>
            <Text style={styles.cardSubLux}>{item.email}</Text>
          </View>
          <View style={styles.badgeSuccessLux}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        </GlassCard>
      ), "Rechercher un prestataire...");

      case TABS.PRODUITS: return renderListScreen("Produits", filteredProducts, ({ item }) => (
        <GlassCard style={styles.productCardLux}>
          <Image
            source={{ uri: item.imageUrl ? `${API_BASE_URL}${item.imageUrl}` : 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=500' }}
            style={styles.productImgLux}
          />
          <View style={{ flex: 1, padding: 12 }}>
            <Text style={styles.cardTitleLux} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardSubLux}>{item.prestataireName}</Text>
            <Text style={styles.cardPriceLux}>{item.price} DHS</Text>
          </View>
        </GlassCard>
      ), "Rechercher un produit...");

      case TABS.COMMANDES: return renderListScreen("Commandes", filteredOrders, ({ item }) => (
        <TouchableOpacity
          style={styles.orderCardWrapperLux}
          onPress={() => setSelectedOrder(item)}
        >
          <GlassCard style={styles.orderCardLux}>
            <View style={styles.orderHeaderLux}>
              <Text style={styles.orderIdLux}>Commande</Text>
              <View style={styles.statusBadgeLux}>
                <Text style={styles.statusTextLux}>PAYÉE</Text>
              </View>
            </View>
            <Text style={styles.orderProductLux}>{item.productName}</Text>
            <View style={styles.orderFooterLux}>
              <Text style={styles.orderUserLux}>{item.clientName || "Client"}</Text>
              <Text style={styles.orderPriceLux}>{item.totalPrice} DHS</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      ), "Rechercher une commande...");

      case TABS.NOTIFICATIONS: return (
        <View style={{ flex: 1 }}>
          <View style={styles.listHeaderLux}>
            <Text style={styles.listTitleLux}>Notifications</Text>
            <Text style={styles.cardSubLux}>{unreadCount} non lues</Text>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const getNotifIcon = (title) => {
                const t = title.toLowerCase();
                if (t.includes('commande') || t.includes('transaction')) return { name: 'bag-handle', color: FLORAL_COLORS.primary, bg: '#F0F7F3' };
                if (t.includes('prestataire')) return { name: 'storefront', color: FLORAL_COLORS.accent, bg: '#FDFBE7' };
                if (t.includes('client')) return { name: 'person', color: '#6366F1', bg: '#EEF2FF' };
                return { name: 'notifications', color: FLORAL_COLORS.textDim, bg: '#F8FAFC' };
              };
              const iconCfg = getNotifIcon(item.title);

              return (
                <Animatable.View
                  animation="fadeInLeft"
                  duration={600}
                  delay={index * 50}
                  style={{ marginBottom: 16 }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => !item.isRead && markNotificationRead(item.id)}
                  >
                    <GlassCard style={[styles.notifCardLux, item.isRead && { opacity: 0.7 }]}>
                      <View style={styles.notifHeaderLux}>
                        <View style={[styles.notifIconBoxLux, { backgroundColor: iconCfg.bg }]}>
                          <Ionicons name={iconCfg.name} size={20} color={iconCfg.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.notifTitleLux} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.notifDateLux}>
                            {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {!item.isRead && <View style={styles.unreadDotLux} />}
                      </View>

                      <Text style={styles.notifMessageLux}>{item.message}</Text>

                      {!item.isRead && (
                        <View style={styles.notifActionRowLux}>
                          <View style={styles.markReadIndicatorLux}>
                            <Ionicons name="checkmark-circle" size={14} color={FLORAL_COLORS.primary} />
                            <Text style={styles.markReadTextLux}>Cliquer pour marquer comme lu</Text>
                          </View>
                        </View>
                      )}
                    </GlassCard>
                  </TouchableOpacity>
                </Animatable.View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyStateLux}>
                <Ionicons name="notifications-off" size={64} color={FLORAL_COLORS.border} />
                <Text style={styles.emptyTextLux}>Aucune notification</Text>
              </View>
            }
          />
        </View>
      );

      default: return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {renderContent()}
      </SafeAreaView>

      {/* FLOATING BOTTOM NAV */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNavLux}>
          {Object.entries(TABS).map(([key, route]) => (
            <TouchableOpacity
              key={key}
              style={styles.navItemLux}
              onPress={() => {
                setActiveTab(route);
                setSearchQuery("");
              }}
            >
              <Ionicons
                name={activeTab === route ? getIconName(route) : getIconName(route) + "-outline"}
                size={24}
                color={activeTab === route ? FLORAL_COLORS.primary : FLORAL_COLORS.textDim}
              />
              {activeTab === route && <View style={styles.activeIndicatorLux} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* MODAL */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlayLux}>
          <BlurView intensity={30} tint="dark" style={styles.modalBlurLux}>
            <View style={styles.modalContentLux}>
              <View style={styles.modalHeaderLux}>
                <Text style={styles.modalTitleLux}>Détails Commande</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtnLux}>
                  <Ionicons name="close" size={24} color={FLORAL_COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <GlassCard style={styles.modalCardLux}>
                  <View style={styles.detailRowLux}>
                    <Text style={styles.labelLux}>Numéro de commande</Text>
                    <Text style={styles.valueLux}>#{selectedOrder?.id}</Text>
                  </View>
                  <View style={styles.detailRowLux}>
                    <Text style={styles.labelLux}>Produit</Text>
                    <Text style={styles.valueLux}>{selectedOrder?.productName}</Text>
                  </View>
                  <View style={styles.detailRowLux}>
                    <Text style={styles.labelLux}>Prix Total</Text>
                    <Text style={styles.valueLux}>{selectedOrder?.totalPrice} DHS</Text>
                  </View>
                  <View style={styles.detailRowLux}>
                    <Text style={styles.labelLux}>Boutique</Text>
                    <Text style={styles.valueLux}>{selectedOrder?.prestataireName}</Text>
                  </View>
                  <View style={styles.detailRowLux}>
                    <Text style={styles.labelLux}>Client</Text>
                    <Text style={styles.valueLux}>{selectedOrder?.clientName || "Client"}</Text>
                  </View>
                </GlassCard>

                <TouchableOpacity
                  style={styles.printBtnLux}
                  onPress={() => setSelectedOrder(null)}
                >
                  <LinearGradient colors={GRADIENTS.primary} style={styles.printGradientLux}>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={styles.printBtnTextLux}>Fermer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

/* ===================== COMPONENTS ===================== */
const StatCard = ({ title, value, icon, index }) => (
  <Animatable.View
    animation="fadeInDown"
    delay={index * 100}
    duration={800}
  >
    <GlassCard style={styles.statCardLux}>
      <View style={styles.statHeaderLux}>
        <View style={styles.statIconBoxLux}>
          <Ionicons name={icon} size={20} color={FLORAL_COLORS.primary} />
        </View>
      </View>
      <View style={styles.statContentLux}>
        <Text style={styles.statValueLux}>{value}</Text>
        <Text style={styles.statTitleLux}>{title}</Text>
      </View>
    </GlassCard>
  </Animatable.View>
);

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#FDFCFB'
  },

  // Header Lux
  headerLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  dateLux: {
    fontSize: 12,
    fontWeight: '700',
    color: FLORAL_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeLux: {
    fontSize: 26,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
    letterSpacing: -0.5,
  },
  profileBtnLux: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  // Stats Lux
  statsScrollLux: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  statCardLux: {
    width: 150,
    height: 150,
    padding: 16,
    justifyContent: 'space-between',
  },
  statHeaderLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statIconBoxLux: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 120, 93, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContentLux: {
    marginTop: 'auto',
  },
  statValueLux: {
    fontSize: 22,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
    marginBottom: 4,
  },
  statTitleLux: {
    fontSize: 12,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
  },

  // Sections Lux
  actionSectionLux: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  sectionHeaderLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleLux: {
    fontSize: 20,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  seeAllLux: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.primary,
  },

  // Cards Lux
  pendingCardLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  pendingInfoLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBoxWarningLux: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Notifications Lux
  notifCardLux: {
    padding: 18,
    borderRadius: 24,
  },
  notifHeaderLux: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifIconBoxLux: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTitleLux: {
    fontSize: 15,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  notifDateLux: {
    fontSize: 11,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
    marginTop: 1,
  },
  notifMessageLux: {
    fontSize: 14,
    color: FLORAL_COLORS.text,
    lineHeight: 20,
    opacity: 0.8,
  },
  unreadDotLux: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FLORAL_COLORS.primary,
  },
  notifActionRowLux: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  markReadIndicatorLux: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markReadTextLux: {
    fontSize: 11,
    fontWeight: '700',
    color: FLORAL_COLORS.primary,
    opacity: 0.8,
  },
  cardTitleLux: {
    fontSize: 16,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  cardSubLux: {
    fontSize: 13,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  approveBtnLux: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  approveGradientLux: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  approveTextLux: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  miniOrderCardLux: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  miniOrderIconLux: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniOrderTitleLux: {
    fontSize: 14,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  miniOrderSubLux: {
    fontSize: 12,
    color: FLORAL_COLORS.textDim,
    fontWeight: '600',
  },
  miniOrderPriceLux: {
    fontSize: 15,
    fontWeight: '900',
    color: FLORAL_COLORS.primary,
  },

  // Lists Lux
  listHeaderLux: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  listTitleLux: {
    fontSize: 28,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
    marginBottom: 20,
  },
  searchBarLux: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  searchInputLux: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: FLORAL_COLORS.text,
  },
  listCardLux: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  avatarLux: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSuccessLux: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: FLORAL_COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  productCardLux: {
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  productImgPlaceholderLux: {
    width: 100,
    height: 100,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImgLux: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  cardPriceLux: {
    fontSize: 16,
    fontWeight: '900',
    color: FLORAL_COLORS.primary,
    marginTop: 4,
  },

  // Orders Lux
  orderCardWrapperLux: {
    marginBottom: 16,
  },
  orderCardLux: {
    padding: 20,
  },
  orderHeaderLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdLux: {
    fontSize: 12,
    fontWeight: '900',
    color: FLORAL_COLORS.textDim,
    letterSpacing: 1,
  },
  statusBadgeLux: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F7F3',
  },
  statusTextLux: {
    fontSize: 10,
    fontWeight: '900',
    color: FLORAL_COLORS.primary,
  },
  orderProductLux: {
    fontSize: 18,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    marginBottom: 16,
  },
  orderFooterLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: FLORAL_COLORS.border,
  },
  orderUserLux: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
  },
  orderPriceLux: {
    fontSize: 22,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },

  emptyStateLux: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTextLux: {
    fontSize: 16,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
    marginTop: 16,
  },

  // Bottom Nav Lux
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 30,
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

  // Modal Lux
  modalOverlayLux: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBlurLux: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContentLux: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeaderLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitleLux: {
    fontSize: 22,
    fontWeight: '900',
    color: FLORAL_COLORS.text,
  },
  closeBtnLux: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCardLux: {
    padding: 20,
    marginBottom: 24,
  },
  detailRowLux: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: FLORAL_COLORS.border,
  },
  labelLux: {
    fontSize: 14,
    fontWeight: '700',
    color: FLORAL_COLORS.textDim,
  },
  valueLux: {
    fontSize: 15,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
  },
  printBtnLux: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  printGradientLux: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  printBtnTextLux: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
