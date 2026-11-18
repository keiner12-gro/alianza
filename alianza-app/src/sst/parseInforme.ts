import { unzipSync, strFromU8 } from 'fflate';

export type EstadoHallazgo = 'Abierto' | 'En proceso' | 'Cerrado' | 'Cancelado' | 'Sin estado';

export type Hallazgo = {
  item: number;
  fecha: string | null; // YYYY-MM-DD
  area: string;
  novedad: string;
  estado: EstadoHallazgo;
  /** Ruta dentro del .xlsx de la foto de evidencia (xl/media/...) */
  fotoZip?: string;
  /** Uri local de la foto, cuando ya se guardó en el teléfono */
  foto?: string;
  /** Texto escrito en la columna de evidencia, cuando no es una foto */
  notaEvidencia?: string;
};

export type ResumenExcel = Partial<Record<'reportados' | 'abiertos' | 'enProceso' | 'cerrados' | 'cancelados', number>>;

export type InformeLeido = {
  titulo: string;
  hallazgos: Hallazgo[];
  resumenExcel: ResumenExcel;
  advertencias: string[];
  /** Bytes de cada foto referenciada, por ruta dentro del zip */
  fotos: Record<string, Uint8Array>;
};

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&');

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

const colIndex = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

/** Resuelve una ruta relativa de un .rels respecto a la carpeta del archivo que la declara */
function resolvePath(baseDir: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = baseDir.split('/').filter(Boolean);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function readRels(files: Record<string, Uint8Array>, relsPath: string) {
  const out: Record<string, string> = {};
  if (!files[relsPath]) return out;
  for (const m of strFromU8(files[relsPath]).matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) out[id] = target;
  }
  return out;
}

const excelDate = (serial: number) => {
  const d = new Date(Math.round((serial - 25569) * 86400000));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

function parseFecha(raw: string | undefined): string | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isNaN(n) && n > 20000 && n < 80000) return excelDate(n);
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(raw); // dd/mm/aaaa
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function parseEstado(raw: string | undefined): EstadoHallazgo {
  const s = norm(raw ?? '');
  if (!s) return 'Sin estado';
  if (s.startsWith('CERRAD')) return 'Cerrado';
  if (s.startsWith('ABIERT')) return 'Abierto';
  if (s.includes('PROCESO')) return 'En proceso';
  if (s.startsWith('CANCELAD')) return 'Cancelado';
  return 'Sin estado';
}

type Cell = { v?: string; vm?: number; error?: boolean };

/**
 * Lee un informe de hallazgos SST en formato .xlsx (como "Plan No Llore, Mame").
 * Se ubican las columnas por el nombre del encabezado, así que el orden puede variar.
 */
