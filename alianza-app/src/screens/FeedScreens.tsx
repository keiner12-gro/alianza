import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, TextInput } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Avatar, Badge, Button, Card, Input, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ME_ID, Post } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';

function PostCard({ post, onOpen }: { post: Post; onOpen?: () => void }) {
  const { toggleLike } = useApp();
  const nav = useNav();
  const author = getPerson(post.authorId);
  const liked = post.likes.includes(ME_ID);
  return (
    <Card>
      {post.pinned && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="pin" size={14} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Anuncio fijado</Text>
        </View>
      )}
      <Pressable onPress={() => nav.navigate('PersonProfile', { personId: author.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar personId={author.id} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{author.name}</Text>
          <Text style={styles.muted}>{author.role} · {post.time}</Text>
        </View>
      </Pressable>
      {post.segment && <View style={{ marginTop: 10 }}><Badge text={`Para: ${post.segment}`} /></View>}
      <Pressable onPress={onOpen}>
        <Text style={[styles.body, { marginTop: 10 }]}>{post.text}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 24 }}>
        <Pressable onPress={() => toggleLike(post.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.danger : colors.textMuted} />
          <Text style={styles.muted}>{post.likes.length}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
          <Text style={styles.muted}>{post.comments.length} comentarios</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function FeedScreen() {
  const { posts } = useApp();
  const nav = useNav();
  const sorted = [...posts].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  return (
    <View style={styles.screen}>
      <FlatList
        data={sorted}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Pressable onPress={() => nav.navigate('NewPost')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar personId={ME_ID} size={36} />
              <Text style={[styles.muted, { flex: 1, fontSize: 15 }]}>¿Qué quieres compartir?</Text>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Card>
          </Pressable>
        }
        renderItem={({ item }) => <PostCard post={item} onOpen={() => nav.navigate('PostDetail', { postId: item.id })} />}
      />
    </View>
  );
}

export function PostDetailScreen({ route }: ScreenProps<'PostDetail'>) {
  const { posts, addComment } = useApp();
  const post = posts.find((p) => p.id === route.params.postId);
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState('');
  if (!post) return null;
  const send = () => {
    if (!text.trim()) return;
    addComment(post.id, text.trim());
    setText('');
  };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView contentContainerStyle={styles.content}>
        <PostCard post={post} />
        <Text style={[styles.muted, { fontWeight: '700', marginBottom: 8 }]}>Comentarios</Text>
        {post.comments.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Avatar personId={c.authorId} size={32} />
            <View style={{ flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: radius.md }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{getPerson(c.authorId).name}</Text>
              <Text style={styles.body}>{c.text}</Text>
              <Text style={[styles.muted, { fontSize: 11, marginTop: 4 }]}>{c.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Composer value={text} onChange={setText} onSend={send} placeholder="Escribe un comentario..." />
    </KeyboardAvoidingView>
  );
}

export function Composer({ value, onChange, onSend, placeholder }: { value: string; onChange: (t: string) => void; onSend: () => void; placeholder: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text }}
        onSubmitEditing={onSend}
        returnKeyType="send"
      />
      <Pressable onPress={onSend} style={{ backgroundColor: colors.primary, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="send" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const segments = ['Toda la organización', 'Recursos Humanos', 'Tecnología', 'Comercial', 'Operaciones', 'Finanzas'];

export function NewPostScreen({ navigation }: ScreenProps<'NewPost'>) {
  const { addPost } = useApp();
  const [text, setText] = useState('');
  const [segment, setSegment] = useState(segments[0]);
  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content}>
      <Input label="Mensaje" placeholder="Escribe tu anuncio o publicación..." multiline value={text} onChangeText={setText} />
      <Text style={styles.label}>¿A quién va dirigido?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {segments.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSegment(s)}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: segment === s ? colors.primary : colors.border, backgroundColor: segment === s ? colors.primarySoft : colors.card }}
          >
            <Text style={{ color: segment === s ? colors.primary : colors.text, fontWeight: '600' }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        title="Publicar"
        icon="paper-plane-outline"
        disabled={!text.trim()}
        onPress={() => {
          addPost(text.trim(), segment);
          navigation.goBack();
        }}
      />
    </KeyboardAwareScrollView>
  );
}
