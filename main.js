// URL del backend para el health-check
const HEALTH_URL = "https://lanny-unintensified-guadalupe.ngrok-free.dev/health";

// Elementos del panel IoT (ajusta los selectores si usas otros)
const serverStatusChip = document.querySelector('[data-iot="server-chip"]');
const serverStatusText = document.querySelector('[data-iot="server-text"]');
const refreshButton    = document.querySelector('[data-iot="refresh"]');

// Cambia el estado visual del servidor
function setServerStatus(ok, message) {
  if (!serverStatusChip || !serverStatusText) return;

  if (ok) {
    serverStatusChip.classList.remove("status-badge--error");
    serverStatusChip.classList.add("status-badge--ok");
    serverStatusText.textContent = message || "Servidor operativo";
  } else {
    serverStatusChip.classList.remove("status-badge--ok");
    serverStatusChip.classList.add("status-badge--error");
    serverStatusText.textContent = message || "Servidor sin conexión";
  }
}

// Hace la petición al /health
async function checkHealth() {
  try {
    setServerStatus(false, "Verificando...");

    const res = await fetch(HEALTH_URL, { cache: "no-store" });

    if (!res.ok) {
      setServerStatus(false, "Error en el servidor");
      return;
    }

    const data = await res.json().catch(() => null);
    const msg =
      data && (data.status || data.message)
        ? `${data.status || ""} ${data.message || ""}`.trim()
        : "Servidor operativo";

    setServerStatus(true, msg);
  } catch (err) {
    console.error("Error al consultar /health", err);
    setServerStatus(false, "Servidor sin conexión");
  }
}

// Cuando cargue la página, lanza el chequeo y el botón de recarga
document.addEventListener("DOMContentLoaded", () => {
  checkHealth();

  if (refreshButton) {
    refreshButton.addEventListener("click", (e) => {
      e.preventDefault();
      checkHealth();
    });
  }
});

