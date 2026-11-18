import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { UserRole } from '../data/accounts';
import type { InformeLeido } from '../sst/parseInforme';
import type { InformeSST } from '../sst/storage';

export type UsuarioServidor = {
  id: number;
  correo: string;
  nombre: string;
  cargo: string;
  area: string;
  rol: UserRole;
  personaId: string;
};

/** No se pudo hablar con el servidor (apagado, otra red, dirección mal escrita). */
export class ErrorRed extends Error {}
/** El servidor respondió con un error (credenciales, permisos, datos inválidos). */
export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

// El servidor corre en el PC con XAMPP. Esta es la dirección de ese PC en la red local;
// se puede cambiar desde la pantalla de inicio de sesión.
// En el navegador la API está en el mismo servidor que sirve la página. En la app del teléfono se usa la
// dirección fijada al compilar (variable SERVIDOR_URL de GitHub) y, si no hay, una de ejemplo.
// La persona puede cambiarla desde el inicio de sesión.
const URL_POR_DEFECTO =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}${process.env.EXPO_PUBLIC_API_PATH || '/alianza-api'}`
    : process.env.EXPO_PUBLIC_SERVIDOR_URL || 'http://192.168.0.10/alianza-api';
const archivoUrl = () => new File(Paths.document, 'servidor-url.txt');

/** ¿La dirección es de la red local (un PC con XAMPP) y no de Internet? */
const esRedLocal = (texto: string) => /^(https?:\/\/)?(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[^/:]+\.local)/i.test(texto);

/**
 * Acepta la dirección como la escriba la persona: "192.168.1.10" (PC con XAMPP) o "alianza.vercel.app" (Internet)
 * y completa el protocolo y la ruta de la API. Si ya trae ruta, la respeta.
 */
export function normalizarUrl(texto: string) {
  let u = texto.trim().replace(/\/+$/, '');
  if (!u) return URL_POR_DEFECTO;
  const local = esRedLocal(u);
  if (!/^https?:\/\//i.test(u)) u = (local ? 'http://' : 'https://') + u;
  if (!/^https?:\/\/[^/]+\/.+/i.test(u)) u += local ? '/alianza-api' : '/api';
  return u;
}

function leerUrlGuardada() {
  try {
    const f = archivoUrl();
    return f.exists ? normalizarUrl(f.textSync()) : URL_POR_DEFECTO;
  } catch {
    return URL_POR_DEFECTO;
  }
}

let base = leerUrlGuardada();
let token: string | null = null;

export const getServidor = () => base;

export function setServidor(texto: string) {
  base = normalizarUrl(texto);
  try {
    const f = archivoUrl();
    if (!f.exists) f.create();
    f.write(base);
  } catch {
    // Si no se puede guardar, la dirección vale solo para esta sesión
  }
  return base;
}

type Opciones = Omit<RequestInit, 'body'> & { body?: any; timeoutMs?: number };

async function pedir<T = any>(ruta: string, { timeoutMs = 15000, headers, ...init }: Opciones = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(base + ruta, {
      ...init,
      signal: ctrl.signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers as Record<string, string>) },
    });
  } catch {
    throw new ErrorRed(`No se pudo conectar con el servidor (${base}). Revisa que el PC esté encendido y en la misma red.`);
  } finally {
    clearTimeout(timer);
  }
  const texto = await res.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    // Respuesta que no es JSON (por ejemplo, una página de error de otro servidor)
  }
  if (!res.ok) throw new ErrorApi(res.status, datos?.error ?? `El servidor respondió con el error ${res.status}.`);
  return datos as T;
}

const json = { 'Content-Type': 'application/json' };

export async function iniciarSesion(correo: string, clave: string): Promise<UsuarioServidor> {
  const r = await pedir<{ token: string; usuario: UsuarioServidor }>('/login', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ correo, clave }),
  });
  token = r.token;
  return r.usuario;
}

export function cerrarSesionServidor() {
  const t = token;
  token = null;
  if (t) fetch(base + '/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
}

export async function listarInformes(): Promise<InformeSST[]> {
  const r = await pedir<{ informes: any[] }>('/informes');
  return r.informes.map((i) => ({
    ...i,
    hallazgos: i.hallazgos.map((h: any) => ({
      ...h,
      foto: h.foto ?? undefined,
      notaEvidencia: h.notaEvidencia ?? undefined,
    })),
  }));
}

export async function borrarInformeServidor(id: string) {
  await pedir(`/informes/${id}`, { method: 'DELETE' });
}

/** Crea el informe y sube sus fotos una por una. Si algo falla a medias, no deja un informe incompleto. */
export async function publicarEnServidor(
  leido: InformeLeido,
  archivo: string,
  progreso: (hechas: number, total: number) => void,
): Promise<void> {
  const creado = await pedir<{ id: string }>('/informes', {
    method: 'POST',
    headers: json,
    timeoutMs: 60000,
    body: JSON.stringify({
      archivo,
      titulo: leido.titulo,
      resumenExcel: leido.resumenExcel,
      advertencias: leido.advertencias,
      hallazgos: leido.hallazgos.map(({ fotoZip, foto, ...h }) => h),
    }),
  });
  const conFoto = leido.hallazgos.filter((h) => h.fotoZip && leido.fotos[h.fotoZip]);
  progreso(0, conFoto.length);
  try {
    let hechas = 0;
    for (const h of conFoto) {
      // Subir la misma foto dos veces es seguro (se sobrescribe), así que se reintenta si la red falla
      for (let intento = 1; ; intento++) {
        try {
          await pedir(`/informes/${creado.id}/fotos/${h.item}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: leido.fotos[h.fotoZip!],
            timeoutMs: 90000,
          });
          break;
        } catch (e) {
          if (!(e instanceof ErrorRed) || intento >= 3) throw e;
        }
      }
      progreso(++hechas, conFoto.length);
    }
  } catch (e) {
    await borrarInformeServidor(creado.id).catch(() => {});
    throw e;
  }
}

