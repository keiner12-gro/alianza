export type Person = {
  id: string;
  name: string;
  role: string;
  area: string;
  interests: string[];
  color: string;
  email: string;
  birthday: string;
};

export type Comment = { id: string; authorId: string; text: string; time: string };

export type Post = {
  id: string;
  authorId: string;
  text: string;
  time: string;
  likes: string[];
  comments: Comment[];
  pinned?: boolean;
  segment?: string;
};

export type Message = { id: string; fromId: string; text: string; time: string };
export type Chat = { id: string; personId: string; messages: Message[] };

export type Survey = {
  id: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  votedOption?: string;
  closes: string;
};

export type Article = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  date: string;
  color: string;
};

export type FormTemplate = {
  id: string;
  title: string;
  icon: string;
  fields: { key: string; label: string; multiline?: boolean }[];
};

export type FormRequest = {
  id: string;
  templateId: string;
  title: string;
  values: Record<string, string>;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  date: string;
  requesterId: string;
};

export type Recognition = {
  id: string;
  fromId: string;
  toId: string;
  value: string;
  message: string;
  time: string;
};

export type Training = {
  id: string;
  title: string;
  lessons: string[];
  completed: number;
  duration: string;
};

export type FileItem = { id: string; name: string; type: 'pdf' | 'doc' | 'xls' | 'img'; size: string; folder: string };

export type Notification = { id: string; text: string; time: string; read: boolean; icon: string };


// Usuario con la sesión abierta. Cambia al iniciar sesión (ver setCurrentUser).
export let ME_ID = 'u1';
export function setCurrentUser(personId: string) {
  ME_ID = personId;
}

export const people: Person[] = [
  { id: 'u1', name: 'Keiner Asprilla', role: 'Analista de Talento', area: 'Recursos Humanos', interests: ['Fútbol', 'Tecnología', 'Música'], color: '#4F46E5', email: 'keiner@alianza.co', birthday: '12 de marzo' },
  { id: 'u2', name: 'Laura Gómez', role: 'Gerente General', area: 'Dirección', interests: ['Lectura', 'Yoga'], color: '#DB2777', email: 'laura@alianza.co', birthday: '3 de junio' },
  { id: 'u3', name: 'Carlos Pérez', role: 'Desarrollador', area: 'Tecnología', interests: ['Tecnología', 'Videojuegos', 'Fútbol'], color: '#059669', email: 'carlos@alianza.co', birthday: '21 de octubre' },
  { id: 'u4', name: 'María Rodríguez', role: 'Diseñadora UX', area: 'Tecnología', interests: ['Arte', 'Música', 'Viajes'], color: '#D97706', email: 'maria@alianza.co', birthday: '9 de enero' },
  { id: 'u5', name: 'Andrés Torres', role: 'Coordinador de Ventas', area: 'Comercial', interests: ['Fútbol', 'Cocina'], color: '#2563EB', email: 'andres@alianza.co', birthday: '15 de agosto' },
  { id: 'u6', name: 'Sofía Martínez', role: 'Contadora', area: 'Finanzas', interests: ['Viajes', 'Lectura'], color: '#7C3AED', email: 'sofia@alianza.co', birthday: '28 de noviembre' },
  { id: 'u8', name: 'Paola Herrera', role: 'Coordinadora SST', area: 'Seguridad y Salud en el Trabajo', interests: ['Senderismo', 'Lectura'], color: '#0E9F6E', email: 'sst@alianza.co', birthday: '14 de abril' },
  { id: 'u9', name: 'Diego Morales', role: 'Director Administrativo', area: 'Administración', interests: ['Ciclismo', 'Finanzas'], color: '#B45309', email: 'administracion@alianza.co', birthday: '2 de septiembre' },
  { id: 'u10', name: 'Camilo Ruiz', role: 'Técnico de TI', area: 'Tecnología (TI)', interests: ['Tecnología', 'Videojuegos'], color: '#0EA5E9', email: 'ti@alianza.co', birthday: '30 de julio' },
  { id: 'u7', name: 'Julián Ramírez', role: 'Líder de Operaciones', area: 'Operaciones', interests: ['Ciclismo', 'Tecnología'], color: '#DC2626', email: 'julian@alianza.co', birthday: '5 de mayo' },
];

