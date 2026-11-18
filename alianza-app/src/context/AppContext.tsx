import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  ME_ID, Post, Chat, Survey, FormRequest, Recognition, Training, Notification,
  initialPosts, initialChats, initialSurveys, initialRequests, initialRecognitions,
  initialTrainings, initialNotifications,
} from '../data/mock';
import {
  AppEvent, Goal, LeaveRequest, Ticket,
  initialEvents, initialGoals, initialLeaves, initialTickets, leaders, leaveTypes,
} from '../data/modules';
import { todayISO } from '../utils/dates';
import { setCurrentUser } from '../data/mock';
import { UserRole } from '../data/accounts';
import { InformeLeido } from '../sst/parseInforme';
import { InformeSST, cargarInformes, eliminarInforme, guardarInforme } from '../sst/storage';
import * as api from '../api/client';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type NewLeave = Pick<LeaveRequest, 'typeId' | 'start' | 'end' | 'days' | 'reason' | 'attachment'>;

type AppState = {
  loggedIn: boolean;
  role: UserRole;
  /** 'servidor': datos en la base de datos del PC. 'demo': sin servidor, datos solo en este teléfono. */
  modo: 'servidor' | 'demo';
  login: (account: { personId: string; role: UserRole }, modo: 'servidor' | 'demo') => void;
  logout: () => void;

  posts: Post[];
  addPost: (text: string, segment: string) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;

  chats: Chat[];
  sendMessage: (personId: string, text: string) => void;

  surveys: Survey[];
  vote: (surveyId: string, optionId: string) => void;

  requests: FormRequest[];
  submitRequest: (templateId: string, title: string, values: Record<string, string>) => void;
  setRequestStatus: (id: string, status: FormRequest['status']) => void;

  recognitions: Recognition[];
  addRecognition: (toId: string, value: string, message: string) => void;

  trainings: Training[];
  completeLesson: (trainingId: string) => void;

  notifications: Notification[];
  markAllRead: () => void;


  onboardingDone: string[];
  toggleOnboarding: (id: string) => void;

  climateAnswers: number[] | null;
  submitClimate: (answers: number[]) => void;

  leaves: LeaveRequest[];
  requestLeave: (r: NewLeave) => void;
  respondLeave: (id: string, status: 'Aprobada' | 'Rechazada', note?: string) => void;
  cancelLeave: (id: string) => void;

  tickets: Ticket[];
  createTicket: (categoryId: string, service: string, description: string) => void;
  replyTicket: (id: string, text: string) => void;

  events: AppEvent[];
  toggleAttend: (eventId: string) => void;

  goals: Goal[];
  updateGoal: (id: string, progress: number) => void;
  selfEvaluation: Record<string, number> | null;
  submitSelfEvaluation: (scores: Record<string, number>) => void;

  informes: InformeSST[];
  recargarInformes: () => Promise<void>;
  publicarInforme: (leido: InformeLeido, archivo: string, progreso?: (hechas: number, total: number) => void) => Promise<void>;
  borrarInforme: (id: string) => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>('colaborador');
  const [modo, setModo] = useState<'servidor' | 'demo'>('demo');
  const [informes, setInformes] = useState<InformeSST[]>(cargarInformes);
  const [posts, setPosts] = useState(initialPosts);
  const [chats, setChats] = useState(initialChats);
  const [surveys, setSurveys] = useState(initialSurveys);
  const [requests, setRequests] = useState(initialRequests);
  const [recognitions, setRecognitions] = useState(initialRecognitions);
  const [trainings, setTrainings] = useState(initialTrainings);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [onboardingDone, setOnboardingDone] = useState<string[]>(['ob1']);
  const [climateAnswers, setClimateAnswers] = useState<number[] | null>(null);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [tickets, setTickets] = useState(initialTickets);
  const [events, setEvents] = useState(initialEvents);
  const [goals, setGoals] = useState(initialGoals);
  const [selfEvaluation, setSelfEvaluation] = useState<Record<string, number> | null>(null);

  const notify = (text: string, icon: string) =>
    setNotifications((n) => [{ id: uid(), text, time: 'Ahora', read: false, icon }, ...n]);

  const value: AppState = {
    loggedIn,
    role,
    modo,
    login: (account, modoSesion) => {
      setCurrentUser(account.personId);
      setRole(account.role);
      setModo(modoSesion);
      // En modo demo los informes viven en el teléfono; con servidor se piden al entrar
      setInformes(modoSesion === 'demo' ? cargarInformes() : []);
      setLoggedIn(true);
    },
    logout: () => {
      if (modo === 'servidor') api.cerrarSesionServidor();
      setInformes([]);
      setLoggedIn(false);
    },

    posts,
    addPost: (text, segment) =>
      setPosts((p) => [{ id: uid(), authorId: ME_ID, text, segment, time: 'Ahora', likes: [], comments: [] }, ...p]),
    toggleLike: (postId) =>
      setPosts((p) =>
        p.map((post) =>
          post.id !== postId
            ? post
            : { ...post, likes: post.likes.includes(ME_ID) ? post.likes.filter((l) => l !== ME_ID) : [...post.likes, ME_ID] },
        ),
      ),
    addComment: (postId, text) =>
      setPosts((p) =>
        p.map((post) =>
          post.id !== postId
            ? post
            : { ...post, comments: [...post.comments, { id: uid(), authorId: ME_ID, text, time: 'Ahora' }] },
        ),
      ),

    chats,
    sendMessage: (personId, text) =>
      setChats((c) => {
        const msg = { id: uid(), fromId: ME_ID, text, time: now() };
        const existing = c.find((ch) => ch.personId === personId);
        if (!existing) return [{ id: uid(), personId, messages: [msg] }, ...c];
        return [
          { ...existing, messages: [...existing.messages, msg] },
          ...c.filter((ch) => ch.id !== existing.id),
        ];
      }),

    surveys,
    vote: (surveyId, optionId) =>
      setSurveys((s) =>
        s.map((sv) =>
          sv.id !== surveyId || sv.votedOption
            ? sv
            : {
                ...sv,
                votedOption: optionId,
                options: sv.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
              },
        ),
      ),

    requests,
    submitRequest: (templateId, title, values) => {
      setRequests((r) => [
        { id: uid(), templateId, title, values, status: 'Pendiente', date: 'Hoy', requesterId: ME_ID },
        ...r,
      ]);
      notify(`Tu solicitud "${title}" fue enviada`, 'paper-plane-outline');
    },
    setRequestStatus: (id, status) =>
      setRequests((r) => r.map((req) => (req.id === id ? { ...req, status } : req))),

    recognitions,
    addRecognition: (toId, val, message) =>
      setRecognitions((r) => [{ id: uid(), fromId: ME_ID, toId, value: val, message, time: 'Ahora' }, ...r]),

    trainings,
    completeLesson: (trainingId) =>
      setTrainings((t) =>
        t.map((tr) =>
          tr.id === trainingId ? { ...tr, completed: Math.min(tr.completed + 1, tr.lessons.length) } : tr,
        ),
      ),

    notifications,
    markAllRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),


    onboardingDone,
    toggleOnboarding: (id) =>
      setOnboardingDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id])),

    climateAnswers,
    submitClimate: (answers) => setClimateAnswers(answers),

    leaves,
    requestLeave: (r) => {
      const type = leaveTypes.find((t) => t.id === r.typeId)!;
      setLeaves((l) => [
        { ...r, id: uid(), requesterId: ME_ID, approverId: leaders[ME_ID], status: 'Pendiente', createdAt: todayISO() },
        ...l,
      ]);
      notify(`Tu solicitud de ${type.name.toLowerCase()} fue enviada a tu líder para aprobación`, 'calendar-outline');
    },
    respondLeave: (id, status, note) =>
      setLeaves((l) => l.map((x) => (x.id === id ? { ...x, status, responseNote: note } : x))),
    cancelLeave: (id) => setLeaves((l) => l.map((x) => (x.id === id ? { ...x, status: 'Cancelada' } : x))),

    tickets,
    createTicket: (categoryId, service, description) => {
      const id = uid();
      setTickets((t) => [
        {
          id, categoryId, service, description, status: 'Abierto', createdAt: 'Hoy',
          messages: [{ id: uid(), fromId: ME_ID, text: description, time: now() }],
        },
        ...t,
      ]);
      // Simula que el área responsable toma el caso
      setTimeout(
        () =>
          setTickets((t) =>
            t.map((x) =>
              x.id !== id
                ? x
                : {
                    ...x,
                    status: 'En proceso',
                    messages: [...x.messages, { id: uid(), fromId: 'bot', text: 'Recibimos tu caso ✅ Un agente ya lo está revisando.', time: now() }],
                  },
            ),
          ),
        1500,
      );
    },
    replyTicket: (id, text) =>
      setTickets((t) =>
        t.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { id: uid(), fromId: ME_ID, text, time: now() }] } : x)),
      ),

    events,
    toggleAttend: (eventId) =>
      setEvents((e) =>
        e.map((ev) =>
          ev.id !== eventId
            ? ev
            : { ...ev, attendees: ev.attendees.includes(ME_ID) ? ev.attendees.filter((a) => a !== ME_ID) : [...ev.attendees, ME_ID] },
        ),
      ),

    goals,
    updateGoal: (id, progress) => setGoals((g) => g.map((x) => (x.id === id ? { ...x, progress } : x))),
    selfEvaluation,
    submitSelfEvaluation: (scores) => setSelfEvaluation(scores),

    informes,
    recargarInformes: async () => {
      if (modo === 'servidor' && (role === 'sst' || role === 'administracion')) {
        setInformes(await api.listarInformes());
      }
    },
    publicarInforme: async (leido, archivo, progreso) => {
      if (modo === 'servidor') {
        await api.publicarEnServidor(leido, archivo, progreso ?? (() => {}));
        setInformes(await api.listarInformes());
      } else {
        setInformes((prev) => guardarInforme(leido, { archivo, subidoPor: ME_ID }, prev));
      }
      notify(`Se publicó el informe "${leido.titulo}" con ${leido.hallazgos.length} hallazgos`, 'document-text-outline');
    },
    borrarInforme: async (id) => {
      if (modo === 'servidor') {
        await api.borrarInformeServidor(id);
        setInformes((prev) => prev.filter((x) => x.id !== id));
      } else {
        setInformes((prev) => eliminarInforme(id, prev));
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
