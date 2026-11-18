import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { colors, radius } from '../theme';
import { Badge, Card, ListRow, SectionTitle, styles } from '../components/ui';
import { articles, files } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';

export function MagazineScreen() {
  const nav = useNav();
  const [featured, ...rest] = articles;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => nav.navigate('Article', { articleId: featured.id })}>
        <View style={{ backgroundColor: featured.color, borderRadius: radius.lg, padding: 20, minHeight: 180, justifyContent: 'flex-end', marginBottom: 16 }}>
          <Text style={{ color: '#fff', opacity: 0.85, fontWeight: '700', fontSize: 12 }}>DESTACADO · {featured.category.toUpperCase()}</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 }}>{featured.title}</Text>
          <Text style={{ color: '#fff', opacity: 0.9, marginTop: 4 }}>{featured.summary}</Text>
        </View>
      </Pressable>
      <SectionTitle>Más noticias</SectionTitle>
      {rest.map((a) => (
        <Pressable key={a.id} onPress={() => nav.navigate('Article', { articleId: a.id })}>
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 70, height: 70, borderRadius: radius.md, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="newspaper" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Badge text={a.category} color={a.color} />
              <Text style={[styles.body, { fontWeight: '700', marginTop: 4 }]}>{a.title}</Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>{a.date}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ArticleScreen({ route }: ScreenProps<'Article'>) {
  const a = articles.find((x) => x.id === route.params.articleId)!;
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.card }]}>
      <View style={{ backgroundColor: a.color, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="newspaper" size={60} color="#ffffffAA" />
      </View>
      <View style={{ padding: 20 }}>
        <Badge text={a.category} color={a.color} />
        <Text style={[styles.h1, { marginTop: 10 }]}>{a.title}</Text>
        <Text style={[styles.muted, { marginBottom: 16, marginTop: 4 }]}>{a.date}</Text>
        <Text style={[styles.body, { fontSize: 16, lineHeight: 25 }]}>{a.body}</Text>
      </View>
    </ScrollView>
  );
}

const fileIcon = { pdf: ['document-outline', '#DC2626'], doc: ['document-text-outline', '#2563EB'], xls: ['grid-outline', '#059669'], img: ['image-outline', '#D97706'] } as const;

export function FilesScreen() {
  const folders = Array.from(new Set(files.map((f) => f.folder)));
  const [folder, setFolder] = useState<string | null>(null);
  const shown = folder ? files.filter((f) => f.folder === folder) : files;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {[null, ...folders].map((f) => (
          <Pressable
            key={f ?? 'all'}
            onPress={() => setFolder(f)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, marginRight: 8, backgroundColor: folder === f ? colors.primary : colors.card }}
          >
            <Text style={{ color: folder === f ? '#fff' : colors.text, fontWeight: '600' }}>{f ?? 'Todos'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {shown.map((f) => (
        <ListRow
          key={f.id}
          icon={fileIcon[f.type][0]}
          color={fileIcon[f.type][1]}
          title={f.name}
          subtitle={`${f.folder} · ${f.size}`}
          onPress={() => showAlert(f.name, 'El archivo se abrirá cuando la app esté conectada al servidor.')}
          right={<Ionicons name="download-outline" size={20} color={colors.textMuted} />}
        />
      ))}
    </ScrollView>
  );
}