export const initialPosts: Post[] = [
  {
    id: 'p1', authorId: 'u2', pinned: true, segment: 'Toda la organización',
    text: '📢 ¡Bienvenidos a nuestra nueva comunidad digital! Aquí encontrarán anuncios, noticias y podrán conectar con todo el equipo. ¡Cuéntennos qué les parece!',
    time: 'Hace 2 h', likes: ['u3', 'u4', 'u5'],
    comments: [
      { id: 'c1', authorId: 'u3', text: '¡Excelente iniciativa! 🙌', time: 'Hace 1 h' },
      { id: 'c2', authorId: 'u6', text: 'Muy fácil de usar 👏', time: 'Hace 45 min' },
    ],
  },
  {
    id: 'p2', authorId: 'u7', segment: 'Operaciones',
    text: 'Este viernes tendremos mantenimiento en la planta de 2:00 p.m. a 5:00 p.m. Por favor planifiquen sus actividades. ⚙️',
    time: 'Hace 5 h', likes: ['u1'], comments: [],
  },
  {
    id: 'p3', authorId: 'u4',
    text: '🎉 ¡Feliz cumpleaños a Carlos! Que tengas un gran día 🎂🎈',
    time: 'Ayer', likes: ['u1', 'u2', 'u5', 'u6', 'u7'],
    comments: [{ id: 'c3', authorId: 'u3', text: '¡Gracias a todos! 😄', time: 'Ayer' }],
  },
];

export const initialChats: Chat[] = [
  {
    id: 'ch1', personId: 'u3',
    messages: [
      { id: 'm1', fromId: 'u3', text: 'Hola Keiner, ¿tienes el reporte de ingresos?', time: '9:10' },
      { id: 'm2', fromId: 'u1', text: '¡Hola! Sí, te lo envío en un rato.', time: '9:12' },
    ],
  },
  {
    id: 'ch2', personId: 'u2',
    messages: [{ id: 'm3', fromId: 'u2', text: 'Gracias por organizar la inducción 👏', time: 'Ayer' }],
  },
];

export const initialSurveys: Survey[] = [
  {
    id: 's1', question: '¿Qué actividad prefieres para la integración de fin de año?', closes: 'Cierra en 3 días',
    options: [
      { id: 'o1', label: 'Paseo al aire libre', votes: 12 },
      { id: 'o2', label: 'Cena formal', votes: 8 },
      { id: 'o3', label: 'Torneo deportivo', votes: 15 },
    ],
  },
  {
    id: 's2', question: '¿Qué horario prefieres para las capacitaciones?', closes: 'Cierra en 1 semana',
    options: [
      { id: 'o1', label: 'Mañana (8 a.m. - 10 a.m.)', votes: 20 },
      { id: 'o2', label: 'Tarde (3 p.m. - 5 p.m.)', votes: 9 },
    ],
  },
];

export const articles: Article[] = [
  {
    id: 'a1', title: 'Cerramos el trimestre con récord de ventas', category: 'Resultados', date: '8 oct 2026', color: '#2563EB',
    summary: 'El equipo comercial superó la meta en un 18 %.',
    body: 'Gracias al compromiso de todas las áreas, este trimestre alcanzamos el mejor resultado de nuestra historia. El equipo comercial superó la meta en un 18 %, y operaciones redujo los tiempos de entrega en un 12 %.\n\nQueremos agradecer a cada colaborador por su esfuerzo. ¡Vamos por más!',
  },
  {
    id: 'a2', title: 'Nuevo programa de bienestar', category: 'Bienestar', date: '1 oct 2026', color: '#059669',
    summary: 'Pausas activas, yoga y asesoría nutricional para todos.',
    body: 'A partir de este mes, todos los colaboradores tendrán acceso a pausas activas diarias, clases de yoga los miércoles y asesoría nutricional gratuita.\n\nInscríbete desde la sección de Formularios.',
  },
  {
    id: 'a3', title: 'Conoce a nuestro equipo de Tecnología', category: 'Cultura', date: '24 sep 2026', color: '#7C3AED',
    summary: 'Detrás de cada sistema hay personas apasionadas.',
    body: 'Este mes presentamos al equipo de Tecnología: las personas que mantienen nuestros sistemas funcionando y que desarrollaron esta app.\n\n¡Envíales un reconocimiento!',
  },
];

export const formTemplates: FormTemplate[] = [
  { id: 'f3', title: 'Certificado laboral', icon: 'document-text-outline', fields: [
    { key: 'dirigido', label: 'Dirigido a' }, { key: 'nota', label: 'Información adicional', multiline: true },
  ] },
  { id: 'f4', title: 'Reembolso de gastos', icon: 'cash-outline', fields: [
    { key: 'concepto', label: 'Concepto' }, { key: 'valor', label: 'Valor' }, { key: 'detalle', label: 'Detalle', multiline: true },
  ] },
  { id: 'f5', title: 'Actualización de datos', icon: 'person-circle-outline', fields: [
    { key: 'direccion', label: 'Nueva dirección' }, { key: 'telefono', label: 'Teléfono' }, { key: 'nota', label: 'Otros cambios', multiline: true },
  ] },
  { id: 'f6', title: 'Solicitud de préstamo', icon: 'wallet-outline', fields: [
    { key: 'valor', label: 'Valor solicitado' }, { key: 'cuotas', label: 'Número de cuotas' }, { key: 'motivo', label: 'Motivo', multiline: true },
  ] },
];

