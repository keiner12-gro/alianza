import mysql from 'mysql2/promise';

/**
 * Conexión a la base de datos (MySQL, MariaDB o TiDB Cloud). Los datos vienen de variables de entorno:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (por defecto "alianza"), DB_SSL=1 (obligatorio en TiDB Cloud)
 */
const opciones = (conBase: boolean): mysql.PoolOptions => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ...(conBase ? { database: process.env.DB_NAME ?? 'alianza' } : {}),
  ssl: process.env.DB_SSL === '1' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  charset: 'utf8mb4',
  // Fechas como texto "AAAA-MM-DD HH:MM:SS" en UTC: así no dependen de la zona horaria del servidor
  dateStrings: true,
  timezone: 'Z',
  connectionLimit: 3,
  enableKeepAlive: true,
});

let pool: mysql.Pool | null = null;

/** Un grupo de conexiones que se reutiliza mientras la función de Vercel siga "caliente". */
export const db = () => (pool ??= mysql.createPool(opciones(true)));

/** Conexión sin elegir base de datos: solo la usa la instalación inicial para crearla. */
export const conexionSinBase = () => mysql.createConnection(opciones(false) as mysql.ConnectionOptions);

export async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const [filas] = await db().query(sql, params);
  return filas as any[];
}

export async function ejecutar(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
  const [r] = await db().execute(sql, params as any[]);
  return r as any;
}

/** Ejecuta varias instrucciones como una sola: o se guardan todas o ninguna. */
export async function transaccion<T>(trabajo: (cn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const cn = await db().getConnection();
  try {
    await cn.beginTransaction();
    const resultado = await trabajo(cn);
    await cn.commit();
    return resultado;
  } catch (e) {
    await cn.rollback();
    throw e;
  } finally {
    cn.release();
  }
}
