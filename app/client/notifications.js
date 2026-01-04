import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
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

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setItems(res.data?.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    // Optimistic UI update: remove it immediately
    setItems((prev) => {
      const newList = prev.filter(i => i.id !== id);
      console.log(`[Notification] Removing ID: ${id}. Items before: ${prev.length}, after: ${newList.length}`);
      return newList;
    });

    try {
      await api.put(`/notifications/${id}/read`);
      console.log(`[Notification] Successfully marked ${id} as read on server.`);
    } catch (err) {
      console.error(`[Notification] Failed to mark ${id} as read on server:`, err.message);
      // Optional: rollback if needed, but usually we just let it stay removed 
      // since the refresh would bring it back if it really failed
    }
  };

  return (
    <LinearGradient colors={FLORAL_COLORS.background} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* HEADER */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.headerLux}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLux}>
            <Ionicons name="chevron-back" size={24} color={FLORAL_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLux}>Notifications</Text>
          <TouchableOpacity onPress={load} style={styles.refreshBtnLux}>
            <Feather name="refresh-cw" size={20} color={FLORAL_COLORS.primary} />
          </TouchableOpacity>
        </Animatable.View>

        {loading && items.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={FLORAL_COLORS.primary} />
          </View>
        ) : items.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={60} color={FLORAL_COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Total Silence</Text>
            <Text style={styles.emptySub}>You don't have any notifications yet. We'll let you know when there's something new!</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/client')}>
              <Text style={styles.shopBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animatable.View animation="fadeInLeft" delay={index * 100} style={[styles.cardLux, item.isRead && styles.cardRead]}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name={item.isRead ? "bell-outline" : "bell-badge"}
                      size={24}
                      color={item.isRead ? FLORAL_COLORS.textDim : FLORAL_COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.nameLux, item.isRead && styles.textRead]}>{item.title}</Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={[styles.messageLux, item.isRead && styles.textRead]}>{item.message}</Text>
                    <Text style={styles.dateLux}>{new Date(item.createdAt).toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</Text>
                  </View>
                </View>

                {!item.isRead && (
                  <TouchableOpacity onPress={() => markRead(item.id)} style={styles.markReadBtn}>
                    <Text style={styles.markReadText}>Mark as read</Text>
                    <Ionicons name="checkmark-done" size={16} color={FLORAL_COLORS.primary} />
                  </TouchableOpacity>
                )}
              </Animatable.View>
            )}
          />
        )}
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
    paddingBottom: 40,
  },
  cardLux: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: FLORAL_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameLux: {
    fontSize: 16,
    fontWeight: '800',
    color: FLORAL_COLORS.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FLORAL_COLORS.accent,
    marginLeft: 10,
  },
  messageLux: {
    fontSize: 14,
    color: FLORAL_COLORS.textDim,
    lineHeight: 20,
    marginTop: 4,
  },
  dateLux: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 8,
    fontWeight: '600',
  },
  textRead: {
    color: '#A0AEC0',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 6,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
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
});