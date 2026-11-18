# Alianza — App móvil de comunidad interna

App nativa para Android e iOS hecha con React Native + Expo. Funciona como una comunidad digital privada para la organización.

## Funciones
Barra inferior: **Inicio · Chats · Apps · Perfil**

- **Inicio (muro)**: anuncios segmentados por área, reacciones, comentarios y anuncios fijados. Arriba: buscador de personas y notificaciones
- **Chats** 1 a 1 con llamada y videollamada
- **Apps**:
  - **Vacaciones y permisos**: saldo de días, solicitud con calendario (cuenta solo días hábiles y descuenta festivos), tipos de permiso con reglas (máximo de días, soporte obligatorio), aprobación o rechazo del líder con comentario, seguimiento y cancelación
  - **Formularios y Trámites** con aprobaciones
  - **Mis documentos** (desprendibles, certificados, contrato)
  - **Encuestas** con resultados en vivo
  - **Desempeño**: objetivos, autoevaluación y feedback
  - **Portal de servicios**: casos por área (TI, nómina, bienestar, mantenimiento) con conversación
  - **Eventos** con confirmación de asistencia
  - **Librerías**, **Revista**, **Reconocimientos**, **Entrenamientos** y **Clima laboral**
- **Perfil**: mis datos, saldo de vacaciones, directorio, incorporación y cierre de sesión

## Servidor
La app se conecta a un servidor propio (API + base de datos) cuya dirección se escribe en la pantalla de inicio de sesión o se fija al compilar con la variable `EXPO_PUBLIC_SERVIDOR_URL`. Si no hay conexión, entra en **modo demostración** con datos de ejemplo guardados en el teléfono.

## Generar el APK (en este PC)
Requiere Java 17 y el SDK de Android (ya instalados).
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.
Está firmado con la llave de depuración: sirve para instalar y mostrar, no para subir a Play Store.

## Probar mientras se desarrolla
```bash
npm install
npx expo start
```
Escanea el código QR con Expo Go (celular y PC en la misma red Wi-Fi).

## Estructura
```
src/
  theme.ts              colores y estilos base
  data/mock.ts          datos de ejemplo
  context/AppContext    estado global de la app
  components/ui.tsx     componentes reutilizables
  navigation/           pestañas y pantallas
  screens/              todas las pantallas
```

## Próximos pasos
- Conectar un backend real (por ejemplo Firebase o Supabase) para usuarios, publicaciones y chats en tiempo real
- Notificaciones push reales con `expo-notifications`
- Subida de fotos en publicaciones y perfiles
