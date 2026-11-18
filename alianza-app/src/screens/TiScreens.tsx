import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Button, Card, EmptyState, Input, SectionTitle, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import {
  CATEGORIAS_TI, URGENCIAS_TI, ReporteTi, UrgenciaTi, EstadoTi,
  cambiarEstadoTi, crearReporteTi, enviarMensajeTi, listarReportesTi,
} from '../api/client';
import { MONTHS } from '../utils/dates';
import { showAlert } from '../utils/alert';
import { ScreenProps, useNav } from '../navigation/types';
import { Composer } from './FeedScreens';

// Estados y urgencias: el color acompaña siempre a un icono y a un texto
const estadoColor: Record<EstadoTi, string> = { Abierto: '#D03B3B', 'En proceso': '#FAB219', Resuelto: '#0CA30C' };
const estadoIcono: Record<EstadoTi, keyof typeof Ionicons.glyphMap> = { Abierto: 'alert-circle', 'En proceso': 'time', Resuelto: 'checkmark-circle' };
const urgenciaColor: Record<UrgenciaTi, string> = { Alta: '#D03B3B', Media: '#B7791F', Baja: '#6B7280' };
const pesoUrgencia: Record<UrgenciaTi, number> = { Alta: 0, Media: 1, Baja: 2 };
const ordenEstado: Record<EstadoTi, number> = { Abierto: 0, 'En proceso': 1, Resuelto: 2 };

function fechaCorta(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

function EstadoChip({ estado }: { estado: EstadoTi }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: estadoColor[estado] + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' }}>
      <Ionicons name={estadoIcono[estado]} size={13} color={estadoColor[estado]} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{estado}</Text>
    </View>
  );
}

function UrgenciaChip({ urgencia }: { urgencia: UrgenciaTi }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: urgenciaColor[urgencia] + '66' }}>
      <Ionicons name="flag" size={12} color={urgenciaColor[urgencia]} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: urgenciaColor[urgencia] }}>Urgencia {urgencia.toLowerCase()}</Text>
    </View>
  );
}

/** Carga los reportes cada vez que se abre la pantalla y permite refrescar. */
function useReportesTi() {
  const [reportes, setReportes] = useState<ReporteTi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const { modo } = useApp();

  const recargar = useCallback(async () => {
    if (modo !== 'servidor') return;
    setCargando(true);
    try {
      setReportes(await listarReportesTi());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los reportes.');
    } finally {
      setCargando(false);
    }
  }, [modo]);

  // Una sola recarga por cada vez que se entra a la pantalla
  const ultima = useRef(recargar);
  ultima.current = recargar;
  useFocusEffect(
    useCallback(() => {
      ultima.current();
    }, []),
  );

  return { reportes, error, cargando, recargar };
}

function SinServidor() {
  return (
    <View style={[styles.screen, { justifyContent: 'center' }]}>
      <EmptyState icon="cloud-offline-outline" text="El Área TI necesita conexión con el servidor. Cierra sesión e inicia de nuevo con el servidor encendido." />
    </View>
  );
}

// ---------- Lista ----------

