// =====================================================
// main.js – Panel IoT Ecovolt
// - Simulación de datos en tiempo real
// - Historial por sensor (para métricas)
// - Control ("retroceso") en la card de batería
// =====================================================

// URL de health-check del backend (puedes dejarla vacía si aún no lo usas)
const HEALTH_URL = "https://lanny-unintensified-guadalupe.ngrok-free.dev/health";

// (Opcional) URL del backend propio para comandos, etc.
const API_BASE_URL = ""; // Ej: "https://mi-backend-ecovolt.coolify.app"

// ---- Elementos principales del panel ----
const elLastLog = document.querySelector('[data-iot="last-log"]');
const elWsLog   = document.querySelector('[data-iot="ws-log"]');

// Tarjetas métricas
const elTemp       = document.querySelector('[data-iot="temp"]');
const elPower      = document.querySelector('[data-iot="power"]');
const elVoltage    = document.querySelector('[data-iot="voltage"]');
const elBattery    = document.querySelector('[data-iot="battery"]');
const elLastCharge = document.querySelector('[data-iot="last-charge"]');

// =====================================================
// HEALTH CHECK SENCILLO (para mostrar que hay backend)
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
// SIMULACIÓN IoT + HISTORIAL + MÉTRICAS
// =====================================================

// Estado actual de la "estación" (digital twin)
const iotState = {
  temp: 27.3,            // °C
  power: 1.47,           // kW
  voltage: 220,          // V
  battery: 77,           // %
  lastChargeMinutes: 41  // min desde la última carga
};

// Historial simple para 7 días (aprox). Guardaremos los últimos N puntos
const history = {
  temperature: [],
  power: [],
  voltage: [],
  battery: [],
  lastChargeMinutes: []
};

// Máximo de puntos que mantendremos en memoria
const HISTORY_LIMIT = 7 * 24 * 6; // 7 días, 1 punto cada 10 min (simulado)

// Añade muestra de los sensores al historial
function pushHistorySample(timestamp = Date.now()) {
  history.temperature.push({ t: timestamp, v: iotState.temp });
  history.power.push({ t: timestamp, v: iotState.power });
  history.voltage.push({ t: timestamp, v: iotState.voltage });
  history.battery.push({ t: timestamp, v: iotState.battery });
  history.lastChargeMinutes.push({ t: timestamp, v: iotState.lastChargeMinutes });

  // Si pasa del límite, quitamos los más viejos
  Object.keys(history).forEach((key) => {
    const arr = history[key];
    if (arr.length > HISTORY_LIMIT) {
      arr.splice(0, arr.length - HISTORY_LIMIT);
    }
  });
}

// Calcula min, max, promedio de un arreglo de {t, v}
function calcularMetricas(arr) {
  if (!arr || arr.length === 0) {
    return { min: null, max: null, avg: null };
  }
  let min = arr[0].v;
  let max = arr[0].v;
  let sum = 0;
  arr.forEach((p) => {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
    sum += p.v;
  });
  return {
    min,
    max,
    avg: sum / arr.length
  };
}

// Crea dinámicamente las líneas de min/max/promedio y el botón de control
function inicializarMetaYControles() {
  // Helper para añadir min/max/prom a una tarjeta
  function addMeta(sensorKey, unidad) {
    const slot = document.querySelector(`.slot[data-key="${sensorKey}"] .slot__body`);
    if (!slot) return;

    const meta = document.createElement("div");
    meta.className = "slot__meta"; // no tiene estilos, pero se verá en una segunda línea
    meta.innerHTML = `
      <small data-iot="${sensorKey}-min">Min: -- ${unidad}</small> ·
      <small data-iot="${sensorKey}-max">Max: -- ${unidad}</small> ·
      <small data-iot="${sensorKey}-avg">Prom: -- ${unidad}</small>
    `;
    slot.appendChild(meta);
  }

  addMeta("temperature", "°C");
  addMeta("power", "kW");
  addMeta("voltage", "V");
  addMeta("battery", "%");

  // Botón de "retroceso" en la tarjeta de batería (simula un comando al cargador)
  const batterySlotBody = document.querySelector('.slot[data-key="battery"] .slot__body');
  if (batterySlotBody) {
    const actions = document.createElement("div");
    actions.className = "slot__actions";
    actions.style.marginTop = "4px";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Forzar carga (retroceso)";
    btn.style.border = "none";
    btn.style.borderRadius = "999px";
    btn.style.padding = "4px 10px";
    btn.style.fontSize = "12px";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      aplicarRetrocesoCarga();
    });

    actions.appendChild(btn);
    batterySlotBody.appendChild(actions);
  }
}

