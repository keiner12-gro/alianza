import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { RootStackParamList, useNav } from './types';
import { useEsEscritorio } from '../utils/layout';

import LoginScreen from '../screens/LoginScreen';
import FeedScreen, { PostDetailScreen, NewPostScreen } from '../screens/FeedScreens';
import PeopleScreen, { PersonProfileScreen } from '../screens/PeopleScreens';
import ChatsScreen, { ChatRoomScreen } from '../screens/ChatScreens';
import NotificationsScreen from '../screens/NotificationsScreen';
import AppsScreen from '../screens/AppsScreen';
import ProfileTabScreen from '../screens/ProfileTabScreen';
import { SurveysScreen, ClimateScreen } from '../screens/SurveyScreens';
import { MagazineScreen, ArticleScreen, FilesScreen } from '../screens/ContentScreens';
import { FormsScreen, FormFillScreen, ApprovalsScreen } from '../screens/FormScreens';
import { RecognitionsScreen, NewRecognitionScreen } from '../screens/RecognitionScreens';
import { TrainingsScreen, TrainingDetailScreen, OnboardingScreen } from '../screens/LearningScreens';
import { LeavesScreen, NewLeaveScreen, LeaveDetailScreen } from '../screens/LeaveScreens';
import {
  MyDocumentsScreen, PerformanceScreen, ServicePortalScreen, NewTicketScreen, TicketDetailScreen,
  EventsScreen, EventDetailScreen,
} from '../screens/ModuleScreens';
import { TiReportesScreen, TiNuevoScreen, TiDetalleScreen } from '../screens/TiScreens';
import { SstInformesScreen, InformeGeneralScreen, HallazgosScreen, HallazgoDetalleScreen } from '../screens/SstScreens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home',
  Chats: 'chatbox-ellipses',
  Apps: 'grid',
  Perfil: 'person',
};

function HomeHeaderRight() {
  const nav = useNav();
  const { notifications } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <View style={{ flexDirection: 'row', gap: 18, marginRight: 16 }}>
      <Pressable onPress={() => nav.navigate('People')} hitSlop={8}>
        <Ionicons name="search-outline" size={24} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={8}>
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
        {unread > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: colors.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function Tabs() {
  const insets = useSafeAreaInsets();
  const escritorio = useEsEscritorio();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#4B5563',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        tabBarIcon: ({ color, size, focused }) => {
          const base = tabIcons[route.name];
          const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
          return (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={name} size={size} color={color} />
            </View>
          );
        },
        tabBarLabel: ({ color, focused }) => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{route.name}</Text>
            <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: focused ? colors.primary : 'transparent' }} />
          </View>
        ),
        tabBarStyle: escritorio
          ? { display: 'none' }
          : { height: 62 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 4 },
      })}
    >
      <Tab.Screen name="Inicio" component={FeedScreen} options={{ title: 'Alianza', headerRight: () => <HomeHeaderRight /> }} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Apps" component={AppsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Perfil" component={ProfileTabScreen} />
    </Tab.Navigator>
  );
}

type Acceso = { clave: string; etiqueta: string; icono: keyof typeof Ionicons.glyphMap; ir: (nav: any) => void };

