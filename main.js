// =====================================================
// main.js – Panel IoT Ecovolt (simulación + health-check)
// =====================================================

// URL de health-check del backend (si no la usas, deja el string vacío)
const HEALTH_URL = "https://lanny-unintensified-guadalupe.ngrok-free.dev/health";

// ---- Referencias a elementos del DOM ----

// Cards de arriba
const elLastLog = document.querySelector('[data-iot="last-log"]');
const elWsLog   = document.querySelector('[data-iot="ws-log"]');

// Tarjetas IoT
const elTemp       = document.querySelector('[data-iot="temp"]');
const elPower      = document.querySelector('[data-iot="power"]');
const elVoltage    = document.querySelector('[data-iot="voltage"]');
const elBattery    = document.querySelector('[data-iot="battery"]');
const elLastCharge = document.querySelector('[data-iot="last-charge"]');

// =====================================================
// HEALTH CHECK SENCILLO
// =====================================================

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

// =====================================================
// SIMULADOR DE DATOS IoT EN TIEMPO REAL
// =====================================================

// Estado interno simulado
const iotState = {
  temp: 27.3,            // °C
  power: 1.47,           // kW
  voltage: 220,          // V
  battery: 77,           // %
  lastChargeMinutes: 41  // minutos
};

// Actualiza los textos del panel con el estado actual
function actualizarUI() {
  if (elTemp) {
    elTemp.textContent = `${iotState.temp.toFixed(1)} °C`;
  }

  if (elPower) {
    elPower.textContent = `${iotState.power.toFixed(2)} kW`;
  }

  if (elVoltage) {
    elVoltage.textContent = `${iotState.voltage.toFixed(0)} V`;
  }

  if (elBattery) {
    elBattery.textContent = `${iotState.battery.toFixed(0)} %`;
  }

  if (elLastCharge) {
    elLastCharge.textContent = `${iotState.lastChargeMinutes} min`;
  }

  if (elLastLog) {
    elLastLog.textContent =
      `Última lectura: ${iotState.temp.toFixed(1)} °C, ` +
      `${iotState.power.toFixed(2)} kW, ` +
      `${iotState.voltage.toFixed(0)} V, ` +
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

// Genera nuevos datos simulados y vuelve a pintar
function simularNuevoDato() {
  // Cambios suaves para que parezca sensor real
  iotState.temp += (Math.random() - 0.5) * 0.4;      // ±0.2 °C
  iotState.power += (Math.random() - 0.5) * 0.10;    // ±0.05 kW
  iotState.voltage += (Math.random() - 0.5) * 1.5;   // ±0.75 V
  iotState.battery += (Math.random() - 0.7) * 2;     // tiende a bajar
  iotState.lastChargeMinutes += 1;                   // 1 min por ciclo

  // Limitar rangos razonables
  if (iotState.temp < 20) iotState.temp = 20;
  if (iotState.temp > 40) iotState.temp = 40;

  if (iotState.power < 0.4) iotState.power = 0.4;
  if (iotState.power > 3.0) iotState.power = 3.0;

  if (iotState.voltage < 210) iotState.voltage = 210;
  if (iotState.voltage > 240) iotState.voltage = 240;

  if (iotState.battery < 5) iotState.battery = 5;
  if (iotState.battery > 100) iotState.battery = 100;

  actualizarUI();
}

// Arranca el “stream” simulado en tiempo real
function iniciarSimuladorIoT() {
  // Primera pintura
  actualizarUI();

  // Cada 5 segundos, nuevos datos
  setInterval(simularNuevoDato, 5000);

  if (elWsLog) {
    elWsLog.textContent = "Conectado al flujo en tiempo real...";
  }
}

// =====================================================
// ARRANQUE DE LA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  // Comprobar backend (opcional)
  checkHealth();

  // Empezar a simular datos IoT
  iniciarSimuladorIoT();
});

