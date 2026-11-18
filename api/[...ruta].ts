import type { IncomingMessage, ServerResponse } from 'node:http';
import { manejar } from '../lib/rutas';

// Una sola función atiende todas las rutas de /api/... (el enrutador está en lib/rutas.ts)
export const config = { maxDuration: 30, api: { bodyParser: false } };

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return manejar(req, res);
}
