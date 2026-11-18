import { Directory, File, Paths } from 'expo-file-system';
import { Hallazgo, InformeLeido, ResumenExcel } from './parseInforme';

export type InformeSST = {
  id: string;
  archivo: string;
  titulo: string;
  subidoPor: string; // personId
  subidoEl: string; // ISO
  hallazgos: Hallazgo[];
  resumenExcel: ResumenExcel;
  advertencias: string[];
};

// Mientras no haya servidor, los informes se guardan en el almacenamiento de la app
const root = () => new Directory(Paths.document, 'sst');
const indexFile = () => new File(root(), 'informes.json');

export function cargarInformes(): InformeSST[] {
  try {
    const f = indexFile();
    if (!f.exists) return [];
    return JSON.parse(f.textSync()) as InformeSST[];
  } catch {
    return [];
  }
}

function guardarIndice(informes: InformeSST[]) {
  const dir = root();
  dir.create({ intermediates: true, idempotent: true });
  const f = indexFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(informes));
}

/** Guarda las fotos del informe en el teléfono y devuelve el informe listo para publicar. */
export function guardarInforme(
  leido: InformeLeido,
  meta: { archivo: string; subidoPor: string },
  existentes: InformeSST[],
): InformeSST[] {
  const id = Date.now().toString(36);
  const dir = new Directory(root(), id);
  dir.create({ intermediates: true, idempotent: true });

  const uriPorZip = new Map<string, string>();
  for (const [zipPath, bytes] of Object.entries(leido.fotos)) {
    const name = zipPath.split('/').pop()!;
    const f = new File(dir, name);
    if (!f.exists) f.create();
    f.write(bytes);
    uriPorZip.set(zipPath, f.uri);
  }

  const informe: InformeSST = {
    id,
    archivo: meta.archivo,
    titulo: leido.titulo,
    subidoPor: meta.subidoPor,
    subidoEl: new Date().toISOString(),
    hallazgos: leido.hallazgos.map(({ fotoZip, ...h }) => ({ ...h, foto: fotoZip ? uriPorZip.get(fotoZip) : undefined })),
    resumenExcel: leido.resumenExcel,
    advertencias: leido.advertencias,
  };
  const todos = [informe, ...existentes];
  guardarIndice(todos);
  return todos;
}

export function eliminarInforme(id: string, existentes: InformeSST[]): InformeSST[] {
  try {
    const dir = new Directory(root(), id);
    if (dir.exists) dir.delete();
  } catch {
    // Si la carpeta ya no existe, basta con quitarlo del índice
  }
  const resto = existentes.filter((i) => i.id !== id);
  guardarIndice(resto);
  return resto;
}
