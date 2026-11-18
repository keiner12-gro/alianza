import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import { Avatar, Badge, Button, Card, EmptyState, Input, getPerson, styles } from '../components/ui';
import RangeCalendar from '../components/RangeCalendar';
import { useApp } from '../context/AppContext';
import { ME_ID } from '../data/mock';
import { LeaveRequest, LeaveStatus, VACATION_ENTITLEMENT, leaders, leaveTypes } from '../data/modules';
import { businessDaysBetween, formatLong, formatRange, fromISO, isBusinessDay, toISO } from '../utils/dates';
import { showAlert } from '../utils/alert';
import { ScreenProps, useNav } from '../navigation/types';

export const statusColor: Record<LeaveStatus, string> = {
  Pendiente: colors.accent,
  Aprobada: colors.success,
  Rechazada: colors.danger,
  Cancelada: colors.textMuted,
};

const typeOf = (id: string) => leaveTypes.find((t) => t.id === id)!;

/** Saldo de vacaciones: las pendientes quedan reservadas hasta que se respondan. */
export function useVacationBalance() {
  const { leaves } = useApp();
  const mine = leaves.filter((l) => l.requesterId === ME_ID && l.typeId === 'vac');
  const used = mine.filter((l) => l.status === 'Aprobada').reduce((a, l) => a + l.days, 0);
  const pending = mine.filter((l) => l.status === 'Pendiente').reduce((a, l) => a + l.days, 0);
  return { used, pending, available: VACATION_ENTITLEMENT - used - pending };
}

function LeaveCard({ leave, showRequester }: { leave: LeaveRequest; showRequester?: boolean }) {
  const nav = useNav();
  const t = typeOf(leave.typeId);
  return (
    <Pressable onPress={() => nav.navigate('LeaveDetail', { leaveId: leave.id })}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {showRequester ? (
          <Avatar personId={leave.requesterId} size={44} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={t.icon as any} size={22} color={t.color} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.body, { fontWeight: '700' }]}>
            {showRequester ? getPerson(leave.requesterId).name : t.name}
          </Text>
          {showRequester && <Text style={styles.muted}>{t.name}</Text>}
          <Text style={styles.muted}>
            {formatRange(leave.start, leave.end)} · {leave.days} {leave.days === 1 ? 'día' : 'días'}
          </Text>
        </View>
        <Badge text={leave.status} color={statusColor[leave.status]} />
      </Card>
    </Pressable>
  );
}