// Aplica un comando de "retroceso" (control)
async function aplicarRetrocesoCarga() {
  // 1) Ajustamos el digital twin (front) para que se note el efecto
  iotState.battery = Math.min(100, iotState.battery + 20);
  iotState.lastChargeMinutes = 0;
  pushHistorySample();
  actualizarUI();

  // 2) (Opcional) avisamos al backend que dispare el comando real
  if (API_BASE_URL) {
    try {
      await fetch(`${API_BASE_URL}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "charger-1",
          action: "force_charge",
          targetBattery: iotState.battery
        })
      });
      if (elLastLog) {
        elLastLog.textContent += " | Comando de carga enviado al backend.";
      }
    } catch (err) {
      console.error("Error enviando comando de retroceso al backend", err);
    }
  }
}

// Actualiza los textos de la UI con el estado actual y las métricas
function actualizarUI() {
  // Valores actuales
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

  // Resumen para el card de "Últimos datos IoT"
  if (elLastLog) {
    elLastLog.textContent =
      `Última lectura: ${iotState.temp.toFixed(1)} °C, ` +
      `${iotState.power.toFixed(2)} kW, ` +
      `${iotState.voltage.toFixed(0)} V, ` +
      `batería ${iotState.battery.toFixed(0)} %, ` +
      `última carga hace ${iotState.lastChargeMinutes} min.`;
  }

  // Log de "Tiempo real (WebSocket)" (aunque aquí usamos setInterval, actúa como flujo en vivo)
  if (elWsLog) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    elWsLog.textContent =
      `[${hh}:${mm}:${ss}] Nuevo dato recibido: ` +
      `${iotState.temp.toFixed(1)} °C, batería ${iotState.battery.toFixed(0)} %`;
  }

  // ---- Métricas de historial en cada tarjeta ----
  function setMeta(sensorKey, unidad, arr) {
    const stats = calcularMetricas(arr);
    const minEl = document.querySelector(`[data-iot="${sensorKey}-min"]`);
    const maxEl = document.querySelector(`[data-iot="${sensorKey}-max"]`);
    const avgEl = document.querySelector(`[data-iot="${sensorKey}-avg"]`);

    if (stats.min != null && minEl) {
      minEl.textContent = `Min: ${stats.min.toFixed(1)} ${unidad}`;
    }
    if (stats.max != null && maxEl) {
      maxEl.textContent = `Max: ${stats.max.toFixed(1)} ${unidad}`;
    }
    if (stats.avg != null && avgEl) {
      avgEl.textContent = `Prom: ${stats.avg.toFixed(1)} ${unidad}`;
    }
  }

  setMeta("temperature", "°C", history.temperature);
  setMeta("power", "kW", history.power);
  setMeta("voltage", "V", history.voltage);
  setMeta("battery", "%", history.battery);
}

// Genera un nuevo dato simulado y vuelve a pintar
function simularNuevoDato() {
  // Cambios suaves para que parezca sensor real
  iotState.temp += (Math.random() - 0.5) * 0.4;      // ±0.2 °C
  iotState.power += (Math.random() - 0.5) * 0.10;    // ±0.05 kW
  iotState.voltage += (Math.random() - 0.5) * 1.5;   // ±0.75 V
  iotState.battery += (Math.random() - 0.7) * 2;     // tiende a bajar
  iotState.lastChargeMinutes += 10;                  // simulamos cada 10 min

  // Limitar rangos razonables
  if (iotState.temp < 20) iotState.temp = 20;
  if (iotState.temp > 40) iotState.temp = 40;

  if (iotState.power < 0.4) iotState.power = 0.4;
  if (iotState.power > 3.0) iotState.power = 3.0;

  if (iotState.voltage < 210) iotState.voltage = 210;
  if (iotState.voltage > 240) iotState.voltage = 240;

  if (iotState.battery < 5) iotState.battery = 5;
  if (iotState.battery > 100) iotState.battery = 100;

  // Guardar en historial y actualizar UI
  pushHistorySample();
  actualizarUI();
}

// Inicia el "stream" simulado de datos IoT
function iniciarSimuladorIoT() {
  // 1. Llenamos el historial inicial como si fuera 1 día de datos antiguos
  for (let i = 0; i < 24 * 6; i++) {  // 24h * 6 (cada 10 min)
    simularNuevoDato();
  }

  // 2. A partir de ahora, cada 5 segundos simulamos 10 min nuevos
  setInterval(simularNuevoDato, 5000);

  if (elWsLog) {
    elWsLog.textContent = "Conectado al flujo en tiempo real (simulado)...";
  }
}

// =====================================================
// ARRANQUE DE LA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();                 // Comprueba backend /health
  inicializarMetaYControles();   // Añade min/max/prom y botón de retroceso
  iniciarSimuladorIoT();         // Comienza datos en tiempo real
});
