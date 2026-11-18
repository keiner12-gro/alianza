# Publicar Alianza en Internet (Vercel + TiDB Cloud)

Con esto la app funciona desde cualquier teléfono y desde el computador, sin depender de ningún PC encendido.

```
Teléfono / navegador  →  Vercel (API en Node + versión web)  →  TiDB Cloud (base de datos MySQL)
```

Todo es gratuito para este tamaño de uso. *(Vercel Hobby es para uso personal y no comercial; si la empresa la usa
de forma comercial, el plan Pro es el que corresponde.)*

## 1. Crear la base de datos (TiDB Cloud)

1. Entra a <https://tidbcloud.com> y crea una cuenta.
2. **Create cluster** → plan **Starter** (gratis). Región recomendada: **AWS · N. Virginia (us-east-1)**, la más cercana a Vercel.
3. Cuando esté listo, abre **Connect** → **Connect with: General** y pulsa **Generate password**. Copia estos datos:

   | Dato | Ejemplo |
   |---|---|
   | Host | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
   | Port | `4000` |
   | User | `3Xy9AbCdEfG.root` |
   | Password | la que generaste |

## 2. Publicar en Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. **Add New → Project** → importa el repositorio `alianza`.
3. En **Framework Preset** deja **Other**. No cambies nada más.
4. Abre **Environment Variables** y agrega estas (una por una):

   | Nombre | Valor |
   |---|---|
   | `DB_HOST` | el Host de TiDB |
   | `DB_PORT` | `4000` |
   | `DB_USER` | el User de TiDB |
   | `DB_PASSWORD` | el Password de TiDB |
   | `DB_NAME` | `alianza` |
   | `DB_SSL` | `1` |
   | `SECRETO` | una cadena larga al azar (mínimo 32 caracteres): firma los enlaces de las fotos |
   | `SETUP_TOKEN` | otra cadena al azar (mínimo 24 caracteres): protege la instalación inicial |

5. Pulsa **Deploy**. Cuando termine, Vercel muestra la dirección, por ejemplo `https://alianza.vercel.app`.

## 3. Instalación inicial (una sola vez)

Crea las tablas y las cuentas de prueba. Las contraseñas se generan al azar y **se muestran una sola vez** en la respuesta.

```bash
curl -X POST https://TU-DOMINIO.vercel.app/api/setup -H "x-setup-token: TU_SETUP_TOKEN"
```

Para crear cuentas propias en lugar de las de prueba:

```bash
curl -X POST https://TU-DOMINIO.vercel.app/api/setup -H "x-setup-token: TU_SETUP_TOKEN" -H "Content-Type: application/json" \
  -d '{"sinPruebas": true, "usuarios": [{"correo": "ana@empresa.com", "nombre": "Ana Pérez", "rol": "administracion", "cargo": "Contadora", "area": "Finanzas"}]}'
```

Roles: `colaborador`, `sst`, `administracion`, `ti`. Para devolverle una contraseña nueva a alguien que ya existe, agrega `"reiniciarClave": true` a su cuenta.

**Después de la instalación**, borra la variable `SETUP_TOKEN` en Vercel (Settings → Environment Variables) y vuelve a desplegar: la ruta `/api/setup` deja de existir. Agrégala de nuevo solo cuando necesites crear cuentas.

## 4. Apuntar la app Android al servidor

En GitHub: **Settings → Secrets and variables → Actions → Variables** → cambia `SERVIDOR_URL` a
`https://TU-DOMINIO.vercel.app/api` y lanza **Actions → Compilar APK → Run workflow**. El APK nuevo ya trae la dirección y
se descarga con el mismo enlace de siempre. La versión web queda en `https://TU-DOMINIO.vercel.app`.

## Límites a tener en cuenta

- Cada foto puede pesar hasta **4 MB** (Vercel limita a 4,5 MB cada petición).
- La primera consulta tras un rato sin uso puede tardar unos segundos (Vercel y TiDB "despiertan").
- Las fotos se guardan dentro de la base de datos; el plan gratuito de TiDB ofrece 5 GB.

## Probar en el computador (sin Vercel)

```bash
npm install
DB_HOST=127.0.0.1 DB_USER=root DB_NAME=alianza_pruebas SECRETO=<32+ caracteres> SETUP_TOKEN=<24+ caracteres> npm run dev
API_URL=http://localhost:3100/api SETUP_TOKEN=<la misma> npm run prueba
```
