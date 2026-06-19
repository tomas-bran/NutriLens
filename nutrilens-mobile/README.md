# NutriLens Mobile

Aplicacion mobile de NutriLens construida con Expo y React Native. Replica el flujo principal de la version web: inicio, captura o seleccion de imagen, analisis con IA, resultado, catalogo y chat sobre productos guardados.

## Requisitos

- Node.js 20 o superior
- npm
- Expo Go en el telefono, o un simulador iOS/Android
- Backend web de NutriLens levantado en `http://localhost:3000`
- Client IDs de Google para Expo/mobile si se quiere probar login real

## Levantar el backend

Desde la raiz del proyecto:

```bash
cd "D:\FedePucci\Archivos\UNLaM\Inteligencia Artificial Aplicada\NutriLens"
docker compose up -d
```

Esto levanta:

- `nutrilens-db`: PostgreSQL en el puerto `5432`
- `nutrilens-app`: aplicacion web/API en el puerto `3000`

Verificacion rapida:

```txt
http://localhost:3000
```

## Levantar la app mobile

Desde esta carpeta:

```bash
cd "D:\FedePucci\Archivos\UNLaM\Inteligencia Artificial Aplicada\NutriLens\nutrilens-mobile"
npm install
npm start
```

Tambien se puede usar:

```bash
npx expo start
```

Luego:

- Escanear el QR con Expo Go en iPhone/Android.
- Usar `i` para simulador iOS, si esta disponible.
- Usar `a` para emulador Android, si esta disponible.

## Conexion con el backend

El cliente API esta en:

```txt
src/services/api.ts
```

Si se define `EXPO_PUBLIC_API_BASE_URL`, la app usa esa URL como backend:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://TU-SUBDOMINIO.ngrok-free.app/api"
npx expo start --tunnel
```

Si no se define esa variable, la app calcula automaticamente la IP de la PC desde Expo:

```ts
const debuggerHost = Constants.expoConfig?.hostUri;
const autoIP = debuggerHost ? debuggerHost.split(':')[0] : null;
```

Y llama a:

```txt
http://<IP_DE_TU_PC>:3000/api
```

Fallbacks:

- Android emulator: `10.0.2.2`
- iOS simulator: `localhost`

Si se prueba en un celular fisico, la PC y el telefono tienen que estar en la misma red Wi-Fi. Si la app no conecta, revisar firewall, Docker y que `localhost:3000` este accesible desde la PC.

## Login con Google

La app obtiene un `id_token` de Google con `expo-auth-session` y lo intercambia por
un token mobile firmado por el backend (`POST /api/mobile/auth/google`). Ese token
viaja como `Authorization: Bearer <token>` en cada request.

> **Importante (Expo SDK 54):** el login con Google **no funciona en Expo Go** —
> Google ya no acepta el redirect del proxy. Necesitás un **development build**
> (`npx expo run:ios` / `run:android` o EAS dev client). Para una demo rápida en
> Expo Go, usá el bypass de abajo.

Identificadores de la app (ya configurados en `app.json`): bundle id iOS y package
Android = **`com.nutrilens.mobile`**, scheme = **`nutrilens`**.

### 1. Crear los OAuth clients en Google Cloud Console (APIs & Services → Credentials)

- **Web application** → copiá su Client ID a `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- **iOS** → Bundle ID `com.nutrilens.mobile` → Client ID a `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- **Android** → Package name `com.nutrilens.mobile` + el **SHA-1** del keystore
  (para EAS: `eas credentials` → Android → ver el SHA-1) → Client ID a
  `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

### 2. Completar el `.env` de la app (copiá de `.env.example`)

```bash
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web>.apps.googleusercontent.com
```

### 3. iOS: registrar el URL scheme (reversed client ID) en `app.json`

Bajo `expo.ios.infoPlist`:

```json
"CFBundleURLTypes": [
  { "CFBundleURLSchemes": ["com.googleusercontent.apps.<ios-client-id-sin-sufijo>"] }
]
```

### 4. Backend: permitir esos client IDs como audience

En `.env.local` (local) y en las App Settings de Azure (prod):

```bash
MOBILE_GOOGLE_CLIENT_IDS="<ios>.apps.googleusercontent.com,<android>.apps.googleusercontent.com,<web>.apps.googleusercontent.com"
```

