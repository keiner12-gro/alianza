import type { IncomingMessage, ServerResponse } from 'node:http';
import { conexionSinBase, db, ejecutar, nombreBaseDeDatos, q, transaccion } from './db';
import { ESQUEMA } from './esquema';
import {
  ErrorHttp, claveAleatoria, cuerpoJson, enlaceFoto, fallar, firmaFotoValida, hashClave, igualesSeguro,
  isoUtc, leerCuerpo, nuevoToken, responder, sha256, tipoDeImagen, verificarClave,
} from './seguridad';

const DIAS_SESION = 7;
const MAX_FOTO_BYTES = 4 * 1024 * 1024; // las funciones de Vercel aceptan hasta 4,5 MB por petición
const MAX_HALLAZGOS = 2000;
const ROLES = ['colaborador', 'sst', 'administracion', 'ti'] as const;
type Rol = (typeof ROLES)[number];
const ESTADOS_HALLAZGO = ['Abierto', 'En proceso', 'Cerrado', 'Cancelado', 'Sin estado'];

// Área TI: quién puede abrir reportes (el personal de oficina) y qué opciones existen
const ROLES_REPORTAN_TI: Rol[] = ['administracion', 'sst', 'ti'];
const CATEGORIAS_TI = ['Computador', 'Internet / red', 'Impresora', 'Correo', 'Software / sistema', 'Acceso / contraseña', 'Otro'];
const URGENCIAS_TI = ['Baja', 'Media', 'Alta'];
const ESTADOS_TI = ['Abierto', 'En proceso', 'Resuelto'];

type Usuario = { id: number; correo: string; nombre: string; cargo: string; area: string; rol: Rol; persona_id: string };

const usuarioPublico = (u: Usuario) => ({
  id: Number(u.id), correo: u.correo, nombre: u.nombre, cargo: u.cargo, area: u.area, rol: u.rol, personaId: u.persona_id,
});

async function usuarioActual(req: IncomingMessage): Promise<Usuario> {
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(String(req.headers.authorization ?? ''));
  if (!m) fallar(401, 'Debes iniciar sesión.');
  const filas = await q(
    `SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_el > UTC_TIMESTAMP() AND u.activo = 1`,
    [sha256(m![1].toLowerCase())],
  );
  if (!filas[0]) fallar(401, 'La sesión venció. Vuelve a iniciar sesión.');
  return filas[0];
}

function exigirRol(u: Usuario, roles: readonly Rol[]) {
  if (!roles.includes(u.rol)) fallar(403, 'Tu perfil no tiene permiso para esta acción.');
}

const ipDe = (req: IncomingMessage) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '?').split(',')[0].trim();

// ---------- Foto ----------