export function parseInforme(bytes: Uint8Array): InformeLeido {
  // Primero se leen solo los XML: las fotos se extraen después, únicamente las que se usan
  const files = unzipSync(bytes, { filter: (f) => !f.name.startsWith('xl/media/') });

  // Primera hoja del libro
  const wb = strFromU8(files['xl/workbook.xml']);
  const firstSheetRid = /<sheet\b[^>]*r:id="([^"]+)"/.exec(wb)?.[1];
  const wbRels = readRels(files, 'xl/_rels/workbook.xml.rels');
  const sheetPath = firstSheetRid ? resolvePath('xl', wbRels[firstSheetRid]) : 'xl/worksheets/sheet1.xml';
  const sheetXml = files[sheetPath] ? strFromU8(files[sheetPath]) : '';
  if (!sheetXml) throw new Error('No encontré ninguna hoja dentro del archivo.');

  // Textos compartidos
  const shared: string[] = [];
  if (files['xl/sharedStrings.xml']) {
    for (const si of strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const text = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('');
      shared.push(decode(text));
    }
  }

  // Celdas por fila
  const rows = new Map<number, Map<number, Cell>>();
  for (const rm of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +rm[1];
    const cells = new Map<number, Cell>();
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!ref) continue;
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const vm = /\bvm="(\d+)"/.exec(attrs)?.[1];
      const inner = cm[2] ?? '';
      let v: string | undefined;
      if (t === 'inlineStr') v = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decode(x[1])).join('');
      else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (raw !== undefined) v = t === 's' ? shared[+raw] : decode(raw);
      }
      cells.set(colIndex(ref), { v: v?.trim(), vm: vm ? +vm : undefined, error: t === 'e' });
    }
    rows.set(r, cells);
  }
  const sortedRows = [...rows.keys()].sort((a, b) => a - b);
  const text = (c?: Cell) => (c && !c.error ? c.v ?? '' : '');

  // Fila de encabezados: la que tiene ITEM y NOVEDAD (o equivalentes)
  let headerRow = -1;
  const col: Partial<Record<'item' | 'fecha' | 'area' | 'novedad' | 'estado' | 'evidencia', number>> = {};
  for (const r of sortedRows) {
    const found: typeof col = {};
    for (const [c, cell] of rows.get(r)!) {
      const h = norm(text(cell));
      if (!h) continue;
      if (h === 'ITEM' || h === 'NO' || h === 'N°') found.item ??= c;
      else if (h.includes('FECHA')) found.fecha ??= c;
      else if (h === 'AREA' || h.startsWith('AREA ')) found.area ??= c;
      else if (h.includes('NOVEDAD') || h.includes('HALLAZGO') || h.includes('DESCRIPCION')) found.novedad ??= c;
      else if (h.includes('MEJORA') || h.includes('ESTADO')) found.estado ??= c;
      else if (h.includes('EVIDENCIA')) found.evidencia ??= c;
    }
    if (found.novedad && (found.item || found.area)) {
      headerRow = r;
      Object.assign(col, found);
      break;
    }
  }
  if (headerRow < 0 || !col.novedad) {
    throw new Error('No encontré la tabla de hallazgos. El archivo debe tener columnas como ÁREA, NOVEDAD y MEJORA CONTINUA.');
  }

  // Resumen que trae el propio Excel (ej. "ABIERTOS | 18"), para compararlo con lo contado
  const resumenExcel: ResumenExcel = {};
  const labels: [keyof ResumenExcel, (h: string) => boolean][] = [
    ['reportados', (h) => h.includes('REPORTAD')],
    ['enProceso', (h) => h === 'EN PROCESO'],
    ['abiertos', (h) => h === 'ABIERTOS' || h === 'ABIERTO'],
    ['cerrados', (h) => h === 'CERRADOS' || h === 'CERRADO'],
    ['cancelados', (h) => h === 'CANCELADOS' || h === 'CANCELADO'],
  ];
  for (const r of sortedRows) {
    for (const [c, cell] of rows.get(r)!) {
      if (col.estado === c) continue; // los estados de la tabla no son el resumen
      const h = norm(text(cell));
      const hit = labels.find(([, test]) => test(h));
      if (!hit) continue;
      const next = Number(text(rows.get(r)!.get(c + 1)));
      if (!Number.isNaN(next) && text(rows.get(r)!.get(c + 1)) !== '') resumenExcel[hit[0]] ??= next;
    }
  }

  // Fotos dentro de celdas (imágenes "en celda" de Excel): vm -> metadata -> rich value -> imagen
  const fotoPorVm = new Map<number, string>();
  if (files['xl/metadata.xml'] && files['xl/richData/rdrichvalue.xml']) {
    const meta = strFromU8(files['xl/metadata.xml']);
    const future = /<futureMetadata\b[^>]*name="XLRICHVALUE"[^>]*>([\s\S]*?)<\/futureMetadata>/.exec(meta)?.[1] ?? '';
    const futureRv = [...future.matchAll(/<bk>([\s\S]*?)<\/bk>/g)].map((b) => +(/rvb i="(\d+)"/.exec(b[1])?.[1] ?? -1));
    const valueMeta = /<valueMetadata\b[^>]*>([\s\S]*?)<\/valueMetadata>/.exec(meta)?.[1] ?? '';
    const vmToFuture = [...valueMeta.matchAll(/<bk>([\s\S]*?)<\/bk>/g)].map((b) => +(/<rc\b[^>]*v="(\d+)"/.exec(b[1])?.[1] ?? -1));

    const structXml = files['xl/richData/rdrichvaluestructure.xml'] ? strFromU8(files['xl/richData/rdrichvaluestructure.xml']) : '';
    const structs = [...structXml.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/g)].map((s) =>
      [...s[1].matchAll(/<k\b[^>]*n="([^"]+)"/g)].findIndex((k) => k[1] === '_rvRel:LocalImageIdentifier'),
    );
    const rvs = [...strFromU8(files['xl/richData/rdrichvalue.xml']).matchAll(/<rv\b[^>]*?s="(\d+)"[^>]*>([\s\S]*?)<\/rv>/g)].map((rv) => {
      const keyPos = structs[+rv[1]] ?? 0;
      const vals = [...rv[2].matchAll(/<v[^>]*>([\s\S]*?)<\/v>/g)].map((v) => v[1]);
      return keyPos >= 0 ? +vals[keyPos] : -1;
    });
    const relXml = files['xl/richData/richValueRel.xml'] ? strFromU8(files['xl/richData/richValueRel.xml']) : '';
    const relIds = [...relXml.matchAll(/<rel\b[^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
    const relTargets = readRels(files, 'xl/richData/_rels/richValueRel.xml.rels');

    vmToFuture.forEach((fi, i) => {
      const rvIndex = futureRv[fi];
      const relIndex = rvs[rvIndex];
      const target = relTargets[relIds[relIndex]];
      if (target) fotoPorVm.set(i + 1, resolvePath('xl/richData', target));
    });
  }

  // Filas de datos
  const hallazgos: Hallazgo[] = [];
  const advertencias: string[] = [];
  let areaActual = '';
  let sinFecha = 0;
  let sinEstado = 0;
  for (const r of sortedRows) {
    if (r <= headerRow) continue;
    const cells = rows.get(r)!;
    const get = (k: keyof typeof col) => (col[k] ? cells.get(col[k]!) : undefined);
    const area = text(get('area'));
    if (area) areaActual = area.replace(/\s+/g, ' ').trim();
    const novedad = text(get('novedad')).replace(/\s+/g, ' ').trim();
    if (!novedad) continue;

    const itemNum = Number(text(get('item')));
    const fecha = parseFecha(text(get('fecha')));
    // Filas de totales debajo de la tabla ("TOTAL REPORTES", "%"): no son hallazgos
    const tieneItem = Number.isFinite(itemNum) && itemNum > 0;
    if (!tieneItem && !fecha) continue;
    if (/^(TOTAL\b|%$)/.test(norm(novedad))) continue;
    const estado = parseEstado(text(get('estado')));
    const ev = get('evidencia');
    const fotoZip = ev?.vm ? fotoPorVm.get(ev.vm) : undefined;
    const nota = ev && !ev.error && !ev.vm ? text(ev) : '';

    if (!fecha) sinFecha++;
    if (estado === 'Sin estado') sinEstado++;
    hallazgos.push({
      item: tieneItem ? itemNum : hallazgos.length + 1,
      fecha,
      area: areaActual || 'Sin área',
      novedad,
      estado,
      fotoZip,
      notaEvidencia: nota || undefined,
    });
  }
  if (!hallazgos.length) throw new Error('La tabla no tiene hallazgos con novedad escrita.');

  // Advertencias de calidad de datos
  const cuenta = (e: EstadoHallazgo) => hallazgos.filter((h) => h.estado === e).length;
  const comparar: [keyof ResumenExcel, number, string, string][] = [
    ['reportados', hallazgos.length, 'hallazgo reportado', 'hallazgos reportados'],
    ['abiertos', cuenta('Abierto'), 'abierto', 'abiertos'],
    ['enProceso', cuenta('En proceso'), 'en proceso', 'en proceso'],
    ['cerrados', cuenta('Cerrado'), 'cerrado', 'cerrados'],
    ['cancelados', cuenta('Cancelado'), 'cancelado', 'cancelados'],
  ];
  for (const [k, real, uno, varios] of comparar) {
    const dice = resumenExcel[k];
    if (dice !== undefined && dice !== real) {
      advertencias.push(`El resumen del Excel dice ${dice} ${dice === 1 ? uno : varios}, pero en la tabla hay ${real}.`);
    }
  }
  if (sinFecha) advertencias.push(sinFecha === 1 ? '1 hallazgo no tiene fecha de reporte válida.' : `${sinFecha} hallazgos no tienen fecha de reporte válida.`);
  if (sinEstado) advertencias.push(sinEstado === 1 ? '1 hallazgo no tiene estado (MEJORA CONTINUA).' : `${sinEstado} hallazgos no tienen estado (MEJORA CONTINUA).`);
  const sinFoto = hallazgos.filter((h) => !h.fotoZip).length;
  if (sinFoto) advertencias.push(sinFoto === 1 ? '1 hallazgo no tiene foto de evidencia.' : `${sinFoto} hallazgos no tienen foto de evidencia.`);

  // Extraer solo las fotos que se usan
  const usadas = new Set(hallazgos.map((h) => h.fotoZip).filter(Boolean) as string[]);
  const fotos = usadas.size ? unzipSync(bytes, { filter: (f) => usadas.has(f.name) }) : {};

  // Título: primer texto de la hoja
  let titulo = 'Informe SST';
  for (const r of sortedRows) {
    const first = [...rows.get(r)!.values()].map(text).find(Boolean);
    if (first) {
      titulo = first.replace(/\s+/g, ' ').trim();
      break;
    }
  }

  return { titulo, hallazgos, resumenExcel, advertencias, fotos };
}
