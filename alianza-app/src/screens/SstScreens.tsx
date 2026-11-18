import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, FlatList, Platform } from 'react-native';
import FotoEvidencia from '../components/FotoEvidencia';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { colors, radius } from '../theme';
import { Badge, Button, Card, EmptyState, SectionTitle, getPerson, styles } from '../components/ui';
import { useApp } from '../context/AppContext';
import { EstadoHallazgo, Hallazgo, InformeLeido, parseInforme } from '../sst/parseInforme';
import { InformeSST } from '../sst/storage';
import {
  ESTADOS, contarPorEstado, diasAbierto, esPendiente, estadoColor, estadoIcon, formatoFecha, porArea, porMes, porcentajeCierre,
} from '../sst/analytics';
import { showAlert } from '../utils/alert';
import { ErrorApi } from '../api/client';
import { useEsEscritorio } from '../utils/layout';
import { ScreenProps, useNav } from '../navigation/types';

/** Vuelve a pedir los informes al servidor cada vez que se abre la pantalla (una sola vez por entrada). */
function useRecargarAlEntrar() {
  const { recargarInformes } = useApp();
  const ultima = useRef(recargarInformes);
  ultima.current = recargarInformes;
  useFocusEffect(
    useCallback(() => {
      ultima.current().catch(() => {});
    }, []),
  );
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return `${formatoFecha(iso.slice(0, 10))}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function EstadoBadge({ estado }: { estado: EstadoHallazgo }) {
  // El texto va en tinta oscura; el color lo lleva el icono (nunca solo color)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: estadoColor[estado] + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' }}>
      <Ionicons name={estadoIcon[estado] as any} size={13} color={estadoColor[estado]} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{estado}</Text>
    </View>
  );
}

/** Barra apilada horizontal con separación de 2px entre segmentos */
function StackedBar({ counts, total, height = 14 }: { counts: Partial<Record<EstadoHallazgo, number>>; total: number; height?: number }) {
  const segs = ESTADOS.filter((e) => (counts[e] ?? 0) > 0);
  return (
    <View style={{ flexDirection: 'row', height, gap: 2, borderRadius: 4, overflow: 'hidden' }}>
      {segs.map((e) => (
        <View key={e} style={{ flex: counts[e]!, backgroundColor: estadoColor[e] }} />
      ))}
      {total > 0 && segs.length === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
    </View>
  );
}

// ---------- SST: subir informes ----------

export function SstInformesScreen() {
  const nav = useNav();
  const { informes, publicarInforme, borrarInforme, modo } = useApp();
  useRecargarAlEntrar();
  const [leyendo, setLeyendo] = useState(false);
  const [subida, setSubida] = useState<{ hechas: number; total: number } | null>(null);
  const [preview, setPreview] = useState<{ leido: InformeLeido; archivo: string } | null>(null);

  const elegirArchivo = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [XLSX_MIME, 'application/vnd.ms-excel', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if (!asset.name.toLowerCase().endsWith('.xlsx')) {
      showAlert('Formato no compatible', 'El informe debe ser un archivo de Excel .xlsx. Si es .xls, ábrelo en Excel y guárdalo como .xlsx.');
      return;
    }
    setLeyendo(true);
    // Deja que se pinte el indicador antes de leer el archivo
    await new Promise((r) => setTimeout(r, 60));
    try {
      // En el navegador el selector entrega el archivo como objeto File; en el teléfono, una ruta
      const bytes = Platform.OS === 'web' && asset.file ? new Uint8Array(await asset.file.arrayBuffer()) : await new File(asset.uri).bytes();
      setPreview({ leido: parseInforme(bytes), archivo: asset.name });
    } catch (e: any) {
      showAlert('No se pudo leer el informe', e?.message ?? 'Revisa que el archivo no esté dañado.');
    } finally {
      setLeyendo(false);
    }
  };

  const publicar = async () => {
    if (!preview) return;
    setSubida({ hechas: 0, total: Object.keys(preview.leido.fotos).length });
    try {
      await publicarInforme(preview.leido, preview.archivo, (hechas, total) => setSubida({ hechas, total }));
      setPreview(null);
      showAlert(
        'Informe publicado',
        modo === 'servidor' ? 'Administración ya puede ver el informe general.' : 'Quedó guardado en este teléfono (modo demostración).',
      );
    } catch (e: any) {
      showAlert('No se pudo publicar el informe', e instanceof ErrorApi || e?.message ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setSubida(null);
    }
  };

  if (subida) {
    const pct = subida.total ? subida.hechas / subida.total : 0;
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.body, { marginTop: 14, fontWeight: '700' }]}>Publicando el informe…</Text>
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>
          {subida.total ? `Subiendo fotos: ${subida.hechas} de ${subida.total}` : 'Guardando los hallazgos'}
        </Text>
        <View style={{ alignSelf: 'stretch', height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginTop: 16 }}>
          <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: colors.primary }} />
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginTop: 10 }]}>No cierres la app hasta que termine.</Text>
      </View>
    );
  }

  if (leyendo) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.body, { marginTop: 14, fontWeight: '700' }]}>Leyendo el informe…</Text>
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>Estamos sacando los hallazgos y las fotos de evidencia.</Text>
      </View>
    );
  }

  if (preview) {
    const { leido, archivo } = preview;
    const c = contarPorEstado(leido.hallazgos);
    const areas = new Set(leido.hallazgos.map((h) => h.area)).size;
    const fotos = Object.keys(leido.fotos).length;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Revisa antes de publicar</Text>
        <Text style={[styles.muted, { marginBottom: 14, marginTop: 2 }]}>{archivo}</Text>
        <Card>
          <Text style={[styles.body, { fontWeight: '800', fontSize: 16 }]}>{leido.titulo}</Text>
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <MiniStat value={leido.hallazgos.length} label="Hallazgos" />
            <MiniStat value={areas} label="Áreas" />
            <MiniStat value={fotos} label="Fotos" />
          </View>
          <View style={{ marginTop: 14 }}>
            <StackedBar counts={c} total={leido.hallazgos.length} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {ESTADOS.filter((e) => c[e]).map((e) => (
              <Text key={e} style={styles.muted}>
                <Ionicons name={estadoIcon[e] as any} size={12} color={estadoColor[e]} /> {e}: {c[e]}
              </Text>
            ))}
          </View>
        </Card>
        {leido.advertencias.length > 0 && <Advertencias items={leido.advertencias} />}
        <View style={{ gap: 10, marginTop: 4 }}>
          <Button title="Publicar para Administración" icon="cloud-upload-outline" onPress={publicar} />
          <Button title="Cancelar" variant="outline" onPress={() => setPreview(null)} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ backgroundColor: '#E7F6EF' }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Ionicons name="shield-checkmark" size={32} color="#0E9F6E" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '800' }]}>Informes de Seguridad y Salud</Text>
            <Text style={[styles.muted, { marginTop: 2 }]}>
              Sube el Excel de hallazgos (como "Plan No Llore, Mame"). La app lo convierte en un informe general para Administración.
            </Text>
          </View>
        </View>
      </Card>
      {modo === 'demo' && (
        <Card style={{ backgroundColor: '#FFF8E6' }}>
          <Text style={[styles.body, { fontSize: 13 }]}>
            <Ionicons name="cloud-offline-outline" size={14} color="#B7791F" /> Modo demostración: sin conexión con el servidor, los informes se guardan solo en este teléfono.
          </Text>
        </Card>
      )}
      <Button title="Subir informe en Excel" icon="document-attach-outline" onPress={elegirArchivo} />
      <Text style={[styles.muted, { fontSize: 12, marginTop: 8, marginBottom: 6 }]}>
        Columnas que lee: ITEM, FECHA DE REPORTE, ÁREA, NOVEDAD, MEJORA CONTINUA (estado) y EVIDENCIA (fotos en la celda).
      </Text>

      <SectionTitle>Informes publicados</SectionTitle>
      {informes.length === 0 && <EmptyState icon="folder-open-outline" text="Todavía no has publicado informes." />}
      {informes.map((inf) => (
        <InformeRow
          key={inf.id}
          informe={inf}
          onPress={() => nav.navigate('InformeGeneral', { informeId: inf.id })}
          onDelete={() =>
            showAlert('Eliminar informe', `¿Eliminar "${inf.archivo}"? Administración dejará de verlo.`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => borrarInforme(inf.id).catch((e) => showAlert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.')) },
            ])
          }
        />
      ))}
    </ScrollView>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function InformeRow({ informe, onPress, onDelete }: { informe: InformeSST; onPress: () => void; onDelete?: () => void }) {
  const c = contarPorEstado(informe.hallazgos);
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Ionicons name="document-text" size={26} color="#0E9F6E" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '700' }]} numberOfLines={2}>{informe.archivo}</Text>
            <Text style={styles.muted}>Subido el {fechaHora(informe.subidoEl)} · {getPerson(informe.subidoPor).name}</Text>
          </View>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <View style={{ marginTop: 10 }}>
          <StackedBar counts={c} total={informe.hallazgos.length} height={8} />
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginTop: 6 }]}>
          {informe.hallazgos.length} hallazgos · {c.Cerrado} cerrados · {c.Abierto + c['En proceso']} pendientes
        </Text>
      </Card>
    </Pressable>
  );
}

function Advertencias({ items }: { items: string[] }) {
  return (
    <Card style={{ backgroundColor: '#FFF8E6' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name="warning" size={18} color="#B7791F" />
        <Text style={[styles.body, { fontWeight: '800' }]}>Revisar en el archivo</Text>
      </View>
      {items.map((a, i) => (
        <Text key={i} style={[styles.body, { fontSize: 13, marginBottom: 4 }]}>• {a}</Text>
      ))}
    </Card>
  );
}

// ---------- Administración: informe general ----------

export function InformeGeneralScreen({ route }: ScreenProps<'InformeGeneral'>) {
  const nav = useNav();
  const { informes } = useApp();
  useRecargarAlEntrar();
  const escritorio = useEsEscritorio();
  const [selId, setSelId] = useState(route.params?.informeId ?? informes[0]?.id);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [anchoGrafico, setAnchoGrafico] = useState(0);
  const informe = informes.find((i) => i.id === selId) ?? informes[0];

  const datos = useMemo(() => {
    if (!informe) return null;
    const hs = informe.hallazgos;
    return {
      c: contarPorEstado(hs),
      cierre: porcentajeCierre(hs),
      areas: porArea(hs),
      meses: porMes(hs),
      antiguos: hs.filter(esPendiente).sort((a, b) => (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999')).slice(0, 5),
    };
  }, [informe]);

  if (!informe || !datos) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <EmptyState icon="bar-chart-outline" text="Aún no hay informes. Cuando SST suba un informe, aquí verás el informe general." />
      </View>
    );
  }

  const { c, cierre, areas, meses, antiguos } = datos;
  const total = informe.hallazgos.length;
  const pendientes = c.Abierto + c['En proceso'];
  const maxArea = Math.max(...areas.map((a) => a.total), 1);
  const maxMes = Math.max(...meses.map((m) => m.count), 1);
  const mesActivo = meses.find((m) => m.key === mesSel);
  const pasoEtiqueta = Math.max(1, Math.ceil(meses.length / 6));
  const elegirMes = (x: number) => {
    if (!anchoGrafico || !meses.length) return;
    const i = Math.min(meses.length - 1, Math.max(0, Math.floor((x / anchoGrafico) * meses.length)));
    setMesSel(meses[i].key);
  };
  const verLista = (params: { estado?: EstadoHallazgo; area?: string } = {}) =>
    nav.navigate('Hallazgos', { informeId: informe.id, ...params });

  const cabecera = (
    <>
      {informes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {informes.map((i) => (
            <Pressable key={i.id} onPress={() => setSelId(i.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, marginRight: 8, backgroundColor: i.id === informe.id ? colors.primary : colors.card }}>
              <Text style={{ color: i.id === informe.id ? '#fff' : colors.text, fontWeight: '600' }}>{formatoFecha(i.subidoEl.slice(0, 10))}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={styles.h1}>{informe.titulo}</Text>
      <Text style={[styles.muted, { marginTop: 2, marginBottom: 14 }]}>
        Subido por {getPerson(informe.subidoPor).name} · {fechaHora(informe.subidoEl)}
      </Text>
    </>
  );
  const bloqueKpis = (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <Kpi value={total} label="Hallazgos reportados" icon="flag" color={colors.primary} onPress={() => verLista()} />
        <Kpi value={pendientes} label="Pendientes" icon="alert-circle" color={estadoColor.Abierto} onPress={() => verLista({ estado: 'Abierto' })} />
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.muted}>Porcentaje de cierre</Text>
            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.text }}>{Math.round(cierre * 100)} %</Text>
          </View>
          <Text style={[styles.muted, { marginBottom: 6 }]}>{c.Cerrado} de {total} reportados</Text>
        </View>
        <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginTop: 6 }}>
          <View style={{ width: `${Math.round(cierre * 100)}%`, height: '100%', backgroundColor: estadoColor.Cerrado, borderRadius: 5 }} />
        </View>
      </Card>
    </>
  );
  const bloqueEstado = (
    <>
      <SectionTitle>Estado de los hallazgos</SectionTitle>
      <Card>
        <StackedBar counts={c} total={total} height={18} />
        <View style={{ marginTop: 12 }}>
          {ESTADOS.filter((e) => c[e] > 0).map((e) => (
            <Pressable key={e} onPress={() => verLista({ estado: e })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 }}>
              <Ionicons name={estadoIcon[e] as any} size={18} color={estadoColor[e]} />
              <Text style={[styles.body, { flex: 1 }]}>{e}</Text>
              <Text style={[styles.body, { fontWeight: '800' }]}>{c[e]}</Text>
              <Text style={[styles.muted, { width: 44, textAlign: 'right' }]}>{Math.round((c[e] / total) * 100)} %</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
  const bloqueAreas = (
    <>
      <SectionTitle>Hallazgos por área</SectionTitle>
      <Card>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 10 }]}>Ordenadas por pendientes. Toca un área para ver sus hallazgos.</Text>
        {areas.map((a) => (
          <Pressable key={a.area} onPress={() => verLista({ area: a.area })} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
              <Text style={[styles.body, { fontSize: 13, fontWeight: '600', flex: 1 }]} numberOfLines={1}>{a.area}</Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>
                {a.pendientes > 0 ? `${a.pendientes} pend. · ` : ''}{a.total}
              </Text>
            </View>
            <View style={{ width: `${(a.total / maxArea) * 100}%` }}>
              <StackedBar counts={a} total={a.total} height={10} />
            </View>
          </Pressable>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {ESTADOS.filter((e) => c[e] > 0).map((e) => (
            <View key={e} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: estadoColor[e] }} />
              <Text style={[styles.muted, { fontSize: 12 }]}>{e}</Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
  const bloqueMeses = (
    <>
      {meses.length > 0 && (
        <>
          <SectionTitle>Reportes por mes</SectionTitle>
          <Card>
            <Text style={[styles.body, { fontWeight: '700', minHeight: 20 }]}>
              {mesActivo ? `${mesActivo.label}: ${mesActivo.count} ${mesActivo.count === 1 ? 'reporte' : 'reportes'}` : 'Toca o desliza sobre el gráfico para ver cada mes'}
            </Text>
            <View
              style={{ marginTop: 10 }}
              onLayout={(e) => setAnchoGrafico(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => elegirMes(e.nativeEvent.locationX)}
              onResponderMove={(e) => elegirMes(e.nativeEvent.locationX)}
            >
              <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 2, borderBottomWidth: 1, borderBottomColor: '#C3C2B7' }}>
                {meses.map((m) => (
                  <View key={m.key} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                    {m.count > 0 && (
                      <View style={{ height: `${(m.count / maxMes) * 100}%`, backgroundColor: m.key === mesSel ? colors.primaryDark : colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                    )}
                  </View>
                ))}
              </View>
              <View pointerEvents="none" style={{ height: 18 }}>
                {meses.map((m, i) =>
                  i % pasoEtiqueta === 0 ? (
                    <Text key={m.key} style={{ position: 'absolute', top: 4, left: `${(i / meses.length) * 100}%`, width: 44, fontSize: 9, color: colors.textMuted }}>
                      {m.label}
                    </Text>
                  ) : null,
                )}
              </View>
            </View>
            <Text style={[styles.muted, { fontSize: 11, marginTop: 6 }]}>
              De {meses[0].label} a {meses[meses.length - 1].label} · desliza el dedo sobre el gráfico para ver cada mes
            </Text>
          </Card>
        </>
      )}
    </>
  );
  const bloqueAntiguos = (
    <>
      {antiguos.length > 0 && (
        <>
          <SectionTitle>Pendientes más antiguos</SectionTitle>
          {antiguos.map((h) => (
            <HallazgoRow key={h.item} h={h} onPress={() => nav.navigate('HallazgoDetalle', { informeId: informe.id, item: h.item })} />
          ))}
        </>
      )}
    </>
  );
  const bloqueCalidad = (
    <>
      {informe.advertencias.length > 0 && (
        <>
          <SectionTitle>Calidad del archivo</SectionTitle>
          <Advertencias items={informe.advertencias} />
        </>
      )}
    </>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, escritorio && { maxWidth: 1280 }]}>
      {cabecera}
      {escritorio ? (
        // PC: dos columnas. Izquierda: resumen y evolución. Derecha: dónde están los pendientes.
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            {bloqueKpis}
            {bloqueEstado}
            {bloqueMeses}
            {bloqueCalidad}
          </View>
          <View style={{ flex: 1 }}>
            {bloqueAreas}
            {bloqueAntiguos}
          </View>
        </View>
      ) : (
        <>
          {bloqueKpis}
          {bloqueEstado}
          {bloqueAreas}
          {bloqueMeses}
          {bloqueAntiguos}
          {bloqueCalidad}
        </>
      )}

      <Button title="Ver todos los hallazgos" icon="list" onPress={() => verLista()} />
    </ScrollView>
  );
}

function Kpi({ value, label, icon, color, onPress }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 }}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 4 }}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </Pressable>
  );
}

function HallazgoRow({ h, onPress }: { h: Hallazgo; onPress: () => void }) {
  const dias = esPendiente(h) ? diasAbierto(h) : null;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
        {h.foto ? (
          <FotoEvidencia foto={h.foto} style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg }} />
        ) : (
          <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.muted, { fontSize: 11, fontWeight: '700' }]} numberOfLines={1}>#{h.item} · {h.area}</Text>
          <Text style={[styles.body, { fontSize: 14 }]} numberOfLines={2}>{h.novedad}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <EstadoBadge estado={h.estado} />
            <Text style={[styles.muted, { fontSize: 11 }]}>
              {formatoFecha(h.fecha)}{dias !== null ? ` · ${dias} días` : ''}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// ---------- Lista y detalle de hallazgos ----------

export function HallazgosScreen({ route }: ScreenProps<'Hallazgos'>) {
  const nav = useNav();
  const { informes } = useApp();
  const informe = informes.find((i) => i.id === route.params.informeId);
  const [estado, setEstado] = useState<EstadoHallazgo | null>(route.params.estado ?? null);
  const [area, setArea] = useState<string | null>(route.params.area ?? null);
  if (!informe) return null;

  const c = contarPorEstado(informe.hallazgos);
  const areas = [...new Set(informe.hallazgos.map((h) => h.area))];
  const lista = informe.hallazgos.filter((h) => (!estado || h.estado === estado) && (!area || h.area === area));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={lista}
      keyExtractor={(h) => String(h.item)}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Chip label={`Todos (${informe.hallazgos.length})`} active={!estado} onPress={() => setEstado(null)} />
            {ESTADOS.filter((e) => c[e] > 0).map((e) => (
              <Chip key={e} label={`${e} (${c[e]})`} active={estado === e} onPress={() => setEstado(estado === e ? null : e)} dot={estadoColor[e]} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Chip label="Todas las áreas" active={!area} onPress={() => setArea(null)} />
            {areas.map((a) => (
              <Chip key={a} label={a} active={area === a} onPress={() => setArea(area === a ? null : a)} />
            ))}
          </ScrollView>
          <Text style={styles.muted}>{lista.length} {lista.length === 1 ? 'hallazgo' : 'hallazgos'}</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="search-outline" text="No hay hallazgos con esos filtros." />}
      renderItem={({ item }) => (
        <HallazgoRow h={item} onPress={() => nav.navigate('HallazgoDetalle', { informeId: informe.id, item: item.item })} />
      )}
    />
  );
}

function Chip({ label, active, onPress, dot }: { label: string; active: boolean; onPress: () => void; dot?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, marginRight: 8, backgroundColor: active ? colors.primary : colors.card }}
    >
      {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function HallazgoDetalleScreen({ route, navigation }: ScreenProps<'HallazgoDetalle'>) {
  const { informes } = useApp();
  const informe = informes.find((i) => i.id === route.params.informeId);
  const h = informe?.hallazgos.find((x) => x.item === route.params.item);
  React.useEffect(() => {
    if (h) navigation.setOptions({ title: `Hallazgo #${h.item}` });
  }, [navigation, h]);
  if (!h) return null;
  const dias = esPendiente(h) ? diasAbierto(h) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {h.foto ? (
        <FotoEvidencia foto={h.foto} resizeMode="contain" style={{ width: '100%', height: 320, borderRadius: radius.lg, backgroundColor: '#111827', marginBottom: 12 }} />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons name="image-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.muted, { marginTop: 6 }]}>Este hallazgo no tiene foto de evidencia.</Text>
        </Card>
      )}
      <Card>
        <EstadoBadge estado={h.estado} />
        <Text style={[styles.body, { fontSize: 16, marginTop: 10, lineHeight: 23 }]}>{h.novedad}</Text>
      </Card>
      <Card>
        <Fila icon="location-outline" label="Área" value={h.area} />
        <Fila icon="calendar-outline" label="Fecha de reporte" value={formatoFecha(h.fecha)} />
        {dias !== null && <Fila icon="hourglass-outline" label="Tiempo sin cerrar" value={`${dias} días`} />}
        {h.notaEvidencia && <Fila icon="chatbox-ellipses-outline" label="Evidencia" value={h.notaEvidencia} />}
      </Card>
    </ScrollView>
  );
}

function Fila({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 7 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={[styles.body, { fontWeight: '600' }]}>{value}</Text>
      </View>
    </View>
  );
}
