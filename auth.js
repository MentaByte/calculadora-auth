/* ================================================
   AUTENTICACIÓN - Sistema de Licencias
   ⚠️ NO MODIFICAR - Compatible con todas las PWAs
   =============================================== */

const SUPABASE_URL = "https://zgatennqbagmyfbpiakr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYXRlbm5xYmFnbXlmYnBpYWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTg3NTEsImV4cCI6MjA4NjU5NDc1MX0.5c_IoL3_PM1zwFsuvblkoCoWbP9-4BSaMcIwSasLprw";

/**
 * Genera o recupera el ID único del dispositivo
 * Se almacena en localStorage para identificar el dispositivo
 */
export function getDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}

/**
 * Activa una licencia con el código proporcionado
 * @param {string} code - Código de licencia (formato: MF-XXXX-XXXX-XXXX)
 * @returns {Promise<Object>} - Resultado de la activación
 */
export async function activateLicense(code) {
  const device_id = getDeviceId();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code, device_id }),
  });
  return res.json();
}

/**
 * Valida la sesión actual del usuario
 * @returns {Promise<Object>} - Estado de la validación
 */
export async function validateSession() {
  const session_token = localStorage.getItem("session_token");
  const device_id = getDeviceId();

  if (!session_token) return { valid: false, error: "no_token" };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ session_token, device_id }),
    });
    const result = await res.json();

    // Guarda el último estado conocido para modo offline
    if (result.valid === true) {
      localStorage.setItem("last_known_status", "valid");
    } else if (result.error === "revoked") {
      localStorage.setItem("last_known_status", "revoked");
    }

    return result;
  } catch (e) {
    // Sin internet — usa el último estado conocido
    const lastStatus = localStorage.getItem("last_known_status");
    if (lastStatus === "revoked") {
      return { valid: false, error: "revoked" };
    }
    // Si no hay estado conocido o era válido, permitir acceso offline
    return { valid: false, no_internet: true };
  }
}

/**
 * Guarda el token de sesión en localStorage
 * @param {string} token - Token de sesión
 */
export function saveSession(token) {
  localStorage.setItem("session_token", token);
  localStorage.setItem("last_known_status", "valid");
}

/**
 * Elimina la sesión del dispositivo
 */
export function clearSession() {
  localStorage.removeItem("session_token");
  localStorage.removeItem("last_known_status");
}
