// -------------------------
// CONFIGURACIÓN
// -------------------------

// (Opcional) URL de tu backend para health-check
const HEALTH_URL = "https://lanny-unintensified-guadalupe.ngrok-free.dev/health";

// Elementos del panel IoT
const elLastLog    = document.querySelector('[data-iot="last-log"]');
const elWsLog      = document.querySelector('[data-iot="ws-log"]');
const elTemp       = document.querySelector('[data-iot="temp"]');
const elPower      = document.querySelector('[data-iot="power"]');
const elVoltage    = document.querySelector('[data-iot="voltage"]');
const elBattery    = document.querySelector('[data-iot="battery"]');
const elLastCharge = document.querySelector('[data-iot="last-charge"]');

// -------------------------
// HEALTH CHECK (simple)
// -------------------------
async function checkHealth() {
  if (!HEALTH_URL || !elLastLog) return;

  try {
    elLastLog.textContent = "Conectando con servidor...";

    const res = await fetch(HEALTH_URL, { cache: "no-store" });

    if (!res.ok) {
      elLastLog.textContent = "Servidor sin conexión (health-check falló)";
      return;
    }

    const data = await res.json().catch(() => null);
    const msg =
      data && (data.status || data.message)
        ? `${data.status || ""} ${data.message || ""}`.trim()
        : "Servidor operativo";

    elLastLog.textContent = `Servidor operativo – ${msg}`;
  } catch (err) {
    console.error("Error en health-check", err);
    elLastLog.textContent = "Servidor sin conexión (no se pudo contactar)";
  }
}

// -------------------------
// SIMULADOR IoT EN TIEMPO REAL
// -------------------------

// Estado "fake" de la estación
const iotState = {
  temp: 27.5,          // °C
  power: 1.3,          // kW
  voltage: 219,        // V
  battery: 82,         // %
  lastChargeMinutes: 35
};

function actualizarUI() {
  if (elTemp)       elTemp.textContent       = `${iotState.temp.toFixed(1)} °C`;
  if (elPower)      elPower.textContent      = `${iotState.power.toFixed(2)} kW`;
  if (elVoltage)    elVoltage.textContent    = `${iotState.voltage.toFixed(0)} V`;
  if (elBattery)    elBattery.textContent    = `${iotState.battery.toFixed(0)} %`;
  if (elLastCharge) elLastCharge.textContent = `${iotState.lastChargeMinutes} min`;

  if (elLastLog) {
    elLastLog.textContent =
      `Última lectura: ${iotState.temp.toFixed(1)} °C, ` +
      `${iotState.power.toFixed(2)} kW, ${iotState.voltage.toFixed(0)} V, ` +
      `batería ${iotState.battery.toFixed(0)} %, ` +
      `última carga hace ${iotState.lastChargeMinutes} min.`;
  }

  if (elWsLog) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    elWsLog.textContent =
      `[${hh}:${mm}:${ss}] Nuevo dato recibido: ` +
      `${iotState.temp.toFixed(1)} °C, batería ${iotState.battery.toFixed(0)} %`;
  }
}

function simularNuevoDato() {
  // Cambios suaves para que parezca real
  iotState.temp += (Math.random() - 0.5) * 0.4;          // +-0.2 °C
  iotState.power += (Math.random() - 0.5) * 0.1;         // +-0.05 kW
  iotState.voltage += (Math.random() - 0.5) * 1.5;       // +-0.75 V
  iotState.battery += (Math.random() - 0.7) * 2;         // tiende a bajar
  iotState.lastChargeMinutes += 1;                       // 1 min por tick

  // Límites razonables
  if (iotState.temp < 20) iotState.temp = 20;
  if (iotState.temp > 40) iotState.temp = 40;

  if (iotState.power < 0.4) iotState.power = 0.4;
  if (iotState.power > 3.0) iotState.power = 3.0;

  if (iotState.voltage < 210) iotState.voltage = 210;
  if (iotState.voltage > 240) iotState.voltage = 240;

  if (iotState.battery < 5)  iotState.battery = 5;
  if (iotState.battery > 100) iotState.battery = 100;

  actualizarUI();
}

function iniciarSimuladorIoT() {
  // Primera actualización inmediata
  actualizarUI();

  // Cada 5 segundos simulamos un nuevo paquete de datos
  setInterval(simularNuevoDato, 5000);

  if (elWsLog) {
    elWsLog.textContent = "Conectado al flujo en tiempo real...";
  }
}

// -------------------------
// INICIO
// -------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Health simple del backend (opcional)
  checkHealth();

  // Simulador IoT en tiempo real para el panel
  iniciarSimuladorIoT();
});


