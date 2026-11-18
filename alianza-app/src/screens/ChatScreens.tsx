import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { colors, radius } from '../theme';
import { Avatar, Card, EmptyState, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ME_ID, Message } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';
import { Composer } from './FeedScreens';

export default function ChatsScreen() {
  const { chats } = useApp();
  const nav = useNav();
  return (
    <View style={styles.screen}>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" text="Aún no tienes conversaciones. Busca a alguien en Personas." />}
        renderItem={({ item }) => {
          const p = getPerson(item.personId);
          const last = item.messages[item.messages.length - 1];
          return (
            <Pressable onPress={() => nav.navigate('ChatRoom', { personId: p.id })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar personId={p.id} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{p.name}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {last.fromId === ME_ID ? 'Tú: ' : ''}{last.text}
                  </Text>
                </View>
                <Text style={[styles.muted, { fontSize: 12 }]}>{last.time}</Text>
              </Card>
            </Pressable>
          );
        }}
      />
      <Pressable onPress={() => nav.navigate('People')} style={{ position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
        <Ionicons name="create-outline" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

function Bubble({ m }: { m: Message }) {
  const mine = m.fromId === ME_ID;
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8 }}>
      <View style={{ backgroundColor: mine ? colors.primary : colors.card, padding: 10, paddingHorizontal: 14, borderRadius: radius.lg, borderBottomRightRadius: mine ? 4 : radius.lg, borderBottomLeftRadius: mine ? radius.lg : 4 }}>
        <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 15 }}>{m.text}</Text>
      </View>
      {m.time ? <Text style={[styles.muted, { fontSize: 11, alignSelf: mine ? 'flex-end' : 'flex-start', marginTop: 2 }]}>{m.time}</Text> : null}
    </View>
  );
}

function Conversation({ messages, onSend }: { messages: Message[]; onSend: (t: string) => void }) {
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <FlatList ref={listRef} data={messages} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => <Bubble m={item} />} />
      <Composer value={text} onChange={setText} onSend={send} placeholder="Escribe un mensaje..." />
    </KeyboardAvoidingView>
  );
}

export function ChatRoomScreen({ route, navigation }: ScreenProps<'ChatRoom'>) {
  const { chats, sendMessage } = useApp();
  const p = getPerson(route.params.personId);
  const chat = chats.find((c) => c.personId === p.id);

  useEffect(() => {
    navigation.setOptions({
      title: p.name,
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={() => showAlert('Llamada de voz', `Llamando a ${p.name}...`)}>
            <Ionicons name="call-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => showAlert('Videollamada', `Iniciando videollamada con ${p.name}...`)}>
            <Ionicons name="videocam-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, p.name]);

  return <Conversation messages={chat?.messages ?? []} onSend={(t) => sendMessage(p.id, t)} />;
}