async function servirFoto(res: ServerResponse, hallazgoId: number) {
  const filas = await q('SELECT tipo, datos FROM fotos_sst WHERE hallazgo_id = ?', [hallazgoId]);
  if (!filas[0]) fallar(404, 'La foto no existe.');
  const datos: Buffer = filas[0].datos;
  res.statusCode = 200;
  res.setHeader('Content-Type', { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[filas[0].tipo as string] ?? 'application/octet-stream');
  res.setHeader('Content-Length', datos.length);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(datos);
}

// ---------- Área TI ----------

const mensajeTiJson = (m: any) => ({ id: Number(m.id), autor: m.nombre, esTi: m.rol === 'ti', texto: m.texto, creadoEl: isoUtc(m.creado_el) });

const reporteTiJson = (r: any, mensajes: any[]) => ({
  id: Number(r.id), categoria: r.categoria, urgencia: r.urgencia, asunto: r.asunto, descripcion: r.descripcion, estado: r.estado,
  creador: { nombre: r.creador_nombre, cargo: r.creador_cargo, area: r.creador_area },
  asignadoA: r.asignado_nombre ?? null,
  creadoEl: isoUtc(r.creado_el), actualizadoEl: isoUtc(r.actualizado_el), resueltoEl: isoUtc(r.resuelto_el),
  mensajes,
});

/** TI ve todos los reportes; los demás, solo los suyos. Responde 404 (y no 403) para no revelar que existen. */
async function reporteTiVisible(id: number, u: Usuario) {
  const filas = await q('SELECT * FROM reportes_ti WHERE id = ?', [id]);
  const r = filas[0];
  if (!r || (u.rol !== 'ti' && Number(r.creado_por) !== Number(u.id))) fallar(404, 'No encontré ese reporte.');
  return r;
}

// ---------- Instalación inicial ----------

const personaPara = (correo: string, rol: Rol) => {
  const fija: Record<Rol, string> = { colaborador: 'u1', sst: 'u8', administracion: 'u9', ti: 'u10' };
  let suma = 0;
  for (const c of correo) suma = (suma * 31 + c.charCodeAt(0)) >>> 0;
  return rol === 'colaborador' && suma % 3 ? `u${2 + (suma % 7)}` : fija[rol];
};

const USUARIOS_PRUEBA = [
  { correo: 'keiner@alianza.co', nombre: 'Keiner Asprilla', cargo: 'Analista de Talento', area: 'Recursos Humanos', rol: 'colaborador' },
  { correo: 'sst@alianza.co', nombre: 'Paola Herrera', cargo: 'Coordinadora SST', area: 'Seguridad y Salud en el Trabajo', rol: 'sst' },
  { correo: 'administracion@alianza.co', nombre: 'Diego Morales', cargo: 'Director Administrativo', area: 'Administración', rol: 'administracion' },
  { correo: 'ti@alianza.co', nombre: 'Camilo Ruiz', cargo: 'Técnico de TI', area: 'Tecnología (TI)', rol: 'ti' },
];

async function instalar(req: IncomingMessage) {
  const esperado = process.env.SETUP_TOKEN ?? '';
  const dado = String(req.headers['x-setup-token'] ?? '');
  // Sin llave configurada (o con una débil) la ruta no existe
  if (esperado.length < 24 || !igualesSeguro(dado, esperado)) fallar(404, 'Ruta no encontrada.');

  const cuerpo = req.headers['content-length'] && req.headers['content-length'] !== '0' ? await cuerpoJson(req) : {};
  const nombreBase = nombreBaseDeDatos();
  const cn = await conexionSinBase();
  try {
    await cn.query(`CREATE DATABASE IF NOT EXISTS \`${nombreBase}\` CHARACTER SET utf8mb4`);
  } finally {
    await cn.end();
  }
  for (const sql of ESQUEMA) await db().query(sql);

  // Cuentas a crear: las que pida la persona, o las de prueba si no pide ninguna
  const pedidas: any[] = Array.isArray(cuerpo.usuarios) ? cuerpo.usuarios : cuerpo.sinPruebas ? [] : USUARIOS_PRUEBA;
  const creadas: { correo: string; rol: string; clave: string }[] = [];
  const existentes: string[] = [];
  for (const p of pedidas) {
    const correo = String(p.correo ?? '').trim().toLowerCase();
    const rol = String(p.rol ?? 'colaborador') as Rol;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) || !ROLES.includes(rol) || !String(p.nombre ?? '').trim()) {
      fallar(422, `Cuenta inválida: ${correo || '(sin correo)'}. Revisa correo, nombre y rol (${ROLES.join(', ')}).`);
    }
    const ya = await q('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (ya[0] && !p.reiniciarClave) {
      existentes.push(correo);
      continue;
    }
    const clave = typeof p.clave === 'string' && p.clave.length >= 8 ? p.clave : claveAleatoria();
    const hash = await hashClave(clave);
    if (ya[0]) {
      await ejecutar('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [hash, ya[0].id]);
    } else {
      await ejecutar('INSERT INTO usuarios (correo, clave_hash, nombre, cargo, area, rol, persona_id) VALUES (?,?,?,?,?,?,?)', [
        correo, hash, String(p.nombre).trim().slice(0, 120), String(p.cargo ?? '').slice(0, 120), String(p.area ?? '').slice(0, 120), rol, personaPara(correo, rol),
      ]);
    }
    creadas.push({ correo, rol, clave });
  }
  // Las contraseñas se muestran UNA sola vez, en esta respuesta; en la base solo queda su huella
  return { ok: true, baseDeDatos: nombreBase, tablas: ESQUEMA.length, creadas, existentes };
}

// ---------- Enrutador ----------

