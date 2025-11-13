// =====================================================
// Configuración de backend (cuando el profe abra el puerto)
// =====================================================

// 🔗 Backend IoT en el servidor del profesor (Coolify)
const API_BASE_URL =
  "http://howks88k0os80888co4sc8c4.20.246.73.238.sslip.io:30081";

// URL de health-check del backend
const HEALTH_URL = `${API_BASE_URL}/health`;

// =====================================================
// main.js – Panel IoT Ecovolt
// - Simulación de datos en tiempo real
// - Historial por sensor (para métricas)
// - Min/Max/Promedio en cada tarjeta
// - Sparklines (mini-gráficas)
// - Control ("retroceso") en la card de batería
// =====================================================

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

// =====================================================
// Sparklines (mini-gráficas SVG)
// =====================================================

function drawSparkline(sensorKey, arr, fixedMin, fixedMax) {
  const container = document.querySelector(`.slot__sparkline--${sensorKey}`);
  if (!container) return;

  const points = (arr || []).slice(-30); // últimos 30 puntos
  if (points.length < 2) {
    container.innerHTML = "";
    return;
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 120;
  const height = 32;
  const padding = 2;

  let min = fixedMin ?? points[0].v;
  let max = fixedMax ?? points[0].v;

  if (fixedMin == null || fixedMax == null) {
    points.forEach((p) => {
      if (p.v < min) min = p.v;
      if (p.v > max) max = p.v;
    });
  }

  if (max === min) {
    max = min + 1;
  }

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  let d = "";
  const n = points.length;
  points.forEach((p, idx) => {
    const x = padding + (idx / (n - 1)) * (width - padding * 2);
    const ratio = (p.v - min) / (max - min);
    const y = height - padding - ratio * (height - padding * 2);

    d += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);

  container.innerHTML = "";
  container.appendChild(svg);
}

// =====================================================
// Crea dinámicamente min/max/prom y las sparklines + botón
// =====================================================

function inicializarMetaYControles() {
  // Helper para añadir min/max/prom a una tarjeta + contenedor de sparkline
  function addMeta(sensorKey, unidad) {
    const slot = document.querySelector(
      `.slot[data-key="${sensorKey}"] .slot__body`
    );
    if (!slot) return;

    // Línea de min/max/prom
    const meta = document.createElement("div");
    meta.className = "slot__meta";
    meta.innerHTML = `
      <small data-iot="${sensorKey}-min">Min: -- ${unidad}</small> ·
      <small data-iot="${sensorKey}-max">Max: -- ${unidad}</small> ·
      <small data-iot="${sensorKey}-avg">Prom: -- ${unidad}</small>
    `;
    slot.appendChild(meta);

    // Contenedor de sparkline
    const spark = document.createElement("div");
    spark.className = `slot__sparkline slot__sparkline--${sensorKey}`;
    slot.appendChild(spark);
  }

  addMeta("temperature", "°C");
  addMeta("power", "kW");
  addMeta("voltage", "V");
  addMeta("battery", "%");

  // Botón de "retroceso" en la tarjeta de batería
  const batterySlotBody = document.querySelector(
    '.slot[data-key="battery"] .slot__body'
  );
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

// =====================================================
// Retroceso (control) – botón de batería
// =====================================================

async function aplicarRetrocesoCarga() {
  // 1) Ajustamos el digital twin (front) para que se note el efecto
  iotState.battery = Math.min(100, iotState.battery + 20);
  iotState.lastChargeMinutes = 0;
  pushHistorySample();
  actualizarUI();

  // 2) (Opcional) avisamos al backend
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

// =====================================================
// Actualiza textos, métricas y sparklines
// =====================================================

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

  // Log de "Tiempo real (WebSocket)" (simulado)
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

  // ---- Sparklines ----
  drawSparkline("temperature", history.temperature, 20, 40);
  drawSparkline("power", history.power, 0.4, 3.0);
  drawSparkline("voltage", history.voltage, 210, 240);
  drawSparkline("battery", history.battery, 0, 100);
}

// =====================================================
// Genera un nuevo dato simulado y vuelve a pintar
// =====================================================

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

// =====================================================
// Inicia el "stream" simulado de datos IoT
// =====================================================

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
  checkHealth();                 // Comprueba backend /health (cuando esté accesible)
  inicializarMetaYControles();   // Añade min/max/prom, sparklines y botón de retroceso
  iniciarSimuladorIoT();         // Comienza datos en tiempo real
});
<script>
  // 1. Configuración de sensores usando data-key
  const sensors = {
    temperature: {
      name: "Temperatura",
      unit: "°C",
      description: "Seguimiento de la temperatura ambiente de la estación.",
      history: []
    },
    power: {
      name: "Potencia",
      unit: "kW",
      description: "Potencia instantánea consumida/entregada por la estación.",
      history: []
    },
    voltage: {
      name: "Voltaje",
      unit: "V",
      description: "Voltaje medido en el sistema de carga.",
      history: []
    },
    battery: {
      name: "Batería",
      unit: "%",
      description: "Nivel de batería de la estación o vehículo conectado.",
      history: []
    },
    lastCharge: {
      name: "Última carga",
      unit: "min",
      description: "Tiempo desde la última carga.",
      history: []
    }
  };

  // Valores iniciales fake mientras no hay backend real
  Object.keys(sensors).forEach((id) => {
    const base = { temperature: 28, power: 1.0, voltage: 225, battery: 40, lastCharge: 1500 }[id] ?? 50;
    for (let i = 0; i < 24; i++) {
      const jitter = (Math.random() - 0.5) * 4;
      sensors[id].history.push(Math.max(0, base + jitter));
    }
  });

  // Sparkline en cada .slot__sparkline
  function renderSparkline(container, data) {
    if (!container || !data || data.length === 0) return;
    const width = container.clientWidth || 160;
    const height = 28;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="100%" stop-color="#0ea5e9" />
          </linearGradient>
        </defs>
        <polyline
          points="${points}"
          fill="none"
          stroke="url(#sparkGradient)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  // Ref modal
  const modalBackdrop = document.getElementById("iot-modal-backdrop");
  const modalTitle = document.getElementById("iot-modal-title");
  const modalSubtitle = document.getElementById("iot-modal-subtitle");
  const modalCurrent = document.getElementById("iot-modal-current");
  const modalMin = document.getElementById("iot-modal-min");
  const modalMax = document.getElementById("iot-modal-max");
  const modalAvg = document.getElementById("iot-modal-avg");
  const modalChart = document.getElementById("iot-modal-chart");
  const modalClose = document.getElementById("iot-modal-close");

  function statsFromHistory(data) {
    if (!data || data.length === 0) return { current: "-", min: "-", max: "-", avg: "-" };
    const current = data[data.length - 1];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return { current, min, max, avg };
  }

  function renderHistoryChart(sensorId, container) {
    const sensor = sensors[sensorId];
    if (!sensor || !container) return;
    const data = sensor.history;
    if (!data || data.length === 0) {
      container.innerHTML = "<p style='padding:1rem;font-size:0.85rem;'>Sin datos suficientes.</p>";
      return;
    }

    const width = container.clientWidth || 320;
    const height = 170;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(34,211,238,0.5)" />
            <stop offset="100%" stop-color="rgba(14,165,233,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,${height} L${points.replace(/ /g, " L")} L${width},${height} Z"
          fill="url(#historyGradient)"
          stroke="none"
        ></path>
        <polyline
          points="${points}"
          fill="none"
          stroke="#22d3ee"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  function openTelemetryModal(sensorId) {
    const sensor = sensors[sensorId];
    if (!sensor) return;

    const { current, min, max, avg } = statsFromHistory(sensor.history);

    modalTitle.textContent = sensor.name;
    modalSubtitle.textContent = sensor.description;
    modalCurrent.textContent = `${current.toFixed ? current.toFixed(1) : current} ${sensor.unit}`;
    modalMin.textContent = `${min.toFixed ? min.toFixed(1) : min} ${sensor.unit}`;
    modalMax.textContent = `${max.toFixed ? max.toFixed(1) : max} ${sensor.unit}`;
    modalAvg.textContent = `${avg.toFixed ? avg.toFixed(1) : avg} ${sensor.unit}`;

    renderHistoryChart(sensorId, modalChart);
    modalBackdrop.classList.remove("is-hidden");
  }

  function closeTelemetryModal() {
    modalBackdrop.classList.add("is-hidden");
  }

  if (modalClose && modalBackdrop) {
    modalClose.addEventListener("click", closeTelemetryModal);
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeTelemetryModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTelemetryModal();
    });
  }

  function initSlotsTelemetry() {
    const cards = document.querySelectorAll(".js-sensor-card");
    cards.forEach((card) => {
      const sensorId = card.dataset.key; // temperature, power, etc.
      const sensor = sensors[sensorId];
      if (!sensor) return;

      const spark = card.querySelector(".slot__sparkline");
      if (spark) renderSparkline(spark, sensor.history);

      // No tocamos tu lógica de data-iot, solo rellenamos si está vacío
      const valueEl = card.querySelector(".slot__value");
      if (valueEl && valueEl.textContent.trim().startsWith("--")) {
        const last = sensor.history[sensor.history.length - 1];
        valueEl.textContent = `${last.toFixed(1)} ${sensor.unit}`;
      }

      card.style.cursor = "pointer";
      card.addEventListener("click", () => openTelemetryModal(sensorId));
    });
  }

  // Simulación ligera para que se muevan las gráficas
  function simulateLiveUpdates() {
    setInterval(() => {
      Object.keys(sensors).forEach((sensorId) => {
        const sensor = sensors[sensorId];
        const last = sensor.history[sensor.history.length - 1] || 50;
        const jitter = (Math.random() - 0.5) * 3;
        const next = last + jitter;

        sensor.history.push(next);
        if (sensor.history.length > 24) sensor.history.shift();

        const card = document.querySelector(`.js-sensor-card[data-key="${sensorId}"]`);
        if (card) {
          const spark = card.querySelector(".slot__sparkline");
          if (spark) renderSparkline(spark, sensor.history);

          const valueEl = card.querySelector(".slot__value");
          if (valueEl && valueEl.textContent.includes("--")) {
            valueEl.textContent = `${next.toFixed(1)} ${sensor.unit}`;
          }
        }

        if (!modalBackdrop.classList.contains("is-hidden") &&
            modalTitle.textContent === sensor.name) {
          renderHistoryChart(sensorId, modalChart);
        }
      });
    }, 5000);
  }

  window.addEventListener("DOMContentLoaded", () => {
    initSlotsTelemetry();
    simulateLiveUpdates();
  });
</script>

