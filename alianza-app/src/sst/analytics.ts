import { EstadoHallazgo, Hallazgo } from './parseInforme';
import { MONTHS, fromISO, todayISO } from '../utils/dates';

export const ESTADOS: EstadoHallazgo[] = ['Abierto', 'En proceso', 'Cerrado', 'Cancelado', 'Sin estado'];

// Paleta de estados (good / warning / critical + neutro). Siempre acompañada de etiqueta.
export const estadoColor: Record<EstadoHallazgo, string> = {
  Abierto: '#D03B3B',
  'En proceso': '#FAB219',
  Cerrado: '#0CA30C',
  Cancelado: '#9CA3AF',
  'Sin estado': '#CBD5E1',
};

export const estadoIcon: Record<EstadoHallazgo, string> = {
  Abierto: 'alert-circle',
  'En proceso': 'time',
  Cerrado: 'checkmark-circle',
  Cancelado: 'close-circle',
  'Sin estado': 'help-circle',
};

/** Pendientes = abiertos + en proceso */
export const esPendiente = (h: Hallazgo) => h.estado === 'Abierto' || h.estado === 'En proceso';

export function contarPorEstado(hs: Hallazgo[]) {
  const out = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoHallazgo, number>;
  hs.forEach((h) => out[h.estado]++);
  return out;
}

/** % de cierre: cerrados sobre el total reportado (misma cuenta que el Excel de SST) */
export function porcentajeCierre(hs: Hallazgo[]) {
  return hs.length ? hs.filter((h) => h.estado === 'Cerrado').length / hs.length : 0;
}

export function porArea(hs: Hallazgo[]) {
  const map = new Map<string, Record<EstadoHallazgo, number> & { total: number }>();
  for (const h of hs) {
    if (!map.has(h.area)) map.set(h.area, { ...contarPorEstado([]), total: 0 });
    const a = map.get(h.area)!;
    a[h.estado]++;
    a.total++;
  }
  return [...map.entries()]
    .map(([area, c]) => ({ area, ...c, pendientes: c.Abierto + c['En proceso'] }))
    .sort((a, b) => b.pendientes - a.pendientes || b.total - a.total);
}

/** Reportes por mes, del mes más antiguo al más reciente (incluye meses sin reportes). */
export function porMes(hs: Hallazgo[]) {
  const fechas = hs.map((h) => h.fecha).filter(Boolean) as string[];
  if (!fechas.length) return [];
  const keys = fechas.map((f) => f.slice(0, 7)).sort();
  const counts = new Map<string, number>();
  keys.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  const [y0, m0] = keys[0].split('-').map(Number);
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number);
  const out: { key: string; label: string; count: number }[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push({ key, label: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`, count: counts.get(key) ?? 0 });
  }
  return out;
}

export function diasAbierto(h: Hallazgo) {
  if (!h.fecha) return null;
  return Math.max(0, Math.round((fromISO(todayISO()).getTime() - fromISO(h.fecha).getTime()) / 86400000));
}

export function formatoFecha(iso: string | null) {
  if (!iso) return 'Sin fecha';
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
