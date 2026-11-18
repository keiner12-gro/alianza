import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { showAlert } from '../utils/alert';
import { colors } from '../theme';
import { Avatar, Badge, Button, Card, EmptyState, Input, ListRow, SectionTitle, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FormRequest, ME_ID, formTemplates } from '../data/mock';
import { ScreenProps, useNav } from '../navigation/types';

const statusColor: Record<FormRequest['status'], string> = {
  Pendiente: colors.accent,
  Aprobado: colors.success,
  Rechazado: colors.danger,
};

export function FormsScreen() {
  const nav = useNav();
  const { requests } = useApp();
  const mine = requests.filter((r) => r.requesterId === ME_ID);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>Nuevo trámite</SectionTitle>
      {formTemplates.map((t) => (
        <ListRow key={t.id} icon={t.icon as any} title={t.title} onPress={() => nav.navigate('FormFill', { templateId: t.id })} />
      ))}
      <SectionTitle>Mis solicitudes</SectionTitle>
      {mine.length === 0 && <EmptyState icon="document-outline" text="Aún no has enviado solicitudes." />}
      {mine.map((r) => (
        <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '700' }]}>{r.title}</Text>
            <Text style={styles.muted}>Enviado: {r.date}</Text>
          </View>
          <Badge text={r.status} color={statusColor[r.status]} />
        </Card>
      ))}
    </ScrollView>
  );
}

export function FormFillScreen({ route, navigation }: ScreenProps<'FormFill'>) {
  const t = formTemplates.find((x) => x.id === route.params.templateId)!;
  const { submitRequest } = useApp();
  const [vals, setVals] = useState<Record<string, string>>({});
  React.useEffect(() => {
    navigation.setOptions({ title: t.title });
  }, [navigation, t.title]);

  const submit = () => {
    const missing = t.fields.filter((f) => !f.multiline && !vals[f.key]?.trim());
    if (missing.length) {
      showAlert('Faltan campos', `Completa: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    submitRequest(t.id, t.title, vals);
    showAlert('¡Enviado!', 'Tu solicitud fue enviada para aprobación.');
    navigation.goBack();
  };

  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content}>
      {t.fields.map((f) => (
        <Input
          key={f.key}
          label={f.label}
          multiline={f.multiline}
          value={vals[f.key] ?? ''}
          onChangeText={(v) => setVals((s) => ({ ...s, [f.key]: v }))}
        />
      ))}
      <Button title="Enviar solicitud" icon="paper-plane-outline" onPress={submit} />
    </KeyboardAwareScrollView>
  );
}

export function ApprovalsScreen() {
  const { requests, setRequestStatus } = useApp();
  const toApprove = requests.filter((r) => r.requesterId !== ME_ID);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {toApprove.length === 0 && <EmptyState icon="checkmark-done-outline" text="No hay solicitudes por aprobar." />}
      {toApprove.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar personId={r.requesterId} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.body, { fontWeight: '700' }]}>{getPerson(r.requesterId).name}</Text>
              <Text style={styles.muted}>{r.title} · {r.date}</Text>
            </View>
            <Badge text={r.status} color={statusColor[r.status]} />
          </View>
          {Object.entries(r.values).map(([k, v]) => (
            <Text key={k} style={styles.body}><Text style={{ fontWeight: '600' }}>{k}: </Text>{v}</Text>
          ))}
          {r.status === 'Pendiente' && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}><Button title="Rechazar" variant="outline" onPress={() => setRequestStatus(r.id, 'Rechazado')} /></View>
              <View style={{ flex: 1 }}><Button title="Aprobar" onPress={() => setRequestStatus(r.id, 'Aprobado')} /></View>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
