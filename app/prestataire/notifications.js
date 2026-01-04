import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import api from "../../src/api/axios";

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
      console.error('notifications load error', err);
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
    } catch (err) {
      console.error('markRead error', err);
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de marquer la notification comme lue');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/prestataire')}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Notifications Prestataire</Text>

      {items.length === 0 ? (
        <Text style={{ color: '#cbd5e1' }}>Aucune notification.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <View style={[styles.card, item.isRead ? { opacity: 0.6 } : null]}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.message}</Text>
              <Text style={styles.small}>{new Date(item.createdAt).toLocaleString()}</Text>

              {!item.isRead && (
                <TouchableOpacity onPress={() => markRead(item.id)} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#14b8a6' }}>Marquer lu</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 22, marginBottom: 10 },
  card: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginBottom: 10 },
  name: { color: '#fff', fontWeight: 'bold' },
  meta: { color: '#cbd5e1' },
  small: { color: '#94a3b8', fontSize: 12 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start', backgroundColor: '#020617', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  backText: { color: '#cbd5e1' },
});