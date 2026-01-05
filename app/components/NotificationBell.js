import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import api from "../../src/api/axios";

export default function NotificationBell({ refreshTrigger, target = '/client/notifications' }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setCount(res.data?.count || 0);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  return (
    <TouchableOpacity style={styles.container} onPress={() => router.push('/client/notifications')}>
      <Text style={styles.icon}>🔔</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', padding: 6 },
  icon: { fontSize: 18, color: '#fff' },
  badge: { position: 'absolute', right: 0, top: -4, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' }
});