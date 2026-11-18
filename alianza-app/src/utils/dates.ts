import { holidays } from '../data/modules';

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Las fechas se manejan como texto YYYY-MM-DD para evitar problemas de zona horaria
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const isWeekend = (iso: string) => {
  const day = fromISO(iso).getDay();
  return day === 0 || day === 6;
};

export const isHoliday = (iso: string) => holidays.includes(iso);

export const isBusinessDay = (iso: string) => !isWeekend(iso) && !isHoliday(iso);

/** Cuenta los días hábiles (lunes a viernes, sin festivos) entre dos fechas, inclusive. */
export function businessDaysBetween(start: string, end: string) {
  let count = 0;
  const d = fromISO(start);
  const last = fromISO(end);
  while (d <= last) {
    if (isBusinessDay(toISO(d))) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export const formatShort = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};

export const formatLong = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
};

export const formatRange = (start: string, end: string) =>
  start === end ? formatLong(start) : `${formatShort(start)} – ${formatLong(end)}`;

/** Fechas de un mes organizadas por semanas (lunes primero). Los huecos son null. */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
