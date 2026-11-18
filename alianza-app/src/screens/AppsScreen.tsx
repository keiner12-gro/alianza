import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useEsEscritorio } from '../utils/layout';
import { ME_ID } from '../data/mock';
import { RootStackParamList, useNav } from '../navigation/types';

type AppItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  to: keyof RootStackParamList;
  badge?: number;
};

export default function AppsScreen() {
  const nav = useNav();
  const escritorio = useEsEscritorio();
  const { surveys, leaves, role } = useApp();
  const pendingSurveys = surveys.filter((s) => !s.votedOption).length;
  const pendingApprovals = leaves.filter((l) => l.approverId === ME_ID && l.requesterId !== ME_ID && l.status === 'Pendiente').length;

  // Herramientas según el perfil con que se inició sesión
  const areaTi: AppItem = { label: role === 'ti' ? 'Cola de reportes TI' : 'Área TI', icon: 'desktop', color: '#0EA5E9', to: 'TiReportes' };
  const porRol: AppItem[] =
    role === 'sst'
      ? [
          { label: 'Informes SST', icon: 'shield-checkmark', color: '#0E9F6E', to: 'SstInformes' },
          { label: 'Informe general SST', icon: 'stats-chart', color: '#B45309', to: 'InformeGeneral' },
          areaTi,
        ]
      : role === 'administracion'
        ? [{ label: 'Informe general SST', icon: 'stats-chart', color: '#B45309', to: 'InformeGeneral' }, areaTi]
        : role === 'ti'
          ? [areaTi]
          : [];

  const apps: AppItem[] = [
    ...porRol,
    { label: 'Formularios y Trámites', icon: 'clipboard', color: '#A78BFA', to: 'Forms' },
    { label: 'Mis documentos', icon: 'document-text', color: '#F472B6', to: 'MyDocuments' },
    { label: 'Encuestas', icon: 'checkmark-done', color: '#8B5CF6', to: 'Surveys', badge: pendingSurveys },
    { label: 'Vacaciones y permisos', icon: 'calendar', color: '#6E85F0', to: 'Leaves', badge: pendingApprovals },
    { label: 'Desempeño', icon: 'rocket', color: '#FBBF24', to: 'Performance' },
    { label: 'Portal de servicios', icon: 'file-tray-full', color: '#8B5CF6', to: 'ServicePortal' },
    { label: 'Eventos', icon: 'star', color: '#22A6B3', to: 'Events' },
    { label: 'Librerías', icon: 'book', color: '#93A5F5', to: 'Files' },
    { label: 'Revista', icon: 'newspaper', color: '#60A5FA', to: 'Magazine' },
    { label: 'Reconocimientos', icon: 'ribbon', color: '#F59E0B', to: 'Recognitions' },
    { label: 'Entrenamientos', icon: 'school', color: '#EC4899', to: 'Trainings' },
    { label: 'Clima laboral', icon: 'happy', color: '#34D399', to: 'Climate' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 34, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 24 }}>Apps</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: escritorio ? 'flex-start' : 'space-between', rowGap: 18, columnGap: escritorio ? 24 : 0, maxWidth: escritorio ? 900 : undefined }}>
          {apps.map((a) => (
            <Pressable key={a.label} onPress={() => nav.navigate(a.to as any)} style={({ pressed }) => ({ width: escritorio ? 120 : '30%', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.card, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={a.icon} size={40} color={a.color} />
                {!!a.badge && (
                  <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.primary, minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={{ textAlign: 'center', color: '#4B5563', fontSize: 13.5, marginTop: 8, lineHeight: 18 }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