export function TiReportesScreen() {
  const nav = useNav();
  const { role, modo } = useApp();
  const { reportes, error, cargando, recargar } = useReportesTi();
  const esTi = role === 'ti';
  const [filtro, setFiltro] = useState<EstadoTi | null>(null);

  if (modo !== 'servidor') return <SinServidor />;

  const todos = reportes ?? [];
  const cuenta = (e: EstadoTi) => todos.filter((r) => r.estado === e).length;
  const lista = todos
    .filter((r) => !filtro || r.estado === filtro)
    // Primero lo que sigue abierto y más urgente; dentro de eso, lo más antiguo
    .sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado] || pesoUrgencia[a.urgencia] - pesoUrgencia[b.urgencia] || a.creadoEl.localeCompare(b.creadoEl));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={cargando && reportes !== null} onRefresh={recargar} colors={[colors.primary]} />}
    >
      {!esTi && (
        <Card style={{ backgroundColor: '#E0F2FE' }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="desktop" size={32} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.body, { fontWeight: '800' }]}>¿Tienes un problema con tu computador?</Text>
              <Text style={[styles.muted, { marginTop: 2 }]}>Cuéntanos qué pasa y el equipo de TI se encarga. Podrás seguir la respuesta aquí.</Text>
            </View>
          </View>
          <Button title="Reportar un problema" icon="add" onPress={() => nav.navigate('TiNuevo')} />
        </Card>
      )}

      {esTi && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {(['Abierto', 'En proceso', 'Resuelto'] as EstadoTi[]).map((e) => (
            <Pressable key={e} onPress={() => setFiltro(filtro === e ? null : e)} style={{ flex: 1, backgroundColor: filtro === e ? colors.primarySoft : colors.card, borderRadius: radius.lg, padding: 12, borderWidth: 2, borderColor: filtro === e ? colors.primary : 'transparent' }}>
              <Ionicons name={estadoIcono[e]} size={18} color={estadoColor[e]} />
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{cuenta(e)}</Text>
              <Text style={styles.muted}>{e === 'Abierto' ? 'Abiertos' : e === 'Resuelto' ? 'Resueltos' : 'En proceso'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SectionTitle>{esTi ? (filtro ? `Reportes: ${filtro.toLowerCase()}` : 'Cola de reportes') : 'Mis reportes'}</SectionTitle>

      {reportes === null && !error && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
      {error && (
        <Card style={{ backgroundColor: '#FEF2F2' }}>
          <Text style={[styles.body, { color: colors.danger, marginBottom: 10 }]}>{error}</Text>
          <Button title="Reintentar" variant="outline" onPress={recargar} />
        </Card>
      )}
      {reportes !== null && lista.length === 0 && (
        <EmptyState icon={esTi ? 'checkmark-done-outline' : 'document-outline'} text={esTi ? 'No hay reportes con ese filtro.' : 'Aún no has reportado nada. Si algo falla, usa el botón de arriba.'} />
      )}
      {lista.map((r) => (
        <Pressable key={r.id} onPress={() => nav.navigate('TiDetalle', { id: r.id })}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <Text style={[styles.muted, { fontSize: 12, fontWeight: '700' }]}>#{r.id} · {r.categoria}</Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>{fechaCorta(r.creadoEl)}</Text>
            </View>
            <Text style={[styles.body, { fontWeight: '700' }]} numberOfLines={2}>{r.asunto}</Text>
            {esTi && <Text style={[styles.muted, { marginTop: 2 }]}>{r.creador.nombre} · {r.creador.area || r.creador.cargo}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <EstadoChip estado={r.estado} />
              <UrgenciaChip urgencia={r.urgencia} />
              {r.mensajes.length > 0 && (
                <Text style={[styles.muted, { fontSize: 12 }]}>
                  <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} /> {r.mensajes.length}
                </Text>
              )}
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---------- Nuevo reporte ----------

export function TiNuevoScreen({ navigation }: ScreenProps<'TiNuevo'>) {
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_TI[0]);
  const [urgencia, setUrgencia] = useState<UrgenciaTi>('Media');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    try {
      await crearReporteTi({ categoria, urgencia, asunto: asunto.trim(), descripcion: descripcion.trim() });
      showAlert('Reporte enviado', 'El equipo de TI ya lo puede ver. Te responderán en este mismo reporte.');
      navigation.goBack();
    } catch (e: any) {
      showAlert('No se pudo enviar el reporte', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const listo = asunto.trim().length >= 3 && descripcion.trim().length >= 5;

  return (
    <KeyboardAwareScrollView bottomOffset={24} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>¿Con qué tiene que ver?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {CATEGORIAS_TI.map((c) => (
          <Pressable key={c} onPress={() => setCategoria(c)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: categoria === c ? colors.primary : colors.border, backgroundColor: categoria === c ? colors.primarySoft : colors.card }}>
            <Text style={{ color: categoria === c ? colors.primary : colors.text, fontWeight: '600' }}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>¿Qué tan urgente es?</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        {URGENCIAS_TI.map((u) => (
          <Pressable key={u} onPress={() => setUrgencia(u)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: urgencia === u ? urgenciaColor[u] : colors.border, backgroundColor: urgencia === u ? urgenciaColor[u] + '1A' : colors.card }}>
            <Ionicons name="flag" size={16} color={urgenciaColor[u]} />
            <Text style={{ fontWeight: '700', color: colors.text, marginTop: 2 }}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.muted, { fontSize: 12, marginBottom: 18 }]}>
        {urgencia === 'Alta' ? 'No puedes trabajar o afecta a varias personas.' : urgencia === 'Media' ? 'Puedes trabajar, pero con dificultad.' : 'Es una molestia o una mejora; puede esperar.'}
      </Text>

      <Input label="Asunto" placeholder="Ej.: El computador no enciende" value={asunto} onChangeText={setAsunto} maxLength={160} />
      <Input label="Describe el problema" placeholder="¿Qué pasó? ¿Desde cuándo? ¿Aparece algún mensaje?" multiline value={descripcion} onChangeText={setDescripcion} maxLength={4000} />

      {enviando ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button title="Enviar a TI" icon="paper-plane-outline" disabled={!listo} onPress={enviar} />
      )}
    </KeyboardAwareScrollView>
  );
}

// ---------- Detalle y conversación ----------

export function TiDetalleScreen({ route, navigation }: ScreenProps<'TiDetalle'>) {
  const { role } = useApp();
  const headerHeight = useHeaderHeight();
  const { reportes, recargar } = useReportesTi();
  const [texto, setTexto] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const lista = useRef<ScrollView>(null);
  const r = reportes?.find((x) => x.id === route.params.id);
  const esTi = role === 'ti';

  useEffect(() => {
    if (r) navigation.setOptions({ title: `Reporte #${r.id}` });
  }, [navigation, r?.id]);

  useEffect(() => {
    setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80);
  }, [r?.mensajes.length]);

  if (!r) return <View style={[styles.screen, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>;

  const hacer = async (fn: () => Promise<unknown>) => {
    setTrabajando(true);
    try {
      await fn();
      await recargar();
    } catch (e: any) {
      showAlert('No se pudo completar la acción', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    hacer(() => enviarMensajeTi(r.id, t));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView ref={lista} contentContainerStyle={styles.content}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <EstadoChip estado={r.estado} />
            <UrgenciaChip urgencia={r.urgencia} />
          </View>
          <Text style={[styles.h1, { fontSize: 18 }]}>{r.asunto}</Text>
          <Text style={[styles.muted, { marginTop: 4 }]}>{r.categoria} · {r.creador.nombre}{r.creador.area ? ` · ${r.creador.area}` : ''}</Text>
          <Text style={[styles.body, { marginTop: 12, lineHeight: 22 }]}>{r.descripcion}</Text>
          <Text style={[styles.muted, { fontSize: 12, marginTop: 12 }]}>
            Enviado {fechaCorta(r.creadoEl)}
            {r.asignadoA ? ` · Atiende ${r.asignadoA}` : ' · Aún sin asignar'}
            {r.resueltoEl ? ` · Resuelto ${fechaCorta(r.resueltoEl)}` : ''}
          </Text>
        </Card>

        {esTi && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {r.estado === 'Abierto' && (
              <View style={{ flex: 1 }}><Button title="Tomar el caso" icon="hand-right-outline" disabled={trabajando} onPress={() => hacer(() => cambiarEstadoTi(r.id, 'En proceso'))} /></View>
            )}
            {r.estado === 'En proceso' && (
              <>
                <View style={{ flex: 1 }}><Button title="Devolver" variant="outline" disabled={trabajando} onPress={() => hacer(() => cambiarEstadoTi(r.id, 'Abierto'))} /></View>
                <View style={{ flex: 1 }}><Button title="Marcar resuelto" icon="checkmark" disabled={trabajando} onPress={() => hacer(() => cambiarEstadoTi(r.id, 'Resuelto'))} /></View>
              </>
            )}
            {r.estado === 'Resuelto' && (
              <View style={{ flex: 1 }}><Button title="Reabrir" variant="outline" icon="refresh" disabled={trabajando} onPress={() => hacer(() => cambiarEstadoTi(r.id, 'Abierto'))} /></View>
            )}
          </View>
        )}

        <SectionTitle>Conversación</SectionTitle>
        {r.mensajes.length === 0 && <Text style={styles.muted}>Todavía no hay mensajes. {esTi ? 'Escribe al compañero para pedir más datos o avisar cómo vas.' : 'TI te responderá aquí.'}</Text>}
        {r.mensajes.map((m) => (
          <View key={m.id} style={{ alignSelf: m.esTi === esTi ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 10 }}>
            <Text style={[styles.muted, { fontSize: 11, marginBottom: 2, textAlign: m.esTi === esTi ? 'right' : 'left' }]}>
              {m.autor}{m.esTi ? ' · TI' : ''} · {fechaCorta(m.creadoEl)}
            </Text>
            <View style={{ backgroundColor: m.esTi === esTi ? colors.primary : colors.card, padding: 10, paddingHorizontal: 14, borderRadius: radius.lg }}>
              <Text style={{ color: m.esTi === esTi ? '#fff' : colors.text, fontSize: 15 }}>{m.texto}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Composer value={texto} onChange={setTexto} onSend={enviar} placeholder="Escribe un mensaje..." />
    </KeyboardAvoidingView>
  );
}
