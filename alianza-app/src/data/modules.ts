import { Message } from './mock';

// ---------- Vacaciones y permisos ----------

export type LeaveType = {
  id: string;
  name: string;
  icon: string;
  color: string;
  usesBalance: boolean; // descuenta del saldo de vacaciones
  requiresAttachment?: boolean;
  maxDays?: number;
  description: string;
};

export const leaveTypes: LeaveType[] = [
  { id: 'vac', name: 'Vacaciones', icon: 'sunny-outline', color: '#4F6BED', usesBalance: true, description: 'Descuenta de tu saldo de días disponibles.' },
  { id: 'per', name: 'Permiso personal', icon: 'time-outline', color: '#7C3AED', usesBalance: false, maxDays: 1, description: 'Hasta 1 día. Requiere aprobación de tu líder.' },
  { id: 'med', name: 'Cita médica', icon: 'medkit-outline', color: '#DB2777', usesBalance: false, maxDays: 1, requiresAttachment: true, description: 'Debes adjuntar el soporte de la cita.' },
  { id: 'cal', name: 'Calamidad doméstica', icon: 'home-outline', color: '#D97706', usesBalance: false, maxDays: 5, description: 'Hasta 5 días hábiles.' },
  { id: 'lut', name: 'Licencia de luto', icon: 'flower-outline', color: '#6B7280', usesBalance: false, maxDays: 5, requiresAttachment: true, description: '5 días hábiles según la ley. Adjunta el soporte.' },
  { id: 'cum', name: 'Día de cumpleaños', icon: 'gift-outline', color: '#059669', usesBalance: false, maxDays: 1, description: 'Un día libre en el mes de tu cumpleaños.' },
];

export type LeaveStatus = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada';

export type LeaveRequest = {
  id: string;
  requesterId: string;
  approverId: string;
  typeId: string;
  start: string; // YYYY-MM-DD
  end: string;
  days: number;
  reason: string;
  attachment?: string;
  status: LeaveStatus;
  createdAt: string;
  responseNote?: string;
};

export const VACATION_ENTITLEMENT = 15; // días hábiles por año

// Líder de cada persona: es quien aprueba sus solicitudes
export const leaders: Record<string, string> = {
  u1: 'u2', u8: 'u2', u9: 'u2', u3: 'u1', u4: 'u1', u5: 'u2', u6: 'u2', u7: 'u2', u2: 'u2',
};

export const initialLeaves: LeaveRequest[] = [
  { id: 'lv1', requesterId: 'u1', approverId: 'u2', typeId: 'vac', start: '2026-07-06', end: '2026-07-10', days: 5, reason: 'Viaje familiar', status: 'Aprobada', createdAt: '2026-06-15' },
  { id: 'lv2', requesterId: 'u1', approverId: 'u2', typeId: 'med', start: '2026-09-18', end: '2026-09-18', days: 1, reason: 'Control odontológico', attachment: 'cita.pdf', status: 'Aprobada', createdAt: '2026-09-15' },
  { id: 'lv3', requesterId: 'u3', approverId: 'u1', typeId: 'vac', start: '2026-12-21', end: '2026-12-31', days: 8, reason: 'Fin de año con la familia', status: 'Pendiente', createdAt: '2026-10-07' },
  { id: 'lv4', requesterId: 'u4', approverId: 'u1', typeId: 'per', start: '2026-10-16', end: '2026-10-16', days: 1, reason: 'Trámite personal en notaría', status: 'Pendiente', createdAt: '2026-10-08' },
];

// Festivos de Colombia (resto de 2026 y comienzo de 2027)
export const holidays = [
  '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-01-11', '2027-03-22',
];

// ---------- Mis documentos ----------

export type MyDoc = { id: string; name: string; category: 'Nómina' | 'Certificados' | 'Contrato'; date: string; isNew?: boolean };

export const myDocuments: MyDoc[] = [
  { id: 'd1', name: 'Desprendible de pago - Septiembre 2026', category: 'Nómina', date: '30 sep 2026', isNew: true },
  { id: 'd2', name: 'Desprendible de pago - Agosto 2026', category: 'Nómina', date: '31 ago 2026' },
  { id: 'd3', name: 'Desprendible de pago - Julio 2026', category: 'Nómina', date: '31 jul 2026' },
  { id: 'd4', name: 'Certificado de ingresos y retenciones 2025', category: 'Certificados', date: '15 mar 2026' },
  { id: 'd5', name: 'Certificado laboral', category: 'Certificados', date: '28 sep 2026' },
  { id: 'd6', name: 'Contrato de trabajo', category: 'Contrato', date: '2 feb 2024' },
];

