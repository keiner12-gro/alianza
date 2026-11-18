# Alianza

App móvil de comunidad interna para empresas: muro de anuncios, chats, vacaciones y permisos, formularios,
documentos, eventos, reconocimientos y herramientas por área (Seguridad y Salud, Tecnología/TI).
Hecha con React Native + Expo para **Android**.

## Descargar la app (Android)

**[⬇ Descargar la última versión (Alianza.apk)](../../releases/latest/download/Alianza.apk)**

1. Abre el enlace desde el celular y descarga `Alianza.apk`.
2. Ábrelo. Android pedirá permiso para "instalar apps de origen desconocido" para tu navegador o tu
   gestor de archivos: es normal, porque la app no viene de Play Store.
3. Al abrir la app, toca **Servidor** en el inicio de sesión y escribe la dirección del servidor de tu empresa
   (el computador con la base de datos). El celular debe estar en la misma red Wi-Fi.

Todas las versiones están en [Releases](../../releases).

## Cómo se compila

El APK se genera solo en GitHub Actions ([build-apk.yml](.github/workflows/build-apk.yml)) cada vez que cambia
la carpeta `alianza-app/` en la rama `main`, o a mano desde la pestaña **Actions → Compilar APK → Run workflow**.
Publica el resultado en **Releases** con el número de compilación como versión.

Configuración del repositorio (Settings → Secrets and variables → Actions):

| Nombre | Tipo | Para qué |
|---|---|---|
| `SERVIDOR_URL` | Variable | Dirección del servidor que la app usará por defecto, p. ej. `http://192.168.1.10/alianza-api` |
| `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` | Secretos (opcional) | Llave con la que se firma el APK |

## Desarrollo

```bash
cd alianza-app
npm ci
npx expo start
```

Más detalles en [alianza-app/README.md](alianza-app/README.md).
