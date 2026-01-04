import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, BlurView } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { CartProvider, useCart } from "./CartContext";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../src/theme";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";

function FloatingBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCart();

  const isActive = (route) => pathname === route;

  const navItems = [
    { route: "/client", icon: "home-outline", activeIcon: "home", label: "Home" },
    { route: "/client/orders", icon: "receipt-outline", activeIcon: "receipt", label: "History" },
    { route: "/client/notifications", icon: "notifications-outline", activeIcon: "notifications", label: "Alerts" },
    { route: "/client/cart", icon: "cart-outline", activeIcon: "cart", label: "Cart", badge: cart.length > 0 },
  ];

  const hideNavRoutes = ['/client/cart', '/client/product', '/client/payment', '/client/receipt'];
  const shouldHide = hideNavRoutes.some(r => pathname.includes(r));

  if (shouldHide) return null;

  return (
    <View style={styles.navContainer}>
      <Animatable.View animation="slideInUp" duration={800} style={styles.floatingBar}>
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
              style={styles.navItem}
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={24}
                  color={active ? theme.colors.primary : theme.colors.textDim}
                />
                {item.badge && <View style={styles.badgeLux} />}
              </View>
              {active && (
                <Animatable.Text
                  animation="fadeIn"
                  duration={300}
                  style={styles.navLabel}
                >
                  {item.label}
                </Animatable.Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Animatable.View>
    </View>
  );
}

export default function ClientLayout() {
  return (
    <CartProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <FloatingBottomNav />
      </View>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floatingBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#4A785D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(74, 120, 93, 0.1)',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  iconBox: {
    position: 'relative',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  badgeLux: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
