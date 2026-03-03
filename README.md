# 🔐 Calculadora con Autenticación

Calculadora Android fake con sistema de autenticación por códigos de licencia usando Supabase.

## 📋 Estructura del Proyecto

```
calculadora-auth/
├── index.html          # Página de activación con código
├── auth.js             # Sistema de autenticación (NO MODIFICAR)
├── manifest.json       # Configuración PWA
├── sw.js              # Service Worker para modo offline
├── fenix.html         # Página de acceso revocado
├── icon-192.png       # Ícono PWA 192x192
├── icon-512.png       # Ícono PWA 512x512
└── core/
    └── index.html     # Calculadora protegida
```

## 🚀 Cómo funciona

### 1. Flujo de autenticación

```
Usuario recibe link
    ↓
/?k=MF-XXXX-XXXX-XXXX
    ↓
index.html valida código
    ↓
    ├─ ✅ Válido → Guarda sesión → Redirige a /core/ (calculadora)
    ├─ ❌ Inválido → Muestra error
    ├─ 🚫 Revocado → Muestra error
    └─ 📱 Ya usado → Muestra error
```

### 2. Validación en cada acceso

Cada vez que el usuario abre `/core/index.html`:
- ✅ Sesión válida → Muestra calculadora
- ❌ Sesión revocada → Redirige a `fenix.html`
- ⚠️ Sin internet → Permite acceso offline (si había sesión válida previa)
- 🚫 Sin sesión → Redirige a inicio

## 📱 Instalación como PWA

Los usuarios pueden instalar la calculadora como app:

- **Chrome/Edge:** Menú → Instalar app
- **Safari iOS:** Compartir → Agregar a pantalla de inicio
- **Firefox:** Menú → Instalar

## 🔑 Generar códigos de licencia

### Opción A: Desde Supabase UI
1. Ve a Table Editor → `licenses`
2. Insert row
3. Deja el `code` vacío (se genera automático)
4. Guarda

### Opción B: Desde SQL Editor
```sql
INSERT INTO licenses DEFAULT VALUES
RETURNING code;
```

Esto genera un código como: `MF-XXXX-XXXX-XXXX`

## 🔗 Compartir acceso

Envía al usuario el link:
```
https://tudominio.com/?k=MF-XXXX-XXXX-XXXX
```

## 🛡️ Revocar acceso

Para revocar el acceso de un usuario:

```sql
UPDATE licenses
SET revoked = TRUE
WHERE code = 'MF-XXXX-XXXX-XXXX';
```

La próxima vez que el usuario abra la app (con internet), será redirigido a `fenix.html`.

## ⚡ Modo Offline

El Service Worker permite que la calculadora funcione sin conexión después de la primera carga:

- **Cache-first** para archivos locales (HTML, CSS, iconos)
- **Network-first** para `core/index.html` y `auth.js` (validación fresca)
- **Never cache** para Supabase (validación siempre online cuando hay internet)

## 🎨 Personalización

### Colores del tema
Los colores ya están configurados según el tema de la calculadora:
- Fondo: `#fff8f7`
- Botones: `#fbd9d7`
- Acento: `#6b5f00`

### Modificar la calculadora
Edita `/core/index.html` para cambiar la funcionalidad de la calculadora.

**⚠️ NO modifiques:**
- La sección de validación de sesión
- El import de `auth.js`
- El registro del Service Worker

## 🧪 Testing Local

```bash
# 1. Sirve los archivos
npx serve .
# o
python -m http.server 8000

# 2. Genera un código en Supabase

# 3. Abre en navegador
http://localhost:8000/?k=TU-CODIGO-AQUI

# 4. Verifica en DevTools
# Application → Service Workers (debe estar activo)
# Application → Cache Storage (archivos cacheados)
# Network → Offline (debe funcionar sin internet)
```

## 📊 Base de Datos (Referencia)

La tabla `licenses` en Supabase ya existe con esta estructura:

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE DEFAULT generate_license_code(),
  device_id TEXT,
  session_token TEXT UNIQUE,
  activated_at TIMESTAMPTZ,
  last_validated TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Troubleshooting

### "Acceso no válido"
- Verifica que el código exista en Supabase
- Confirma que `revoked = false`

### La calculadora no carga offline
- Abre la app al menos una vez con internet
- Verifica que los archivos estén en Cache Storage (DevTools)

### "Este código ya está activo en otro dispositivo"
- Cada código funciona en UN solo dispositivo
- Genera un nuevo código para otro dispositivo

### Validación siempre dice "sin internet"
- Verifica las credenciales de Supabase en `auth.js`
- Confirma que las Edge Functions estén desplegadas

## ✅ Checklist de Despliegue

- [ ] Subir todos los archivos al servidor
- [ ] Generar códigos de licencia en Supabase
- [ ] Probar activación con código válido
- [ ] Probar funcionamiento offline
- [ ] Probar revocación de acceso
- [ ] Verificar instalación como PWA

## 🎯 Características Implementadas

- ✅ Autenticación por código único
- ✅ Un código = un dispositivo
- ✅ Detección de revocación
- ✅ Funcionamiento offline
- ✅ Instalable como PWA
- ✅ Service Worker optimizado
- ✅ Calculadora Android fake completa

---

**Listo para usar** 🚀