export function LeavesScreen() {
  const nav = useNav();
  const { leaves } = useApp();
  const { used, pending, available } = useVacationBalance();
  const [tab, setTab] = useState<'mine' | 'approve'>('mine');
  const insets = useSafeAreaInsets();

  const mine = leaves.filter((l) => l.requesterId === ME_ID);
  const toApprove = leaves.filter((l) => l.approverId === ME_ID && l.requesterId !== ME_ID);
  const pendingToApprove = toApprove.filter((l) => l.status === 'Pendiente').length;
  const isLeader = Object.entries(leaders).some(([who, leader]) => leader === ME_ID && who !== ME_ID);

  const list = tab === 'mine' ? mine : [...toApprove].sort((a, b) => Number(b.status === 'Pendiente') - Number(a.status === 'Pendiente'));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}>
        <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: '#DCE3FF', fontWeight: '600' }}>Vacaciones disponibles</Text>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>
            {available} <Text style={{ fontSize: 18, fontWeight: '600' }}>días hábiles</Text>
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
            <Stat label="Disfrutados" value={used} />
            <Stat label="Por aprobar" value={pending} />
            <Stat label="Por año" value={VACATION_ENTITLEMENT} />
          </View>
        </View>

        {isLeader && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 4, marginBottom: 14 }}>
            <Segment active={tab === 'mine'} label="Mis solicitudes" onPress={() => setTab('mine')} />
            <Segment active={tab === 'approve'} label="Por aprobar" badge={pendingToApprove} onPress={() => setTab('approve')} />
          </View>
        )}

        {list.length === 0 && (
          <EmptyState icon="calendar-outline" text={tab === 'mine' ? 'Aún no has hecho solicitudes.' : 'No tienes solicitudes de tu equipo.'} />
        )}
        {list.map((l) => <LeaveCard key={l.id} leave={l} showRequester={tab === 'approve'} />)}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 + insets.bottom }}>
        <Button title="Solicitar vacaciones o permiso" icon="add" onPress={() => nav.navigate('NewLeave')} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff22', borderRadius: radius.md, padding: 10 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{value}</Text>
      <Text style={{ color: '#DCE3FF', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Segment({ active, label, badge, onPress }: { active: boolean; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: active ? colors.card : 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontWeight: '700', color: active ? colors.primary : colors.textMuted }}>{label}</Text>
      {!!badge && (
        <View style={{ backgroundColor: colors.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function NewLeaveScreen({ navigation }: ScreenProps<'NewLeave'>) {
  const { leaves, requestLeave } = useApp();
  const { available } = useVacationBalance();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>();

  const type = typeId ? typeOf(typeId) : null;
  const approver = getPerson(leaders[ME_ID]);

  // Días que ya están cubiertos por otra solicitud pendiente o aprobada
  const blocked = useMemo(() => {
    const days: string[] = [];
    leaves
      .filter((l) => l.requesterId === ME_ID && (l.status === 'Pendiente' || l.status === 'Aprobada'))
      .forEach((l) => {
        const d = fromISO(l.start);
        while (toISO(d) <= l.end) {
          days.push(toISO(d));
          d.setDate(d.getDate() + 1);
        }
      });
    return days;
  }, [leaves]);

  const days = start && end ? businessDaysBetween(start, end) : 0;
  const overlaps = start && end ? blocked.some((d) => d >= start && d <= end) : false;

  const problem = (() => {
    if (!type || !start || !end) return null;
    if (!isBusinessDay(start)) return 'La fecha de inicio debe ser un día hábil.';
    if (days === 0) return 'El rango no incluye días hábiles.';
    if (overlaps) return 'Las fechas se cruzan con otra solicitud tuya.';
    if (type.maxDays && days > type.maxDays) return `Este tipo de permiso permite máximo ${type.maxDays} ${type.maxDays === 1 ? 'día' : 'días'}.`;
    if (type.usesBalance && days > available) return `Solo tienes ${available} días disponibles.`;
    return null;
  })();

  const missing = !type || !start || !end || !reason.trim() || (type.requiresAttachment && !attachment);

  const submit = () => {
    if (!type || !start || !end) return;
    showAlert(
      'Confirmar solicitud',
      `${type.name}: ${formatRange(start, end)} (${days} ${days === 1 ? 'día hábil' : 'días hábiles'}).\nSe enviará a ${approver.name} para aprobación.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: () => {
            requestLeave({ typeId: type.id, start, end, days, reason: reason.trim(), attachment });
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!type) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { marginBottom: 4 }]}>¿Qué quieres solicitar?</Text>
        <Text style={[styles.muted, { marginBottom: 16 }]}>Elige el tipo de ausencia.</Text>
        {leaveTypes.map((t) => (
          <Pressable key={t.id} onPress={() => setTypeId(t.id)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={t.icon as any} size={22} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{t.name}</Text>
                <Text style={styles.muted}>{t.usesBalance ? `${available} días disponibles` : t.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  const single = type.maxDays === 1;

  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => { setTypeId(null); setStart(null); setEnd(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: type.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={type.icon as any} size={20} color={type.color} />
        </View>
        <Text style={[styles.body, { fontWeight: '700', flex: 1 }]}>{type.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
      </Pressable>

      <Card>
        <Text style={[styles.label, { marginBottom: 10 }]}>{single ? 'Elige el día' : 'Elige la fecha de inicio y la de fin'}</Text>
        <RangeCalendar
          start={start}
          end={end}
          singleDay={single}
          blocked={blocked}
          onChange={(s, e) => { setStart(s); setEnd(e); }}
        />
      </Card>

      {start && end && (
        <Card style={{ backgroundColor: problem ? '#FEF2F2' : colors.primarySoft }}>
          <Text style={[styles.body, { fontWeight: '700' }]}>{formatRange(start, end)}</Text>
          <Text style={[styles.body, { marginTop: 2 }]}>
            {days} {days === 1 ? 'día hábil' : 'días hábiles'}
            {type.usesBalance && !problem ? ` · Te quedarán ${available - days} días` : ''}
          </Text>
          {problem && <Text style={{ color: colors.danger, marginTop: 6, fontWeight: '600' }}>⚠ {problem}</Text>}
        </Card>
      )}

      <Input label="Motivo" placeholder="Cuéntale a tu líder el motivo" multiline value={reason} onChangeText={setReason} />

      {type.requiresAttachment && (
        <Pressable
          onPress={() => setAttachment(attachment ? undefined : 'soporte.pdf')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: attachment ? colors.success : colors.border, borderRadius: radius.md, padding: 14, marginBottom: 14, backgroundColor: colors.card }}
        >
          <Ionicons name={attachment ? 'document-attach' : 'attach'} size={22} color={attachment ? colors.success : colors.textMuted} />
          <Text style={[styles.body, { flex: 1 }]}>{attachment ?? 'Adjuntar soporte (obligatorio)'}</Text>
          {attachment && <Ionicons name="close-circle" size={20} color={colors.textMuted} />}
        </Pressable>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar personId={approver.id} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.muted}>La aprueba</Text>
          <Text style={[styles.body, { fontWeight: '700' }]}>{approver.name} · {approver.role}</Text>
        </View>
      </Card>

      <Button title="Enviar solicitud" icon="paper-plane-outline" disabled={!!missing || !!problem} onPress={submit} />
    </KeyboardAwareScrollView>
  );
}

export function LeaveDetailScreen({ route, navigation }: ScreenProps<'LeaveDetail'>) {
  const { leaves, respondLeave, cancelLeave } = useApp();
  const leave = leaves.find((l) => l.id === route.params.leaveId);
  const [note, setNote] = useState('');
  if (!leave) return null;

  const t = typeOf(leave.typeId);
  const isMine = leave.requesterId === ME_ID;
  const canRespond = leave.approverId === ME_ID && !isMine && leave.status === 'Pendiente';
  const requester = getPerson(leave.requesterId);
  const approver = getPerson(leave.approverId);

  const respond = (status: 'Aprobada' | 'Rechazada') => {
    if (status === 'Rechazada' && !note.trim()) {
      showAlert('Falta el motivo', 'Escribe por qué rechazas la solicitud.');
      return;
    }
    respondLeave(leave.id, status, note.trim() || undefined);
    navigation.goBack();
  };

  const steps = [
    { label: 'Solicitud enviada', detail: `${requester.name} · ${formatLong(leave.createdAt)}`, done: true, color: colors.success },
    leave.status === 'Pendiente'
      ? { label: 'Esperando aprobación', detail: approver.name, done: false, color: colors.accent }
      : { label: `Solicitud ${leave.status.toLowerCase()}`, detail: leave.status === 'Cancelada' ? 'Cancelada por quien la solicitó' : approver.name, done: true, color: statusColor[leave.status] },
  ];

  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: t.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={t.icon as any} size={28} color={t.color} />
        </View>
        <Text style={[styles.h1, { marginTop: 10 }]}>{t.name}</Text>
        <Text style={[styles.body, { marginTop: 4 }]}>{formatRange(leave.start, leave.end)}</Text>
        <Text style={styles.muted}>{leave.days} {leave.days === 1 ? 'día hábil' : 'días hábiles'}</Text>
        <View style={{ marginTop: 10 }}><Badge text={leave.status} color={statusColor[leave.status]} /></View>
      </Card>

      {!isMine && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar personId={requester.id} size={40} />
          <View>
            <Text style={[styles.body, { fontWeight: '700' }]}>{requester.name}</Text>
            <Text style={styles.muted}>{requester.role} · {requester.area}</Text>
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.label}>Motivo</Text>
        <Text style={styles.body}>{leave.reason}</Text>
        {leave.attachment && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{leave.attachment}</Text>
          </View>
        )}
        {leave.responseNote && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Respuesta del líder</Text>
            <Text style={styles.body}>{leave.responseNote}</Text>
          </>
        )}
      </Card>

      <Card>
        <Text style={[styles.label, { marginBottom: 10 }]}>Seguimiento</Text>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={s.done ? 'checkmark-circle' : 'time'} size={22} color={s.color} />
              {i < steps.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 }} />}
            </View>
            <View style={{ paddingBottom: 14 }}>
              <Text style={[styles.body, { fontWeight: '700' }]}>{s.label}</Text>
              <Text style={styles.muted}>{s.detail}</Text>
            </View>
          </View>
        ))}
      </Card>

      {canRespond && (
        <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 }, shadow]}>
          <Input label="Comentario (obligatorio si rechazas)" placeholder="Escribe un comentario..." multiline value={note} onChangeText={setNote} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Rechazar" variant="outline" onPress={() => respond('Rechazada')} /></View>
            <View style={{ flex: 1 }}><Button title="Aprobar" icon="checkmark" onPress={() => respond('Aprobada')} /></View>
          </View>
        </View>
      )}

      {isMine && leave.status === 'Pendiente' && (
        <Button
          title="Cancelar solicitud"
          variant="danger"
          onPress={() =>
            showAlert('Cancelar solicitud', '¿Seguro que quieres cancelarla?', [
              { text: 'No', style: 'cancel' },
              { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelLeave(leave.id) },
            ])
          }
        />
      )}
    </KeyboardAwareScrollView>
  );
}