// ---------- Desempeño ----------

export type Goal = { id: string; title: string; progress: number; due: string; weight: number };

export const initialGoals: Goal[] = [
  { id: 'g1', title: 'Reducir el tiempo de contratación a 20 días', progress: 0.6, due: '31 dic 2026', weight: 40 },
  { id: 'g2', title: 'Lanzar el programa de bienestar', progress: 0.9, due: '30 nov 2026', weight: 30 },
  { id: 'g3', title: 'Completar 3 cursos de formación', progress: 0.33, due: '31 dic 2026', weight: 30 },
];

export const evaluationCycle = {
  name: 'Evaluación de desempeño 2026',
  stage: 'Autoevaluación',
  deadline: '31 oct 2026',
  competencies: ['Trabajo en equipo', 'Comunicación', 'Orientación a resultados', 'Innovación', 'Servicio al cliente'],
};

export const feedbackReceived = [
  { id: 'fb1', fromId: 'u2', text: 'Excelente manejo de los procesos de selección este trimestre.', date: '2 oct 2026' },
  { id: 'fb2', fromId: 'u3', text: 'Siempre resuelves las dudas rápido. ¡Gracias!', date: '20 sep 2026' },
];

// ---------- Portal de servicios ----------

export type ServiceCategory = { id: string; name: string; icon: string; color: string; services: string[] };

export const serviceCategories: ServiceCategory[] = [
  { id: 'sc1', name: 'Tecnología', icon: 'laptop-outline', color: '#2563EB', services: ['Problema con mi equipo', 'Acceso a un sistema', 'Restablecer contraseña', 'Solicitar software'] },
  { id: 'sc2', name: 'Nómina', icon: 'wallet-outline', color: '#059669', services: ['Error en mi pago', 'Descuentos', 'Cesantías', 'Cambio de cuenta bancaria'] },
  { id: 'sc3', name: 'Bienestar', icon: 'heart-outline', color: '#DB2777', services: ['Beneficios', 'Auxilio educativo', 'Actividades'] },
  { id: 'sc4', name: 'Mantenimiento', icon: 'construct-outline', color: '#D97706', services: ['Daño en instalaciones', 'Aseo', 'Puesto de trabajo'] },
];

export type TicketStatus = 'Abierto' | 'En proceso' | 'Resuelto';

export type Ticket = {
  id: string;
  categoryId: string;
  service: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  messages: Message[];
};

export const initialTickets: Ticket[] = [
  {
    id: 'tk1', categoryId: 'sc1', service: 'Acceso a un sistema', description: 'Necesito acceso al módulo de nómina.', status: 'Resuelto', createdAt: '25 sep',
    messages: [
      { id: 'tm1', fromId: 'u1', text: 'Necesito acceso al módulo de nómina.', time: '25 sep' },
      { id: 'tm2', fromId: 'u3', text: 'Listo, ya tienes acceso. Cierra sesión y vuelve a entrar.', time: '25 sep' },
    ],
  },
];

// ---------- Eventos ----------

export type AppEvent = {
  id: string;
  title: string;
  date: string;
  day: string;
  month: string;
  time: string;
  place: string;
  description: string;
  attendees: string[];
  color: string;
};

export const initialEvents: AppEvent[] = [
  { id: 'e1', title: 'Capacitación: Excel avanzado', day: '22', month: 'OCT', date: 'Jueves 22 de octubre', time: '8:00 a.m.', place: 'Sala de juntas 2 / Virtual', description: 'Tablas dinámicas, fórmulas avanzadas y gráficos.', attendees: ['u6'], color: '#2563EB' },
  { id: 'e2', title: 'Celebración de Halloween', day: '30', month: 'OCT', date: 'Viernes 30 de octubre', time: '3:00 p.m.', place: 'Cafetería principal', description: 'Ven disfrazado. Habrá concurso de disfraces y premios 🎃', attendees: ['u3', 'u4', 'u5'], color: '#D97706' },
  { id: 'e3', title: 'Fiesta de fin de año', day: '11', month: 'DIC', date: 'Viernes 11 de diciembre', time: '7:00 p.m.', place: 'Club Campestre', description: 'Cena, música en vivo y rifas. ¡Confirma tu asistencia!', attendees: ['u2', 'u3', 'u4', 'u5', 'u6', 'u7'], color: '#7C3AED' },
];
