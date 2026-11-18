import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Card, EmptyState, styles } from '../components/ui';
import { useApp } from '../context/AppContext';

export default function NotificationsScreen() {
  const { notifications, markAllRead } = useApp();
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={notifications}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        notifications.some((n) => !n.read) ? (
          <Pressable onPress={markAllRead} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Marcar todas como leídas</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" text="No tienes notificaciones." />}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: item.read ? colors.card : colors.primarySoft }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={item.icon as any} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: item.read ? '400' : '700' }]}>{item.text}</Text>
            <Text style={[styles.muted, { fontSize: 12, marginTop: 2 }]}>{item.time}</Text>
          </View>
          {!item.read && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
        </Card>
      )}
    />
  );
}