export async function enrutar(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const metodo = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://x');
  const ruta = '/' + url.pathname.replace(/^\/api/, '').replace(/^\/+|\/+$/g, '');
  let m: RegExpExecArray | null;

  if (ruta === '/ping' && metodo === 'GET') {
    await q('SELECT 1');
    return responder(res, 200, { ok: true, servicio: 'alianza', hora: new Date().toISOString() });
  }

  if (ruta === '/setup' && metodo === 'POST') return responder(res, 200, await instalar(req));

  // ---- Inicio de sesión ----
  if (ruta === '/login' && metodo === 'POST') {
    const d = await cuerpoJson(req, 10_000);
    const correo = String(d.correo ?? '').trim().toLowerCase();
    const clave = String(d.clave ?? '');
    if (!correo || !clave || correo.length > 190 || clave.length > 200) fallar(400, 'Ingresa tu correo y tu contraseña.');

    // Límite de intentos: frena a quien prueba contraseñas una tras otra
    const ip = ipDe(req);
    const [porIp, porCorreo] = await Promise.all([
      q("SELECT COUNT(*) n FROM intentos_login WHERE clave = ? AND creado_el > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)", [`${correo}|${ip}`]),
      q("SELECT COUNT(*) n FROM intentos_login WHERE clave = ? AND creado_el > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)", [correo]),
    ]);
    if (Number(porIp[0].n) >= 6 || Number(porCorreo[0].n) >= 25) fallar(429, 'Demasiados intentos fallidos. Espera 15 minutos y vuelve a intentarlo.');

    const u = (await q('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [correo]))[0];
    if (!(await verificarClave(clave, u?.clave_hash ?? null)) || !u) {
      await ejecutar('INSERT INTO intentos_login (clave, creado_el) VALUES (?, UTC_TIMESTAMP()), (?, UTC_TIMESTAMP())', [`${correo}|${ip}`, correo]);
      await new Promise((r) => setTimeout(r, 400));
      fallar(401, 'El correo o la contraseña no son correctos.');
    }
    const token = nuevoToken();
    await ejecutar('DELETE FROM sesiones WHERE expira_el < UTC_TIMESTAMP()');
    await ejecutar('DELETE FROM intentos_login WHERE creado_el < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)');
    await ejecutar('DELETE FROM intentos_login WHERE clave IN (?, ?)', [`${correo}|${ip}`, correo]);
    await ejecutar(`INSERT INTO sesiones (token_hash, usuario_id, expira_el) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${DIAS_SESION} DAY))`, [sha256(token), u.id]);
    return responder(res, 200, { token, usuario: usuarioPublico(u) });
  }

  // ---- Foto con enlace firmado (sin sesión; el enlace lo entrega GET /informes) ----
  if ((m = /^\/fotos\/(\d+)$/.exec(ruta)) && metodo === 'GET' && url.searchParams.has('f')) {
    if (!firmaFotoValida(Number(m[1]), url.searchParams.get('e'), url.searchParams.get('f'))) fallar(403, 'El enlace de la foto no es válido o venció.');
    return servirFoto(res, Number(m[1]));
  }

  // ---- Todo lo demás exige sesión ----
  const usuario = await usuarioActual(req);

  if (ruta === '/me' && metodo === 'GET') return responder(res, 200, { usuario: usuarioPublico(usuario) });

  if (ruta === '/logout' && metodo === 'POST') {
    await ejecutar('DELETE FROM sesiones WHERE token_hash = ?', [sha256(String(req.headers.authorization).slice(7).toLowerCase())]);
    return responder(res, 200, { ok: true });
  }

  // ---- Cambiar mi contraseña (pide la actual; cierra mis otras sesiones) ----
  if (ruta === '/me/clave' && metodo === 'PUT') {
    const d = await cuerpoJson(req, 10_000);
    const actual = String(d.actual ?? '');
    const nueva = String(d.nueva ?? '');
    if (nueva.length < 6 || nueva.length > 200) fallar(422, 'La contraseña nueva debe tener al menos 6 caracteres.');
    const guardada = (await q('SELECT clave_hash FROM usuarios WHERE id = ?', [usuario.id]))[0]?.clave_hash ?? null;
    if (!(await verificarClave(actual, guardada))) fallar(403, 'La contraseña actual no es correcta.');
    await ejecutar('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [await hashClave(nueva), usuario.id]);
    const mio = sha256(String(req.headers.authorization).slice(7).toLowerCase());
    await ejecutar('DELETE FROM sesiones WHERE usuario_id = ? AND token_hash <> ?', [usuario.id, mio]);
    return responder(res, 200, { ok: true });
  }

  // ---- Informes SST: listar ----
  if (ruta === '/informes' && metodo === 'GET') {
    exigirRol(usuario, ['sst', 'administracion']);
    const informes = await q(
      `SELECT i.*, u.persona_id AS subido_por_persona FROM informes_sst i
       JOIN usuarios u ON u.id = i.subido_por ORDER BY i.subido_el DESC, i.id DESC`,
    );
    const porInforme = new Map<number, any[]>();
    for (const h of await q('SELECT * FROM hallazgos_sst ORDER BY informe_id, item')) {
      const lista = porInforme.get(Number(h.informe_id)) ?? [];
      lista.push({
        item: Number(h.item), fecha: h.fecha, area: h.area, novedad: h.novedad, estado: h.estado,
        notaEvidencia: h.nota_evidencia, foto: h.foto_archivo ? enlaceFoto(Number(h.id)) : null,
      });
      porInforme.set(Number(h.informe_id), lista);
    }
    return responder(res, 200, {
      informes: informes.map((i) => ({
        id: String(i.id), archivo: i.archivo, titulo: i.titulo, subidoPor: i.subido_por_persona, subidoEl: isoUtc(i.subido_el),
        hallazgos: porInforme.get(Number(i.id)) ?? [],
        resumenExcel: JSON.parse(i.resumen_excel ?? '{}'), advertencias: JSON.parse(i.advertencias ?? '[]'),
      })),
    });
  }

  // ---- Informes SST: crear (solo SST) ----
  if (ruta === '/informes' && metodo === 'POST') {
    exigirRol(usuario, ['sst']);
    const d = await cuerpoJson(req, 4 * 1024 * 1024);
    const hallazgos = d.hallazgos;
    if (!Array.isArray(hallazgos) || hallazgos.length === 0) fallar(422, 'El informe no trae hallazgos.');
    if (hallazgos.length > MAX_HALLAZGOS) fallar(422, `El informe trae demasiados hallazgos (máximo ${MAX_HALLAZGOS}).`);
    const archivo = String(d.archivo ?? 'informe.xlsx').trim().slice(0, 255);
    const titulo = String(d.titulo ?? 'Informe SST').trim().slice(0, 255);

    const vistos = new Set<number>();
    const filas = hallazgos.map((h: any) => {
      if (h === null || typeof h !== 'object') fallar(422, 'Un hallazgo tiene un formato inválido.');
      const item = Number(h.item);
      const novedad = String(h.novedad ?? '').trim();
      if (!Number.isInteger(item) || item < 1 || vistos.has(item)) fallar(422, 'Hay hallazgos con número de ítem inválido o repetido.');
      if (!ESTADOS_HALLAZGO.includes(h.estado) || !novedad) fallar(422, `El hallazgo #${item} tiene estado o novedad inválidos.`);
      if (h.fecha != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(h.fecha))) fallar(422, `El hallazgo #${item} tiene una fecha inválida.`);
      vistos.add(item);
      return [item, h.fecha ?? null, String(h.area ?? 'Sin área').trim().slice(0, 160), novedad.slice(0, 5000), h.estado, h.notaEvidencia != null ? String(h.notaEvidencia).slice(0, 2000) : null];
    });

    const id = await transaccion(async (cn) => {
      const [r]: any = await cn.execute(
        'INSERT INTO informes_sst (subido_por, archivo, titulo, resumen_excel, advertencias, subido_el) VALUES (?,?,?,?,?,UTC_TIMESTAMP())',
        [usuario.id, archivo, titulo, JSON.stringify(d.resumenExcel ?? {}), JSON.stringify((Array.isArray(d.advertencias) ? d.advertencias : []).filter((a: unknown) => typeof a === 'string'))],
      );
      for (const f of filas) {
        await cn.execute('INSERT INTO hallazgos_sst (informe_id, item, fecha, area, novedad, estado, nota_evidencia) VALUES (?,?,?,?,?,?,?)', [r.insertId, ...f]);
      }
      return r.insertId as number;
    });
    return responder(res, 201, { id: String(id), hallazgos: filas.length });
  }

  // ---- Subir la foto de un hallazgo (solo SST; el cuerpo son los bytes de la imagen) ----
  if ((m = /^\/informes\/(\d+)\/fotos\/(\d+)$/.exec(ruta)) && metodo === 'PUT') {
    exigirRol(usuario, ['sst']);
    const fila = (await q(
      'SELECT h.id FROM hallazgos_sst h JOIN informes_sst i ON i.id = h.informe_id WHERE h.informe_id = ? AND h.item = ? AND i.subido_por = ?',
      [Number(m[1]), Number(m[2]), usuario.id],
    ))[0];
    if (!fila) fallar(404, 'No encontré ese hallazgo en un informe tuyo.');
    const bytes = await leerCuerpo(req, MAX_FOTO_BYTES);
    if (bytes.length === 0) fallar(400, 'La foto llegó vacía.');
    const tipo = tipoDeImagen(bytes);
    if (!tipo) fallar(415, 'El archivo no es una imagen PNG, JPG o WEBP.');
    await ejecutar('REPLACE INTO fotos_sst (hallazgo_id, tipo, datos) VALUES (?,?,?)', [fila.id, tipo, bytes]);
    await ejecutar('UPDATE hallazgos_sst SET foto_archivo = ? WHERE id = ?', [tipo, fila.id]);
    return responder(res, 200, { ok: true });
  }

  // ---- Ver una foto con sesión (SST y Administración) ----
  if ((m = /^\/fotos\/(\d+)$/.exec(ruta)) && metodo === 'GET') {
    exigirRol(usuario, ['sst', 'administracion']);
    return servirFoto(res, Number(m[1]));
  }

  // ---- Eliminar un informe (solo SST): borra también sus hallazgos y fotos ----
  if ((m = /^\/informes\/(\d+)$/.exec(ruta)) && metodo === 'DELETE') {
    exigirRol(usuario, ['sst']);
    const id = Number(m[1]);
    const existe = await q('SELECT id FROM informes_sst WHERE id = ?', [id]);
    if (!existe[0]) fallar(404, 'El informe no existe.');
    await transaccion(async (cn) => {
      await cn.execute('DELETE FROM fotos_sst WHERE hallazgo_id IN (SELECT id FROM hallazgos_sst WHERE informe_id = ?)', [id]);
      await cn.execute('DELETE FROM hallazgos_sst WHERE informe_id = ?', [id]);
      await cn.execute('DELETE FROM informes_sst WHERE id = ?', [id]);
    });
    return responder(res, 200, { ok: true });
  }

  // ---- Área TI: listar ----
  if (ruta === '/ti/reportes' && metodo === 'GET') {
    exigirRol(usuario, ROLES_REPORTAN_TI);
    const reportes = await q(
      `SELECT r.*, c.nombre AS creador_nombre, c.cargo AS creador_cargo, c.area AS creador_area, a.nombre AS asignado_nombre
       FROM reportes_ti r JOIN usuarios c ON c.id = r.creado_por LEFT JOIN usuarios a ON a.id = r.asignado_a
       ${usuario.rol === 'ti' ? '' : 'WHERE r.creado_por = ?'} ORDER BY r.creado_el DESC, r.id DESC`,
      usuario.rol === 'ti' ? [] : [usuario.id],
    );
    const mensajes = new Map<number, any[]>();
    if (reportes.length) {
      const ids = reportes.map((r) => Number(r.id)).join(',');
      for (const x of await q(`SELECT m.*, u.nombre, u.rol FROM reportes_ti_mensajes m JOIN usuarios u ON u.id = m.autor_id WHERE m.reporte_id IN (${ids}) ORDER BY m.id`)) {
        const l = mensajes.get(Number(x.reporte_id)) ?? [];
        l.push(mensajeTiJson(x));
        mensajes.set(Number(x.reporte_id), l);
      }
    }
    return responder(res, 200, { reportes: reportes.map((r) => reporteTiJson(r, mensajes.get(Number(r.id)) ?? [])) });
  }

  // ---- Área TI: crear ----
  if (ruta === '/ti/reportes' && metodo === 'POST') {
    exigirRol(usuario, ROLES_REPORTAN_TI);
    const d = await cuerpoJson(req, 50_000);
    const categoria = String(d.categoria ?? '');
    const urgencia = String(d.urgencia ?? 'Media');
    const asunto = String(d.asunto ?? '').trim();
    const descripcion = String(d.descripcion ?? '').trim();
    if (!CATEGORIAS_TI.includes(categoria) || !URGENCIAS_TI.includes(urgencia)) fallar(422, 'Elige una categoría y una urgencia válidas.');
    if (asunto.length < 3 || asunto.length > 160) fallar(422, 'El asunto debe tener entre 3 y 160 caracteres.');
    if (descripcion.length < 5 || descripcion.length > 4000) fallar(422, 'Describe el problema (entre 5 y 4000 caracteres).');
    const r = await ejecutar(
      'INSERT INTO reportes_ti (creado_por, categoria, urgencia, asunto, descripcion, creado_el, actualizado_el) VALUES (?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
      [usuario.id, categoria, urgencia, asunto, descripcion],
    );
    return responder(res, 201, { id: Number(r.insertId) });
  }

  // ---- Área TI: escribir un mensaje (quien lo creó o TI) ----
  if ((m = /^\/ti\/reportes\/(\d+)\/mensajes$/.exec(ruta)) && metodo === 'POST') {
    exigirRol(usuario, ROLES_REPORTAN_TI);
    const reporte = await reporteTiVisible(Number(m[1]), usuario);
    const texto = String((await cuerpoJson(req, 10_000)).texto ?? '').trim();
    if (!texto || texto.length > 2000) fallar(422, 'El mensaje debe tener entre 1 y 2000 caracteres.');
    await ejecutar('INSERT INTO reportes_ti_mensajes (reporte_id, autor_id, texto, creado_el) VALUES (?,?,?,UTC_TIMESTAMP())', [reporte.id, usuario.id, texto]);
    await ejecutar('UPDATE reportes_ti SET actualizado_el = UTC_TIMESTAMP() WHERE id = ?', [reporte.id]);
    return responder(res, 201, { ok: true });
  }

  // ---- Área TI: cambiar el estado (solo TI) ----
  if ((m = /^\/ti\/reportes\/(\d+)$/.exec(ruta)) && metodo === 'PATCH') {
    exigirRol(usuario, ['ti']);
    const reporte = await reporteTiVisible(Number(m[1]), usuario);
    const estado = String((await cuerpoJson(req, 2_000)).estado ?? '');
    if (!ESTADOS_TI.includes(estado)) fallar(422, 'El estado no es válido.');
    await transaccion(async (cn) => {
      await cn.execute(
        `UPDATE reportes_ti SET estado = ?, actualizado_el = UTC_TIMESTAMP(),
           asignado_a = CASE WHEN ? = 'Abierto' THEN NULL ELSE COALESCE(asignado_a, ?) END,
           resuelto_el = CASE WHEN ? = 'Resuelto' THEN UTC_TIMESTAMP() ELSE NULL END
         WHERE id = ?`,
        [estado, estado, usuario.id, estado, reporte.id],
      );
      // Queda constancia en la conversación de quién cambió el estado
      await cn.execute('INSERT INTO reportes_ti_mensajes (reporte_id, autor_id, texto, creado_el) VALUES (?,?,?,UTC_TIMESTAMP())', [reporte.id, usuario.id, `Cambió el estado a «${estado}».`]);
    });
    return responder(res, 200, { ok: true });
  }

  return fallar(404, 'Ruta no encontrada.');
}

/** Punto de entrada: convierte cualquier error en una respuesta JSON y nunca filtra detalles internos. */
export async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await enrutar(req, res);
  } catch (e) {
    if (e instanceof ErrorHttp) return responder(res, e.estado, { error: e.message });
    console.error('Error en la API:', e);
    responder(res, 500, { error: 'Ocurrió un error en el servidor.' });
  }
}
