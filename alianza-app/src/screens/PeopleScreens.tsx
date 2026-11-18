import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { colors, radius } from '../theme';
import { Avatar, Badge, Button, Card, Input, styles } from '../components/ui';
import { ME_ID, people } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';
import { useApp } from '../context/AppContext';

const getMe = () => people.find((p) => p.id === ME_ID)!;

export default function PeopleScreen() {
  const me = getMe();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [onlyShared, setOnlyShared] = useState(false);

  const q = query.toLowerCase();
  const list = people
    .filter((p) => p.id !== ME_ID)
    .filter((p) => !onlyShared || p.interests.some((i) => me.interests.includes(i)))
    .filter((p) =>
      [p.name, p.role, p.area, ...p.interests].some((f) => f.toLowerCase().includes(q)),
    );

  return (
    <View style={styles.screen}>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Input placeholder="Buscar por nombre, área o interés..." value={query} onChangeText={setQuery} />
            <Pressable onPress={() => setOnlyShared(!onlyShared)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
              <Ionicons name={onlyShared ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={styles.body}>Solo personas con intereses similares a los míos</Text>
            </Pressable>
          </>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('PersonProfile', { personId: item.id })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar personId={item.id} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{item.name}</Text>
                <Text style={styles.muted}>{item.role} · {item.area}</Text>
                <Text style={[styles.muted, { fontSize: 12, marginTop: 2 }]}>{item.interests.join(' · ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

export function PersonProfileScreen({ route, navigation }: ScreenProps<'PersonProfile'>) {
  const me = getMe();
  const p = people.find((x) => x.id === route.params.personId)!;
  const { recognitions } = useApp();
  const received = recognitions.filter((r) => r.toId === p.id);
  const isMe = p.id === ME_ID;
  const shared = p.interests.filter((i) => me.interests.includes(i));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Avatar personId={p.id} size={88} />
        <Text style={[styles.h1, { marginTop: 12 }]}>{p.name}</Text>
        <Text style={styles.muted}>{p.role}</Text>
        <View style={{ marginTop: 8 }}><Badge text={p.area} /></View>
        {!isMe && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Button title="Mensaje" icon="chatbubble-outline" onPress={() => navigation.navigate('ChatRoom', { personId: p.id })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Llamar" icon="call-outline" variant="outline" onPress={() => showAlert('Llamada', `Llamando a ${p.name}...`)} />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <Row icon="mail-outline" text={p.email} />
        <Row icon="gift-outline" text={`Cumpleaños: ${p.birthday}`} />
      </Card>

      <Card>
        <Text style={[styles.label, { marginBottom: 10 }]}>Intereses</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.interests.map((i) => (
            <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: shared.includes(i) && !isMe ? colors.primarySoft : colors.bg }}>
              <Text style={{ color: shared.includes(i) && !isMe ? colors.primary : colors.text, fontWeight: '600' }}>{i}</Text>
            </View>
          ))}
        </View>
        {!isMe && shared.length > 0 && <Text style={[styles.muted, { marginTop: 10 }]}>Tienen {shared.length} interés(es) en común 🎯</Text>}
      </Card>

      <Card>
        <Text style={[styles.label, { marginBottom: 10 }]}>Reconocimientos recibidos ({received.length})</Text>
        {received.length === 0 && <Text style={styles.muted}>Aún no tiene reconocimientos.</Text>}
        {received.map((r) => (
          <Text key={r.id} style={[styles.body, { marginBottom: 6 }]}>👏 {r.value}: {r.message}</Text>
        ))}
        {!isMe && (
          <View style={{ marginTop: 10 }}>
            <Button title="Reconocer" icon="ribbon-outline" variant="outline" onPress={() => navigation.navigate('NewRecognition', { toId: p.id })} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}
