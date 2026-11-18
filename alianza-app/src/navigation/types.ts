import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EstadoHallazgo } from '../sst/parseInforme';

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  PostDetail: { postId: string };
  NewPost: undefined;
  People: undefined;
  PersonProfile: { personId: string };
  ChatRoom: { personId: string };
  Notifications: undefined;
  Surveys: undefined;
  Magazine: undefined;
  Article: { articleId: string };
  Forms: undefined;
  FormFill: { templateId: string };
  Approvals: undefined;
  Recognitions: undefined;
  NewRecognition: { toId?: string } | undefined;
  Files: undefined;
  Trainings: undefined;
  TrainingDetail: { trainingId: string };
  Onboarding: undefined;
  Climate: undefined;
  Leaves: undefined;
  NewLeave: undefined;
  LeaveDetail: { leaveId: string };
  MyDocuments: undefined;
  Performance: undefined;
  ServicePortal: undefined;
  NewTicket: { categoryId: string };
  TicketDetail: { ticketId: string };
  Events: undefined;
  EventDetail: { eventId: string };
  SstInformes: undefined;
  InformeGeneral: { informeId?: string } | undefined;
  TiReportes: undefined;
  TiNuevo: undefined;
  TiDetalle: { id: number };
  Hallazgos: { informeId: string; estado?: EstadoHallazgo; area?: string };
  HallazgoDetalle: { informeId: string; item: number };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export const useNav = () => useNavigation<NativeStackNavigationProp<RootStackParamList>>();
