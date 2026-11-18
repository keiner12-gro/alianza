/**
 * Pruebas de la API contra un servidor local (npm run dev) y una base de datos de pruebas.
 *   API_URL=http://localhost:3100/api SETUP_TOKEN=... [EXCEL=ruta.xlsx] npm run prueba
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.API_URL ?? 'http://localhost:3100/api';
const TOKEN_SETUP = process.env.SETUP_TOKEN ?? '';
let fallos = 0;

const ok = (nombre: string, condicion: boolean, detalle = '') => {
  if (!condicion) fallos++;
  console.log(condicion ? '  ✓' : '  ✗ FALLÓ', nombre, detalle);
};

async function j(ruta: string, { token, ...init }: any = {}) {
  const r = await fetch(BASE + ruta, {
    ...init,
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(init.json ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
    body: init.json ? JSON.stringify(init.json) : init.body,
  });
  const t = await r.text();
  let d: any = null;
  try { d = t ? JSON.parse(t) : null; } catch { /* no era JSON */ }
  return { s: r.status, d, r };
}
const post = (ruta: string, token: string | undefined, json: any, method = 'POST') => j(ruta, { method, token, json });

async function main() {
  console.log('\n[1] Instalación');
  ok('/setup sin llave no existe (404)', (await j('/setup', { method: 'POST' })).s === 404);
  ok('/setup con llave equivocada no existe (404)', (await j('/setup', { method: 'POST', headers: { 'x-setup-token': 'x'.repeat(40) } })).s === 404);
  const inst = await j('/setup', { method: 'POST', headers: { 'x-setup-token': TOKEN_SETUP } });
  ok('/setup crea tablas y usuarios', inst.s === 200 && Array.isArray(inst.d?.creadas), JSON.stringify({ tablas: inst.d?.tablas, creadas: inst.d?.creadas?.length, existentes: inst.d?.existentes?.length }));
  const claves: Record<string, string> = Object.fromEntries((inst.d?.creadas ?? []).map((c: any) => [c.rol, c.clave]));
  const otra = await j('/setup', { method: 'POST', headers: { 'x-setup-token': TOKEN_SETUP } });
  ok('/setup repetido no cambia contraseñas', otra.s === 200 && otra.d.creadas.length === 0 && otra.d.existentes.length === 4);
  ok('contraseñas generadas al azar (14 caracteres)', Object.values(claves).every((c) => c.length === 14) && new Set(Object.values(claves)).size === 4);

  console.log('\n[2] Sesión');
  ok('ping', (await j('/ping')).d?.ok === true);
  const login = async (correo: string, clave: string) => (await post('/login', undefined, { correo, clave })).d?.token as string;
  const T = { sst: await login('sst@alianza.co', claves.sst), adm: await login('administracion@alianza.co', claves.administracion), ti: await login('ti@alianza.co', claves.ti), col: await login('keiner@alianza.co', claves.colaborador) };
  ok('los 4 perfiles inician sesión', Object.values(T).every((t) => /^[a-f0-9]{64}$/.test(t ?? '')));
  const mala = await post('/login', undefined, { correo: 'sst@alianza.co', clave: 'mala' });
  ok('clave incorrecta -> 401', mala.s === 401);
  ok('sin sesión -> 401', (await j('/informes')).s === 401);
  ok('token inventado -> 401', (await j('/informes', { token: 'a'.repeat(64) })).s === 401);
  ok('/me devuelve el rol', (await j('/me', { token: T.ti })).d?.usuario?.rol === 'ti');

  console.log('\n[3] Límite de intentos de inicio de sesión');
  let ultimo = 0;
  for (let i = 0; i < 8; i++) ultimo = (await post('/login', undefined, { correo: 'victima@alianza.co', clave: 'intento' + i })).s;
  ok('tras varios fallos responde 429', ultimo === 429, `último estado: ${ultimo}`);
  ok('el 429 también frena la contraseña correcta del mismo correo+IP', (await post('/login', undefined, { correo: 'victima@alianza.co', clave: 'x' })).s === 429);

  console.log('\n[4] Informes SST y fotos');
  ok('administración no puede crear informes (403)', (await post('/informes', T.adm, { hallazgos: [{ item: 1, estado: 'Abierto', area: 'X', novedad: 'y' }] })).s === 403);
  ok('colaborador no ve informes (403)', (await j('/informes', { token: T.col })).s === 403);
  ok('estado inválido -> 422', (await post('/informes', T.sst, { hallazgos: [{ item: 1, estado: 'Roto', area: 'X', novedad: 'y' }] })).s === 422);
  ok('ítems repetidos -> 422', (await post('/informes', T.sst, { hallazgos: [{ item: 1, estado: 'Abierto', area: 'X', novedad: 'a' }, { item: 1, estado: 'Abierto', area: 'X', novedad: 'b' }] })).s === 422);

  let hallazgos: any[] = [{ item: 1, estado: 'Abierto', area: 'CALDERA', novedad: 'Tejado con goteras', fecha: '2026-03-01' }, { item: 2, estado: 'Cerrado', area: 'LABORATORIO', novedad: 'Luminaria cambiada' }];
  let fotos: Map<number, Uint8Array> = new Map();
  if (process.env.EXCEL) {
    // Con el Excel real: se lee con el mismo código que usa la app
    const { parseInforme } = await import('../alianza-app/src/sst/parseInforme');
    const leido = parseInforme(new Uint8Array(readFileSync(process.env.EXCEL)));
    hallazgos = leido.hallazgos.map(({ fotoZip, foto, ...h }: any) => h);
    for (const h of leido.hallazgos) if (h.fotoZip) fotos.set(h.item, leido.fotos[h.fotoZip]);
  } else {
    // PNG mínimo válido de 1x1
    fotos.set(1, Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')));
  }
  const t0 = Date.now();
  const crear = await post('/informes', T.sst, { archivo: 'prueba.xlsx', titulo: 'INFORME DE PRUEBA', resumenExcel: { reportados: hallazgos.length }, advertencias: ['una advertencia'], hallazgos });
  ok('SST crea el informe', crear.s === 201, `${crear.d?.hallazgos} hallazgos`);
  const id = crear.d.id;
  let subidas = 0;
  for (const [item, bytes] of fotos) {
    const r = await j(`/informes/${id}/fotos/${item}`, { method: 'PUT', token: T.sst, headers: { 'Content-Type': 'application/octet-stream' }, body: bytes as any });
    if (r.s === 200) subidas++;
  }
  ok('se suben todas las fotos', subidas === fotos.size, `${subidas}/${fotos.size} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  ok('subir algo que no es imagen -> 415', (await j(`/informes/${id}/fotos/1`, { method: 'PUT', token: T.sst, body: Buffer.from('esto no es una imagen, es texto plano largo') as any })).s === 415);
  ok('otro SST... administración no puede subir fotos (403)', (await j(`/informes/${id}/fotos/1`, { method: 'PUT', token: T.adm, body: Buffer.from([1, 2, 3]) as any })).s === 403);

  const lista = await j('/informes', { token: T.adm });
  const inf = lista.d.informes.find((i: any) => i.id === id);
  ok('administración ve el informe', !!inf && inf.hallazgos.length === hallazgos.length, `${inf?.hallazgos.length} hallazgos, ${inf?.hallazgos.filter((h: any) => h.foto).length} con foto`);
  ok('fechas en formato AAAA-MM-DD y subidoEl en UTC', /^\d{4}-\d{2}-\d{2}T[\d:]+Z$/.test(inf.subidoEl));
  const conFoto = inf.hallazgos.find((h: any) => h.foto);
  if (conFoto) {
    const url = conFoto.foto as string;
    const sinSesion = await fetch(BASE + url);
    ok('foto con enlace firmado, sin sesión -> 200 imagen', sinSesion.status === 200 && (sinSesion.headers.get('content-type') ?? '').startsWith('image/'), `${(await sinSesion.arrayBuffer()).byteLength} bytes`);
    ok('firma alterada -> 403', (await fetch(BASE + url.slice(0, -1) + (url.endsWith('0') ? '1' : '0'))).status === 403);
    ok('enlace vencido -> 403', (await fetch(BASE + url.replace(/e=\d+/, 'e=1'))).status === 403);
    ok('firma de otra foto -> 403', (await fetch(BASE + url.replace(/\/fotos\/\d+/, '/fotos/999999'))).status === 403);
    const idFoto = url.match(/\/fotos\/(\d+)/)![1];
    ok('sin firma ni sesión -> 401', (await fetch(BASE + '/fotos/' + idFoto)).status === 401);
    ok('con sesión y sin firma -> 200', (await fetch(BASE + '/fotos/' + idFoto, { headers: { Authorization: 'Bearer ' + T.adm } })).status === 200);
  }

  console.log('\n[5] Área TI');
  ok('colaborador no puede reportar (403)', (await post('/ti/reportes', T.col, { categoria: 'Computador', urgencia: 'Alta', asunto: 'abc', descripcion: 'abcde' })).s === 403);
  const rep = await post('/ti/reportes', T.adm, { categoria: 'Computador', urgencia: 'Alta', asunto: 'El computador no enciende', descripcion: 'Desde ayer en la tarde no da señal de vídeo.' });
  ok('administración reporta (con tildes)', rep.s === 201);
  ok('categoría inválida -> 422', (await post('/ti/reportes', T.adm, { categoria: 'Marte', urgencia: 'Alta', asunto: 'hola', descripcion: 'descripción válida' })).s === 422);
  const rep2 = await post('/ti/reportes', T.sst, { categoria: 'Internet / red', urgencia: 'Media', asunto: 'Sin internet en SST', descripcion: 'Se cae cada pocos minutos.' });
  ok('SST también reporta', rep2.s === 201);
  ok('administración solo ve el suyo', (await j('/ti/reportes', { token: T.adm })).d.reportes.length === 1);
  const colaTi = (await j('/ti/reportes', { token: T.ti })).d.reportes;
  ok('TI ve todos', colaTi.length === 2, colaTi.map((r: any) => `${r.asunto} [${r.urgencia}]`).join(' | '));
  ok('SST no puede escribir en el reporte ajeno (404)', (await post(`/ti/reportes/${rep.d.id}/mensajes`, T.sst, { texto: 'intruso' })).s === 404);
  ok('administración no cambia estados (403)', (await post(`/ti/reportes/${rep.d.id}`, T.adm, { estado: 'Resuelto' }, 'PATCH')).s === 403);
  ok('estado inválido -> 422', (await post(`/ti/reportes/${rep.d.id}`, T.ti, { estado: 'Hecho' }, 'PATCH')).s === 422);
  ok('TI toma el caso', (await post(`/ti/reportes/${rep.d.id}`, T.ti, { estado: 'En proceso' }, 'PATCH')).s === 200);
  ok('TI responde', (await post(`/ti/reportes/${rep.d.id}/mensajes`, T.ti, { texto: 'Voy en camino.' })).s === 201);
  ok('el creador contesta', (await post(`/ti/reportes/${rep.d.id}/mensajes`, T.adm, { texto: 'Gracias, estoy en la oficina 3.' })).s === 201);
  ok('TI resuelve', (await post(`/ti/reportes/${rep.d.id}`, T.ti, { estado: 'Resuelto' }, 'PATCH')).s === 200);
  const fin = (await j('/ti/reportes', { token: T.adm })).d.reportes[0];
  ok('estado final, asignación y conversación', fin.estado === 'Resuelto' && fin.asignadoA === 'Camilo Ruiz' && !!fin.resueltoEl && fin.mensajes.length === 4, fin.mensajes.map((m: any) => m.texto).join(' / '));
  ok('el mensaje de estado dice cuál estado', fin.mensajes.some((m: any) => m.texto === 'Cambió el estado a «En proceso».'));

  console.log('\n[6] Eliminar informe');
  ok('administración no puede eliminar (403)', (await j(`/informes/${id}`, { method: 'DELETE', token: T.adm })).s === 403);
  ok('SST elimina el informe', (await j(`/informes/${id}`, { method: 'DELETE', token: T.sst })).s === 200);
  ok('el informe ya no aparece', !(await j('/informes', { token: T.adm })).d.informes.some((i: any) => i.id === id));
  if (conFoto) ok('sus fotos también se borraron (404)', (await fetch(BASE + conFoto.foto)).status === 404);

  console.log('\n[7] Cerrar sesión');
  ok('logout', (await j('/logout', { method: 'POST', token: T.col })).s === 200);
  ok('el token ya no sirve', (await j('/me', { token: T.col })).s === 401);

  console.log(fallos === 0 ? '\n✅ Todas las pruebas pasaron' : `\n❌ ${fallos} prueba(s) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
