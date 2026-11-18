import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Avatar, Badge, Button, Card, EmptyState, Input, ListRow, ProgressBar, SectionTitle, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ME_ID } from '../data/mock';
import { TicketStatus, evaluationCycle, feedbackReceived, myDocuments, serviceCategories } from '../data/modules';
import { showAlert } from '../utils/alert';
import { ScreenProps, useNav } from '../navigation/types';
import { Composer } from './FeedScreens';

// ---------- Mis documentos ----------

const docIcon = { 'Nómina': 'cash-outline', Certificados: 'ribbon-outline', Contrato: 'briefcase-outline' } as const;

export function MyDocumentsScreen() {
  const categories = ['Todos', 'Nómina', 'Certificados', 'Contrato'] as const;
  const [cat, setCat] = useState<(typeof categories)[number]>('Todos');
  const shown = cat === 'Todos' ? myDocuments : myDocuments.filter((d) => d.category === cat);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft }}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        <Text style={[styles.body, { flex: 1, fontSize: 13 }]}>Estos documentos son personales. Solo tú puedes verlos.</Text>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {categories.map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, marginRight: 8, backgroundColor: cat === c ? colors.primary : colors.card }}>
            <Text style={{ color: cat === c ? '#fff' : colors.text, fontWeight: '600' }}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {shown.map((d) => (
        <ListRow
          key={d.id}
          icon={docIcon[d.category]}
          color="#DB2777"
          title={d.name}
          subtitle={`${d.category} · ${d.date}`}
          onPress={() => showAlert(d.name, 'El documento se abrirá cuando la app esté conectada al servidor.')}
          right={d.isNew ? <Badge text="Nuevo" color={colors.primary} /> : <Ionicons name="download-outline" size={20} color={colors.textMuted} />}
        />
      ))}
    </ScrollView>
  );
}

// ---------- Desempeño ----------

const scoreLabels = ['Por mejorar', 'Aceptable', 'Bueno', 'Muy bueno', 'Excelente'];

