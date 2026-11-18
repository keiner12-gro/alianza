import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, radius } from '../theme';
import { Avatar, Badge, Button, Card, Input, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ME_ID, people, values } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';

export function RecognitionsScreen() {
  const { recognitions } = useApp();
  const nav = useNav();
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={recognitions}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Button title="Reconocer a un compañero" icon="ribbon-outline" onPress={() => nav.navigate('NewRecognition')} />
        </View>
      }
      renderItem={({ item }) => {
        const v = values.find((x) => x.key === item.value);
        return (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar personId={item.fromId} size={32} />
              <Text style={{ fontSize: 18 }}>➜</Text>
              <Avatar personId={item.toId} size={32} />
              <Text style={[styles.body, { flex: 1, marginLeft: 4 }]} numberOfLines={2}>
                <Text style={{ fontWeight: '700' }}>{getPerson(item.fromId).name}</Text> reconoció a{' '}
                <Text style={{ fontWeight: '700' }}>{getPerson(item.toId).name}</Text>
              </Text>
            </View>
            <View style={{ marginTop: 10 }}><Badge text={`${v?.emoji ?? '👏'} ${item.value}`} color={colors.accent} /></View>
            <Text style={[styles.body, { marginTop: 8, fontStyle: 'italic' }]}>"{item.message}"</Text>
            <Text style={[styles.muted, { fontSize: 12, marginTop: 6 }]}>{item.time}</Text>
          </Card>
        );
      }}
    />
  );
}

export function NewRecognitionScreen({ route, navigation }: ScreenProps<'NewRecognition'>) {
  const { addRecognition } = useApp();
  const [toId, setToId] = useState(route.params?.toId ?? '');
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>¿A quién quieres reconocer?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        {people.filter((p) => p.id !== ME_ID).map((p) => (
          <Pressable key={p.id} onPress={() => setToId(p.id)} style={{ alignItems: 'center', marginRight: 14, opacity: !toId || toId === p.id ? 1 : 0.4 }}>
            <View style={{ borderWidth: 3, borderColor: toId === p.id ? colors.primary : 'transparent', borderRadius: 32, padding: 2 }}>
              <Avatar personId={p.id} size={52} />
            </View>
            <Text style={{ fontSize: 12, marginTop: 4, color: colors.text }}>{p.name.split(' ')[0]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Valor que representa</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {values.map((v) => (
          <Pressable
            key={v.key}
            onPress={() => setValue(v.key)}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: value === v.key ? colors.accent : colors.border, backgroundColor: value === v.key ? '#FEF3C7' : colors.card }}
          >
            <Text style={{ fontWeight: '600', color: colors.text }}>{v.emoji} {v.key}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Mensaje" placeholder="Cuéntale por qué lo reconoces..." multiline value={message} onChangeText={setMessage} />
      <Button
        title="Enviar reconocimiento"
        icon="ribbon-outline"
        disabled={!toId || !value || !message.trim()}
        onPress={() => {
          addRecognition(toId, value, message.trim());
          navigation.goBack();
        }}
      />
    </KeyboardAwareScrollView>
  );
}