export const initialRequests: FormRequest[] = [
  { id: 'r1', templateId: 'f4', title: 'Reembolso de gastos', values: { concepto: 'Transporte', valor: '45.000' }, status: 'Pendiente', date: '5 oct', requesterId: 'u5' },
  { id: 'r2', templateId: 'f3', title: 'Certificado laboral', values: { dirigido: 'Banco' }, status: 'Aprobado', date: '28 sep', requesterId: 'u1' },
];

export const values = [
  { key: 'Trabajo en equipo', emoji: '🤝' },
  { key: 'Innovación', emoji: '💡' },
  { key: 'Compromiso', emoji: '💪' },
  { key: 'Servicio', emoji: '❤️' },
  { key: 'Integridad', emoji: '⭐' },
];

export const initialRecognitions: Recognition[] = [
  { id: 'rc1', fromId: 'u2', toId: 'u3', value: 'Innovación', message: 'Por desarrollar la nueva app en tiempo récord.', time: 'Hace 1 día' },
  { id: 'rc2', fromId: 'u5', toId: 'u4', value: 'Trabajo en equipo', message: 'Siempre dispuesta a ayudar al equipo comercial.', time: 'Hace 3 días' },
];

export const initialTrainings: Training[] = [
  { id: 't1', title: 'Seguridad y salud en el trabajo', duration: '45 min', completed: 2, lessons: ['Introducción', 'Riesgos laborales', 'Uso de EPP', 'Plan de emergencias'] },
  { id: 't2', title: 'Atención al cliente', duration: '30 min', completed: 0, lessons: ['Comunicación efectiva', 'Manejo de quejas', 'Fidelización'] },
  { id: 't3', title: 'Protección de datos personales', duration: '20 min', completed: 3, lessons: ['Marco legal', 'Buenas prácticas', 'Evaluación'] },
];

export const onboardingSteps = [
  { id: 'ob1', title: 'Completa tu perfil', detail: 'Agrega tu foto e intereses.' },
  { id: 'ob2', title: 'Lee el reglamento interno', detail: 'Disponible en Archivos > Políticas.' },
  { id: 'ob3', title: 'Conoce a tu equipo', detail: 'Busca a tus compañeros en Personas.' },
  { id: 'ob4', title: 'Haz el curso de seguridad', detail: 'En Entrenamientos.' },
  { id: 'ob5', title: 'Reúnete con tu líder', detail: 'Agenda una reunión de bienvenida.' },
];

export const files: FileItem[] = [
  { id: 'fi1', name: 'Reglamento interno.pdf', type: 'pdf', size: '1,2 MB', folder: 'Políticas' },
  { id: 'fi2', name: 'Código de ética.pdf', type: 'pdf', size: '850 KB', folder: 'Políticas' },
  { id: 'fi3', name: 'Calendario 2026.xlsx', type: 'xls', size: '120 KB', folder: 'General' },
  { id: 'fi4', name: 'Manual de marca.pdf', type: 'pdf', size: '4,5 MB', folder: 'Comunicaciones' },
  { id: 'fi5', name: 'Formato de acta.docx', type: 'doc', size: '60 KB', folder: 'General' },
  { id: 'fi6', name: 'Logo Alianza.png', type: 'img', size: '300 KB', folder: 'Comunicaciones' },
];

export const initialNotifications: Notification[] = [
  { id: 'n1', text: 'Laura Gómez publicó un anuncio para toda la organización', time: 'Hace 2 h', read: false, icon: 'megaphone-outline' },
  { id: 'n2', text: 'Nueva encuesta: integración de fin de año', time: 'Hace 4 h', read: false, icon: 'bar-chart-outline' },
  { id: 'n3', text: 'Tu certificado laboral fue aprobado ✅', time: 'Ayer', read: true, icon: 'checkmark-circle-outline' },
  { id: 'n4', text: 'Nuevo artículo en la revista: récord de ventas', time: 'Ayer', read: true, icon: 'newspaper-outline' },
];


export const climateQuestions = [
  '¿Cómo te sientes hoy en el trabajo?',
  '¿Te sientes valorado por tu equipo?',
  '¿Tienes las herramientas necesarias para tu trabajo?',
  '¿Recomendarías la empresa como lugar para trabajar?',
];

