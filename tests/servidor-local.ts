import { createServer } from 'node:http';
import { manejar } from '../lib/rutas';

// Servidor local para probar la API igual que correrá en Vercel (las rutas cuelgan de /api).
//   DB_HOST=127.0.0.1 DB_USER=root DB_NAME=alianza_pruebas SECRETO=... SETUP_TOKEN=... npm run dev
const puerto = Number(process.env.PORT ?? 3100);
createServer((req, res) => {
  manejar(req, res);
}).listen(puerto, () => console.log(`API local en http://localhost:${puerto}/api`));
