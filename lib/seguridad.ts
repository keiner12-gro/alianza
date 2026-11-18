import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (clave: string, sal: Buffer, largo: number, opc: { N: number; r: number; p: number }) => Promise<Buffer>;

export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

/** Corta la petición con un error que el cliente verá como { error: "..." }. */
export function fallar(estado: number, mensaje: string): never {
  throw new ErrorHttp(estado, mensaje);
}

// ---------- Respuestas ----------

export function responder(res: ServerResponse, estado: number, datos: unknown): void {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(datos));
}

/** Lee el cuerpo de la petición. Se corta si pasa del tamaño permitido. */
export async function leerCuerpo(req: IncomingMessage, maximo: number): Promise<Buffer> {
  const partes: Buffer[] = [];
  let total = 0;
  for await (const parte of req) {
    const b = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
    total += b.length;
    if (total > maximo) fallar(413, 'El envío es demasiado grande.');
    partes.push(b);
  }
  return Buffer.concat(partes);
}

export async function cuerpoJson(req: IncomingMessage, maximo = 2 * 1024 * 1024): Promise<Record<string, any>> {
  const crudo = await leerCuerpo(req, maximo);
  if (crudo.length === 0) fallar(400, 'Falta el cuerpo de la petición.');
  try {
    const datos = JSON.parse(crudo.toString('utf8'));
    if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) throw new Error();
    return datos;
  } catch {
    return fallar(400, 'El cuerpo no es un JSON válido.');
  }
}

// ---------- Contraseñas (scrypt, incluido en Node: sin dependencias) ----------

const COSTO = { N: 16384, r: 8, p: 1 };

export async function hashClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(clave, sal, 32, COSTO);
  return `scrypt$${COSTO.N}$${COSTO.r}$${COSTO.p}$${sal.toString('hex')}$${h.toString('hex')}`;
}

/** Siempre hace el cálculo completo, exista o no el usuario, para que el tiempo no revele si el correo existe. */
export async function verificarClave(clave: string, guardado: string | null): Promise<boolean> {
  const p = (guardado ?? '').split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') {
    await scrypt(clave, randomBytes(16), 32, COSTO);
    return false;
  }
  const calculado = await scrypt(clave, Buffer.from(p[4], 'hex'), 32, { N: Number(p[1]), r: Number(p[2]), p: Number(p[3]) });
  const esperado = Buffer.from(p[5], 'hex');
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/** Contraseña al azar fácil de leer (sin letras que se confunden). */
export function claveAleatoria(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(14);
  let s = '';
  for (const b of bytes) s += letras[b % letras.length];
  return s;
}

// ---------- Sesiones y firmas ----------

export const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');
export const nuevoToken = () => randomBytes(32).toString('hex');

export function igualesSeguro(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const secreto = () => {
  const s = process.env.SECRETO;
  if (!s || s.length < 32) throw new Error('Falta la variable SECRETO (mínimo 32 caracteres).');
  return s;
};

const firma = (id: number, exp: number) => createHmac('sha256', secreto()).update(`foto|${id}|${exp}`).digest('hex');

/**
 * Enlace firmado para ver una foto sin enviar la sesión (las imágenes de Android y del navegador no pueden
 * mandar cabeceras). Vale hasta 'e', solo para esa foto, y se redondea a la hora para poder usar la caché.
 */
export function enlaceFoto(hallazgoId: number): string {
  const exp = (Math.floor(Date.now() / 3600000) + 2) * 3600;
  return `/fotos/${hallazgoId}?e=${exp}&f=${firma(hallazgoId, exp)}`;
}

export function firmaFotoValida(hallazgoId: number, exp: string | null, f: string | null): boolean {
  if (!exp || !f || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return igualesSeguro(firma(hallazgoId, Number(exp)), f);
}

export const isoUtc = (s: string | null): string | null => (s ? s.replace(' ', 'T') + 'Z' : null);

/** Identifica el formato real de una imagen por sus primeros bytes (no por lo que diga el nombre). */
export function tipoDeImagen(b: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