/**
 * Fuente de imagen para <Image>. Las fotos del servidor llegan con un enlace firmado de corta duración,
 * porque las imágenes de Android y del navegador no pueden enviar la sesión.
 */
export function fotoSource(foto: string): { uri: string } {
  return { uri: foto.startsWith('/') ? base + foto : foto };
}

// ---------- Área TI ----------

export const CATEGORIAS_TI = ['Computador', 'Internet / red', 'Impresora', 'Correo', 'Software / sistema', 'Acceso / contraseña', 'Otro'] as const;
export const URGENCIAS_TI = ['Baja', 'Media', 'Alta'] as const;
export type UrgenciaTi = (typeof URGENCIAS_TI)[number];
export type EstadoTi = 'Abierto' | 'En proceso' | 'Resuelto';

export type ReporteTi = {
  id: number;
  categoria: string;
  urgencia: UrgenciaTi;
  asunto: string;
  descripcion: string;
  estado: EstadoTi;
  creador: { nombre: string; cargo: string; area: string };
  asignadoA: string | null;
  creadoEl: string;
  actualizadoEl: string;
  resueltoEl: string | null;
  mensajes: { id: number; autor: string; esTi: boolean; texto: string; creadoEl: string }[];
};

export async function listarReportesTi(): Promise<ReporteTi[]> {
  return (await pedir<{ reportes: ReporteTi[] }>('/ti/reportes')).reportes;
}

export function crearReporteTi(d: { categoria: string; urgencia: UrgenciaTi; asunto: string; descripcion: string }) {
  return pedir<{ id: number }>('/ti/reportes', { method: 'POST', headers: json, body: JSON.stringify(d) });
}

export function enviarMensajeTi(id: number, texto: string) {
  return pedir(`/ti/reportes/${id}/mensajes`, { method: 'POST', headers: json, body: JSON.stringify({ texto }) });
}

export function cambiarEstadoTi(id: number, estado: EstadoTi) {
  return pedir(`/ti/reportes/${id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ estado }) });
}
