import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { colors, radius } from '../theme';
import { Avatar, ListRow, SectionTitle, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ME_ID } from '../data/mock';
import { useNav } from '../navigation/types';
import { useVacationBalance } from './LeaveScreens';
import { roleLabel } from '../data/accounts';

/** Pestaña "Perfil": datos propios y accesos personales. */
export default function ProfileTabScreen() {
  const nav = useNav();
  const { logout, requests, recognitions, role } = useApp();
  const { available } = useVacationBalance();
  const me = getPerson(ME_ID);
  const pending = requests.filter((r) => r.status === 'Pendiente' && r.requesterId !== ME_ID).length;
  const myRecognitions = recognitions.filter((r) => r.toId === ME_ID).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => nav.navigate('PersonProfile', { personId: ME_ID })} style={{ alignItems: 'center', backgroundColor: colors.card, padding: 22, borderRadius: radius.lg, marginBottom: 16 }}>
        <Avatar personId={ME_ID} size={84} />
        <Text style={[styles.h1, { marginTop: 10 }]}>{me.name}</Text>
        <Text style={styles.muted}>{me.role} · {me.area}</Text>
        <View style={{ marginTop: 8, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Perfil: {roleLabel[role]}</Text>
        </View>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>Ver mi perfil</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Stat icon="sunny-outline" value={available} label="Días de vacaciones" onPress={() => nav.navigate('Leaves')} />
        <Stat icon="ribbon-outline" value={myRecognitions} label="Reconocimientos" onPress={() => nav.navigate('Recognitions')} />
      </View>

      <SectionTitle>Mi organización</SectionTitle>
      <ListRow icon="people-outline" title="Personas" subtitle="Directorio de la organización" onPress={() => nav.navigate('People')} />
      <ListRow icon="rocket-outline" title="Incorporación" subtitle="Tu checklist de bienvenida" onPress={() => nav.navigate('Onboarding')} />
      <ListRow
        icon="checkmark-done-outline"
        title="Aprobación de formularios"
        subtitle={pending ? `${pending} solicitud(es) pendiente(s)` : 'Sin pendientes'}
        onPress={() => nav.navigate('Approvals')}
        color={colors.success}
      />

      <SectionTitle>Cuenta</SectionTitle>
      <ListRow icon="notifications-outline" title="Notificaciones" onPress={() => nav.navigate('Notifications')} />
      <ListRow
        icon="log-out-outline"
        title="Cerrar sesión"
        color={colors.danger}
        onPress={() => showAlert('Cerrar sesión', '¿Seguro que quieres salir?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: logout }])}
      />
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>Alianza v1.0.0</Text>
    </ScrollView>
  );
}

function Stat({ icon, value, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 }}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 6 }}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </Pressable>
  );
}