/** Menú lateral fijo para el computador. En el teléfono no se usa (la barra inferior hace ese trabajo). */
function MarcoEscritorio({ state, navigation, children }: { state: any; navigation: any; children: React.ReactNode }) {
  const escritorio = useEsEscritorio();
  const { loggedIn, role } = useApp();
  if (!escritorio || !loggedIn) return <>{children}</>;

  const ruta = state.routes[state.index];
  const nombre = ruta.name === 'Tabs' ? getFocusedRouteNameFromRoute(ruta) ?? 'Inicio' : ruta.name;
  const activa = ['TiNuevo', 'TiDetalle'].includes(nombre) ? 'TiReportes' : ['Hallazgos', 'HallazgoDetalle'].includes(nombre) ? 'InformeGeneral' : nombre;

  const ir = (pestana: string) => (nav: any) => nav.navigate('Tabs', { screen: pestana });
  const accesos: Acceso[] = [
    { clave: 'Inicio', etiqueta: 'Inicio', icono: 'home-outline', ir: ir('Inicio') },
    { clave: 'Chats', etiqueta: 'Chats', icono: 'chatbox-ellipses-outline', ir: ir('Chats') },
    { clave: 'Apps', etiqueta: 'Apps', icono: 'grid-outline', ir: ir('Apps') },
    { clave: 'Perfil', etiqueta: 'Perfil', icono: 'person-outline', ir: ir('Perfil') },
  ];
  // Accesos directos a lo que cada perfil usa todos los días
  const atajos: Acceso[] = [
    ...(role === 'sst' ? [{ clave: 'SstInformes', etiqueta: 'Subir informes', icono: 'cloud-upload-outline' as const, ir: (nav: any) => nav.navigate('SstInformes') }] : []),
    ...(role === 'sst' || role === 'administracion'
      ? [{ clave: 'InformeGeneral', etiqueta: 'Informe general SST', icono: 'stats-chart-outline' as const, ir: (nav: any) => nav.navigate('InformeGeneral') }]
      : []),
  ];

  const tecnologia: Acceso[] = ['administracion', 'sst', 'ti'].includes(role)
    ? [{ clave: 'TiReportes', etiqueta: role === 'ti' ? 'Cola de reportes' : 'Área TI', icono: 'desktop-outline' as const, ir: (nav: any) => nav.navigate('TiReportes') }]
    : [];

  const item = (a: Acceso) => {
    const on = activa === a.clave;
    return (
      <Pressable
        key={a.clave}
        onPress={() => a.ir(navigation)}
        style={({ hovered }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: on ? colors.primarySoft : hovered ? colors.bg : 'transparent' })}
      >
        <Ionicons name={a.icono} size={21} color={on ? colors.primary : '#4B5563'} />
        <Text style={{ fontSize: 15, fontWeight: on ? '800' : '600', color: on ? colors.primary : colors.text }}>{a.etiqueta}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <View style={{ width: 240, backgroundColor: colors.card, borderRightWidth: 1, borderRightColor: colors.border, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 14 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={20} color="#fff" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Alianza</Text>
        </View>
        <View style={{ gap: 4 }}>{accesos.map(item)}</View>
        {atajos.length > 0 && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, marginTop: 22, marginBottom: 8, paddingHorizontal: 14 }}>SEGURIDAD Y SALUD</Text>
            <View style={{ gap: 4 }}>{atajos.map(item)}</View>
          </>
        )}
        {tecnologia.length > 0 && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, marginTop: 22, marginBottom: 8, paddingHorizontal: 14 }}>TECNOLOGÍA</Text>
            <View style={{ gap: 4 }}>{tecnologia.map(item)}</View>
          </>
        )}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default function RootNavigator() {
  const { loggedIn } = useApp();
  return (
    <Stack.Navigator
      layout={(p) => <MarcoEscritorio {...p} />}
      screenOptions={{ headerTintColor: colors.primary, headerTitleStyle: { color: colors.text, fontWeight: '700' }, headerBackTitle: 'Atrás' }}
    >
      {!loggedIn ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Publicación' }} />
          <Stack.Screen name="NewPost" component={NewPostScreen} options={{ title: 'Nueva publicación', presentation: 'modal' }} />
          <Stack.Screen name="People" component={PeopleScreen} options={{ title: 'Personas' }} />
          <Stack.Screen name="PersonProfile" component={PersonProfileScreen} options={{ title: 'Perfil' }} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Chat' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
          <Stack.Screen name="Surveys" component={SurveysScreen} options={{ title: 'Encuestas' }} />
          <Stack.Screen name="Climate" component={ClimateScreen} options={{ title: 'Clima laboral' }} />
          <Stack.Screen name="Magazine" component={MagazineScreen} options={{ title: 'Revista digital' }} />
          <Stack.Screen name="Article" component={ArticleScreen} options={{ title: '' }} />
          <Stack.Screen name="Files" component={FilesScreen} options={{ title: 'Librerías' }} />
          <Stack.Screen name="Forms" component={FormsScreen} options={{ title: 'Formularios y Trámites' }} />
          <Stack.Screen name="FormFill" component={FormFillScreen} options={{ title: 'Formulario' }} />
          <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Aprobaciones' }} />
          <Stack.Screen name="Recognitions" component={RecognitionsScreen} options={{ title: 'Reconocimientos' }} />
          <Stack.Screen name="NewRecognition" component={NewRecognitionScreen} options={{ title: 'Reconocer', presentation: 'modal' }} />
          <Stack.Screen name="Trainings" component={TrainingsScreen} options={{ title: 'Entrenamientos' }} />
          <Stack.Screen name="TrainingDetail" component={TrainingDetailScreen} options={{ title: 'Curso' }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Incorporación' }} />
          <Stack.Screen name="Leaves" component={LeavesScreen} options={{ title: 'Vacaciones y permisos' }} />
          <Stack.Screen name="NewLeave" component={NewLeaveScreen} options={{ title: 'Nueva solicitud', presentation: 'modal' }} />
          <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} options={{ title: 'Solicitud' }} />
          <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} options={{ title: 'Mis documentos' }} />
          <Stack.Screen name="Performance" component={PerformanceScreen} options={{ title: 'Desempeño' }} />
          <Stack.Screen name="ServicePortal" component={ServicePortalScreen} options={{ title: 'Portal de servicios' }} />
          <Stack.Screen name="NewTicket" component={NewTicketScreen} options={{ title: 'Nuevo caso' }} />
          <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Caso' }} />
          <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Eventos' }} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Evento' }} />
          <Stack.Screen name="SstInformes" component={SstInformesScreen} options={{ title: 'Informes SST' }} />
          <Stack.Screen name="InformeGeneral" component={InformeGeneralScreen} options={{ title: 'Informe general SST' }} />
          <Stack.Screen name="TiReportes" component={TiReportesScreen} options={{ title: 'Área TI' }} />
          <Stack.Screen name="TiNuevo" component={TiNuevoScreen} options={{ title: 'Reportar un problema', presentation: 'modal' }} />
          <Stack.Screen name="TiDetalle" component={TiDetalleScreen} options={{ title: 'Reporte' }} />
          <Stack.Screen name="Hallazgos" component={HallazgosScreen} options={{ title: 'Hallazgos' }} />
          <Stack.Screen name="HallazgoDetalle" component={HallazgoDetalleScreen} options={{ title: 'Hallazgo' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