```bash
# Azure (prod)
az webapp config appsettings set -g nutrilens-rg -n nutrilens-app \
  --settings MOBILE_GOOGLE_CLIENT_IDS="<ios>,<android>,<web>"
```

### Demo en Expo Go sin Google (bypass)

Con el backend en `E2E_AUTH_BYPASS=true`, la app entra con un usuario fijo:

```bash
EXPO_PUBLIC_AUTH_DEV_BYPASS=true
```

> Nunca uses el bypass en un build real ni con `WEBSITE_HOSTNAME` seteado (Azure lo desactiva solo).

## Compartir una prueba local con otras personas

Para que otras personas prueben la app sin estar en tu Wi-Fi, se puede exponer el backend local con ngrok y correr Expo en modo tunnel.

Desde la raiz del proyecto, levantar el backend:

```bash
docker compose up -d
```

En otra terminal, exponer el puerto `3000`:

```bash
ngrok http 3000
```

Ngrok va a devolver una URL HTTPS parecida a:

```txt
https://abc123.ngrok-free.app
```

Desde `nutrilens-mobile`, iniciar Expo usando esa URL:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://abc123.ngrok-free.app/api"
npx expo start --tunnel
```

Luego compartir el QR de Expo. Quien pruebe la app necesita tener Expo Go instalado. Mientras la prueba este activa, la PC debe seguir prendida, Docker debe seguir corriendo y la sesion de ngrok no debe cerrarse.

### Resetear la URL del backend

En la misma terminal de PowerShell:

```powershell
Remove-Item Env:EXPO_PUBLIC_API_BASE_URL
npx expo start
```

O cerrar la terminal y abrir una nueva.

## Endpoints usados

La app mobile usa los mismos endpoints del backend web:

```txt
POST /api/mobile/auth/google
GET  /api/me
GET  /api/me/prefs
PATCH /api/me/prefs
POST /api/analyze
POST /api/chat
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:id
PATCH /api/conversations/:id
DELETE /api/conversations/:id
GET  /api/products
GET  /api/products/:id
```

## Scripts

```bash
npm start
```

Inicia Expo.

```bash
npm run android
```

Inicia Expo apuntando a Android.

```bash
npm run ios
```

Inicia Expo apuntando a iOS.

```bash
npm run web
```

Inicia Expo Web.

```bash
npm run typecheck
```

Ejecuta TypeScript sin emitir archivos.

```bash
npm test
```

Ejecuta los tests con Jest.

## Estructura

```txt
src/
  navigation/
    AppNavigator.tsx
  screens/
    HomeScreen.tsx
    AnalyzeScreen.tsx
    ResultScreen.tsx
    HistoryScreen.tsx
    ChatScreen.tsx
  services/
    api.ts
  theme/
    tokens.ts
```

## Funcionalidades actuales

- Home mobile con accesos a analizar, catalogo y chat.
- Captura con camara.
- Seleccion de imagen desde galeria.
- Envio de imagen a `POST /api/analyze`.
- Pantalla de resultado con:
  - riesgo
  - aptitudes
  - sellos
  - reglas aplicadas
  - ingredientes
  - alergenos
  - explicacion
  - disclaimer
- Catalogo conectado a `GET /api/products`.
- Detalle real desde `GET /api/products/:id`.
- Filtros de catalogo:
  - busqueda
  - riesgo
  - aptitud
  - categoria
  - alergeno
- Chat conectado a `POST /api/chat`.
- Render basico de Markdown en el chat.
- Productos del chat como tarjetas tocables.
- Sugerencias del chat como chips.

## Limitaciones conocidas

- No soporta PDF desde mobile todavia.
- No hay autenticacion ni perfiles de usuario.
- El backend puede completar ingredientes usando Open Food Facts si la extraccion viene incompleta.
- Si la foto no muestra ingredientes, el modelo o el enriquecimiento pueden devolver datos no visibles en la imagen. Esto debe corregirse desde la logica del backend si se requiere trazabilidad estricta.
- El render Markdown del chat es simple, pensado para respuestas cortas y tablas basicas.

## Verificacion usada

```bash
npm run typecheck
npm test -- --silent
```

Estado actual:

```txt
6 test suites passed
15 tests passed
```