export function PerformanceScreen() {
  const { goals, updateGoal, selfEvaluation, submitSelfEvaluation } = useApp();
  const [scores, setScores] = useState<Record<string, number>>({});
  const total = goals.reduce((a, g) => a + g.progress * g.weight, 0) / goals.reduce((a, g) => a + g.weight, 0);
  const complete = evaluationCycle.competencies.every((c) => scores[c] !== undefined);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ backgroundColor: '#FEF3C7' }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{evaluationCycle.name}</Text>
        <Text style={[styles.muted, { marginTop: 2 }]}>Etapa: {evaluationCycle.stage} · Cierra el {evaluationCycle.deadline}</Text>
      </Card>

      <SectionTitle>Mis objetivos · {Math.round(total * 100)} % de avance</SectionTitle>
      {goals.map((g) => (
        <Card key={g.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[styles.body, { fontWeight: '700', flex: 1 }]}>{g.title}</Text>
            <Text style={styles.muted}>Peso {g.weight} %</Text>
          </View>
          <Text style={[styles.muted, { marginBottom: 8 }]}>Vence: {g.due}</Text>
          <ProgressBar value={g.progress} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontWeight: '700', color: colors.success }}>{Math.round(g.progress * 100)} %</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SmallBtn icon="remove" onPress={() => updateGoal(g.id, Math.max(0, +(g.progress - 0.1).toFixed(2)))} />
              <SmallBtn icon="add" onPress={() => updateGoal(g.id, Math.min(1, +(g.progress + 0.1).toFixed(2)))} />
            </View>
          </View>
        </Card>
      ))}

      <SectionTitle>Autoevaluación</SectionTitle>
      {selfEvaluation ? (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          <Text style={[styles.body, { fontWeight: '700', marginTop: 6 }]}>Autoevaluación enviada</Text>
          <Text style={styles.muted}>Tu líder la revisará en la siguiente etapa.</Text>
        </Card>
      ) : (
        <Card>
          {evaluationCycle.competencies.map((c) => (
            <View key={c} style={{ marginBottom: 14 }}>
              <Text style={[styles.body, { fontWeight: '600', marginBottom: 6 }]}>{c}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setScores((s) => ({ ...s, [c]: n }))} style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center', backgroundColor: scores[c] === n ? colors.primary : colors.bg }}>
                    <Text style={{ fontWeight: '700', color: scores[c] === n ? '#fff' : colors.text }}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              {scores[c] !== undefined && <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{scoreLabels[scores[c] - 1]}</Text>}
            </View>
          ))}
          <Button title="Enviar autoevaluación" disabled={!complete} onPress={() => submitSelfEvaluation(scores)} />
        </Card>
      )}

      <SectionTitle>Feedback recibido</SectionTitle>
      {feedbackReceived.map((f) => (
        <Card key={f.id} style={{ flexDirection: 'row', gap: 10 }}>
          <Avatar personId={f.fromId} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '700' }]}>{getPerson(f.fromId).name}</Text>
            <Text style={styles.body}>{f.text}</Text>
            <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{f.date}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function SmallBtn({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
}

// ---------- Portal de servicios ----------

const ticketColor: Record<TicketStatus, string> = { Abierto: colors.accent, 'En proceso': colors.primary, Resuelto: colors.success };

export function ServicePortalScreen() {
  const nav = useNav();
  const { tickets } = useApp();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>¿En qué te podemos ayudar?</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 12 }}>
        {serviceCategories.map((c) => (
          <Pressable key={c.id} onPress={() => nav.navigate('NewTicket', { categoryId: c.id })} style={{ width: '48%', backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.color + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ionicons name={c.icon as any} size={24} color={c.color} />
            </View>
            <Text style={[styles.body, { fontWeight: '700' }]}>{c.name}</Text>
            <Text style={[styles.muted, { fontSize: 12 }]}>{c.services.length} servicios</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>Mis casos</SectionTitle>
      {tickets.length === 0 && <EmptyState icon="file-tray-outline" text="No tienes casos abiertos." />}
      {tickets.map((t) => {
        const cat = serviceCategories.find((c) => c.id === t.categoryId)!;
        return (
          <Pressable key={t.id} onPress={() => nav.navigate('TicketDetail', { ticketId: t.id })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{t.service}</Text>
                <Text style={styles.muted}>{cat.name} · {t.createdAt}</Text>
              </View>
              <Badge text={t.status} color={ticketColor[t.status]} />
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function NewTicketScreen({ route, navigation }: ScreenProps<'NewTicket'>) {
  const { createTicket } = useApp();
  const cat = serviceCategories.find((c) => c.id === route.params.categoryId)!;
  const [service, setService] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  useEffect(() => {
    navigation.setOptions({ title: cat.name });
  }, [navigation, cat.name]);
  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Selecciona el servicio</Text>
      {cat.services.map((s) => (
        <Pressable key={s} onPress={() => setService(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, padding: 14, borderRadius: radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: service === s ? colors.primary : 'transparent' }}>
          <Ionicons name={service === s ? 'radio-button-on' : 'radio-button-off'} size={20} color={service === s ? colors.primary : colors.textMuted} />
          <Text style={styles.body}>{s}</Text>
        </Pressable>
      ))}
      <View style={{ height: 8 }} />
      <Input label="Describe tu caso" placeholder="Danos todos los detalles posibles..." multiline value={description} onChangeText={setDescription} />
      <Button
        title="Crear caso"
        icon="paper-plane-outline"
        disabled={!service || !description.trim()}
        onPress={() => {
          createTicket(cat.id, service!, description.trim());
          navigation.goBack();
        }}
      />
    </KeyboardAwareScrollView>
  );
}

export function TicketDetailScreen({ route, navigation }: ScreenProps<'TicketDetail'>) {
  const { tickets, replyTicket } = useApp();
  const t = tickets.find((x) => x.id === route.params.ticketId)!;
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    navigation.setOptions({ title: t.service });
  }, [navigation, t.service]);
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [t.messages.length]);
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={styles.muted}>Caso #{t.id.slice(0, 5).toUpperCase()}</Text>
        <Badge text={t.status} color={ticketColor[t.status]} />
      </View>
      <FlatList
        ref={listRef}
        data={t.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const mine = item.fromId === ME_ID;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 10 }}>
              {!mine && <Text style={[styles.muted, { fontSize: 11, marginBottom: 2 }]}>{item.fromId === 'bot' ? 'Mesa de ayuda' : getPerson(item.fromId).name}</Text>}
              <View style={{ backgroundColor: mine ? colors.primary : colors.card, padding: 10, paddingHorizontal: 14, borderRadius: radius.lg }}>
                <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 15 }}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />
      {t.status !== 'Resuelto' && (
        <Composer
          value={text}
          onChange={setText}
          placeholder="Escribe un mensaje..."
          onSend={() => {
            if (!text.trim()) return;
            replyTicket(t.id, text.trim());
            setText('');
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ---------- Eventos ----------

export function EventsScreen() {
  const nav = useNav();
  const { events } = useApp();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>Próximos eventos</SectionTitle>
      {events.map((e) => {
        const going = e.attendees.includes(ME_ID);
        return (
          <Pressable key={e.id} onPress={() => nav.navigate('EventDetail', { eventId: e.id })}>
            <Card style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 58, borderRadius: radius.md, backgroundColor: e.color + '1A', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
                <Text style={{ color: e.color, fontWeight: '800', fontSize: 22 }}>{e.day}</Text>
                <Text style={{ color: e.color, fontWeight: '700', fontSize: 12 }}>{e.month}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{e.title}</Text>
                <Text style={styles.muted}>{e.time} · {e.place}</Text>
                <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
                  {e.attendees.length} {e.attendees.length === 1 ? 'asistente' : 'asistentes'}{going ? ' · ✓ Asistirás' : ''}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EventDetailScreen({ route }: ScreenProps<'EventDetail'>) {
  const { events, toggleAttend } = useApp();
  const e = events.find((x) => x.id === route.params.eventId)!;
  const going = e.attendees.includes(ME_ID);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ backgroundColor: e.color, padding: 24, paddingTop: 32 }}>
        <Text style={{ color: '#fff', opacity: 0.85, fontWeight: '700' }}>{e.date.toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 }}>{e.title}</Text>
      </View>
      <View style={{ padding: 16 }}>
        <Card>
          <Info icon="time-outline" text={`${e.date} · ${e.time}`} />
          <Info icon="location-outline" text={e.place} />
          <Info icon="people-outline" text={e.attendees.length === 1 ? '1 persona asistirá' : `${e.attendees.length} personas asistirán`} />
        </Card>
        <Card>
          <Text style={styles.body}>{e.description}</Text>
        </Card>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {e.attendees.slice(0, 8).map((a, i) => (
            <View key={a} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: colors.bg, borderRadius: 20 }}>
              <Avatar personId={a} size={34} />
            </View>
          ))}
        </View>
        <Button title={going ? 'Ya no asistiré' : 'Asistiré'} icon={going ? 'close' : 'checkmark'} variant={going ? 'outline' : 'primary'} onPress={() => toggleAttend(e.id)} />
      </View>
    </ScrollView>
  );
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}
