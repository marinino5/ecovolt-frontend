// Smooth scroll + resaltado de sección actual
const links = [...document.querySelectorAll('.menu a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

links.forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const id = a.getAttribute('href');
    document.querySelector(id)?.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

const spy = () => {
  const pos = window.scrollY + 120;
  let current = links[0];
  sections.forEach((sec,i)=>{
    if (pos >= sec.offsetTop) current = links[i];
  });
  links.forEach(l=>l.classList.remove('is-active'));
  current?.classList.add('is-active');
};
spy();
window.addEventListener('scroll', spy);

// Menú móvil
const hamb = document.getElementById('hamb');
const menu = document.getElementById('menu');
hamb?.addEventListener('click', ()=>{
  if (menu.style.display === 'flex') {
    menu.style.display = '';
  } else {
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '12px';
    menu.style.position = 'absolute';
    menu.style.right = '20px';
    menu.style.top = '60px';
    menu.style.background = '#ffffff';
    menu.style.border = '1px solid #e5edf5';
    menu.style.borderRadius = '12px';
    menu.style.padding = '12px';
    menu.style.boxShadow = '0 15px 30px rgba(0,0,0,.12)';
  }
});

// Micro-animación en los slots (brillito al pasar)
document.querySelectorAll('.slot').forEach(slot=>{
  slot.addEventListener('mousemove', (e)=>{
    const r = slot.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    slot.style.setProperty('--mx', `${x}px`);
    slot.style.setProperty('--my', `${y}px`);
    slot.style.background =
      `radial-gradient(220px 160px at var(--mx) var(--my), rgba(34,211,238,.10), transparent 60%), #fff`;
  });
  slot.addEventListener('mouseleave', ()=>{
    slot.style.background = '#fff';
  });
});

// Placeholder: si quieres inyectar luego tarjetas reales, usa este ancla:
window.ECOVOLT_PANEL_MOUNT = function mount(htmlByKey){
  // htmlByKey: { temperature: '<div>…</div>', power:'…', ... }
  Object.entries(htmlByKey).forEach(([key,html])=>{
    const cell = document.querySelector(`.slot[data-key="${key}"] .slot__body`);
    if (cell) cell.innerHTML = html;
  });
};
// ===========================
// 🔌 INTEGRACIÓN CON BACKEND IOT
// ===========================

const { ENDPOINTS } = window.ECOVOLT_CONFIG;

// Helpers para actualizar tarjetas UI
function updateCard(key, value, timestamp) {
  // Card principal con data-key="temperature", "power", etc.
  const card = document.querySelector(`.ha-card[data-key="${key}"]`);
  if (!card) return;

  // Valor principal
  const valueEl = card.querySelector(".ha-card__value");
  if (valueEl) valueEl.textContent = value;

  // Timestamp tipo “Hace 2 min”
  const timeEl = card.querySelector(".ha-card__timestamp");
  if (timeEl) {
    const date = new Date(timestamp);
    timeEl.textContent = `Actualizado: ${date.toLocaleTimeString()}`;
  }
}

// 1️⃣ Cargar estado actual desde el backend
async function cargarEstadoActual() {
  try {
    const res = await fetch(ENDPOINTS.STATE);
    if (!res.ok) throw new Error("Error cargando /api/state");

    const data = await res.json(); 
    // Data esperada:
    // { temperature, power, voltage, battery, lastChargeMinutes, timestamp }

    // ==========================
    // Temperatura
    // ==========================
    updateCard(
      "temperature",
      `${data.temperature.toFixed(1)} °C`,
      data.timestamp
    );

    // ==========================
    // Potencia
    // ==========================
    updateCard(
      "power",
      `${data.power.toFixed(2)} kW`,
      data.timestamp
    );

    // ⚡ Si luego agregas “voltaje”, “batería”, los conectamos igual.
    
  } catch (err) {
    console.error("Error en cargarEstadoActual:", err);
  }
}

// Llamar al cargar la página
cargarEstadoActual();

// Actualizar cada 5 segundos
setInterval(cargarEstadoActual, 5000);
// ===========================
// 🔌 INTEGRACIÓN CON BACKEND IOT ECOVOLT
// ===========================

// Asegurarnos de que la config exista
const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// Helper para actualizar una tarjeta específica
function updateCard(key, value, timestampText) {
  const card = document.querySelector(`.ha-card[data-key="${key}"]`);
  if (!card) return;

  const valueEl = card.querySelector(".ha-card__value");
  if (valueEl) valueEl.textContent = value;

  const timeEl = card.querySelector(".ha-card__timestamp");
  if (timeEl && timestampText) {
    timeEl.textContent = timestampText;
  }
}

// Formatear hora bonita
function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return `Actualizado: ${d.toLocaleTimeString()}`;
  } catch {
    return "";
  }
}

// 1️⃣ Estado actual (todas las tarjetas numéricas)
async function cargarEstadoActual() {
  if (!ENDPOINTS.STATE) {
    console.warn("ENDPOINTS.STATE no definido. ¿config.js se carga antes que iotapp.js?");
    return;
  }

  try {
    const res = await fetch(ENDPOINTS.STATE);
    if (!res.ok) throw new Error("Error cargando /api/state");

    const data = await res.json();
    const tsText = formatTimestamp(data.timestamp);

    // Temperatura
    updateCard("temperature", `${data.temperature.toFixed(1)} °C`, tsText);

    // Potencia
    updateCard("power", `${data.power.toFixed(2)} kW`, tsText);

    // Voltaje
    updateCard("voltage", `${data.voltage.toFixed(1)} V`, tsText);

    // Batería
    updateCard("battery", `${data.battery.toFixed(1)} %`, tsText);

    // Última carga (en minutos)
    updateCard("lastCharge", `${data.lastChargeMinutes} min`, tsText);

  } catch (err) {
    console.error("Error en cargarEstadoActual:", err);
  }
}

// 2️⃣ Inicializar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  cargarEstadoActual();
  // Actualizar cada 5 s
  setInterval(cargarEstadoActual, 5000);
});

// ===========================
// 📈 HISTÓRICOS Y GRÁFICAS
// ===========================

const ECO_CONFIG = window.ECOVOLT_CONFIG || {};
const EP = ECO_CONFIG.ENDPOINTS || {};

// Mapeo entre data-key del front y nombre del sensor en backend
const SENSOR_MAP = {
  temperature: "temperature",
  power: "power",
  voltage: "voltage",
  battery: "battery",
  lastCharge: "lastChargeMinutes"
};

// ------ Utilidad para pedir histórico ------
async function fetchHistory(sensorKey, hours = 24) {
  const sensorName = SENSOR_MAP[sensorKey];
  if (!sensorName || !EP.HISTORY) return null;

  const url = `${EP.HISTORY}/${sensorName}?hours=${hours}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error en historial ${sensorName}`);
  const payload = await res.json(); // { sensor, data:[{t,v}], ... }
  return payload.data || [];
}

// ------ Dibujar sparkline simple en SVG ------
function renderSparkline(containerId, points) {
  const container = document.getElementById(containerId);
  if (!container || !points.length) return;

  container.innerHTML = ""; // limpiar

  const width = container.clientWidth || 220;
  const height = container.clientHeight || 60;
  const svgNS = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const values = points.map(p => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;

  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * width;
    const norm = (p.v - min) / (max - min || 1);
    const y = height - norm * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const poly = document.createElementNS(svgNS, "polyline");
  poly.setAttribute("points", pathPoints);
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "currentColor");
  poly.setAttribute("stroke-width", "2");

  svg.appendChild(poly);
  container.appendChild(svg);
}

// ------ Estadísticos básicos ------
function statsFromHistory(points) {
  if (!points.length) return null;
  const vals = points.map(p => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
  const last = vals[vals.length - 1];
  return { min, max, avg, last };
}

// ===========================
// Modal de detalle por sensor
// ===========================

// Asumimos que ya tienes un modal en HTML con estos IDs.
// Si tienen otros, solo cambia los ids aquí:
const modal = document.getElementById("sensorModal");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const modalCurrent = document.getElementById("modal-current");
const modalMin = document.getElementById("modal-min");
const modalMax = document.getElementById("modal-max");
const modalAvg = document.getElementById("modal-avg");
const modalChart = document.getElementById("modal-sparkline");

function openSensorModal(key, historyPoints) {
  if (!modal) return;
  const st = statsFromHistory(historyPoints);
  if (!st) return;

  // Títulos según sensor
  const titles = {
    temperature: "Temperatura",
    power: "Potencia",
    voltage: "Voltaje",
    battery: "Batería",
    lastCharge: "Última carga"
  };

  if (modalTitle) modalTitle.textContent = titles[key] || key;
  if (modalSubtitle) {
    modalSubtitle.textContent = "Comportamiento en las últimas 24 horas";
  }

  // Formatear unidades
  const formatters = {
    temperature: v => `${v.toFixed(1)} °C`,
    power: v => `${v.toFixed(2)} kW`,
    voltage: v => `${v.toFixed(1)} V`,
    battery: v => `${v.toFixed(1)} %`,
    lastCharge: v => `${v.toFixed(0)} min`
  };
  const fmt = formatters[key] || (v => v.toFixed(2));

  if (modalCurrent) modalCurrent.textContent = fmt(st.last);
  if (modalMin) modalMin.textContent = fmt(st.min);
  if (modalMax) modalMax.textContent = fmt(st.max);
  if (modalAvg) modalAvg.textContent = fmt(st.avg);

  // Gráfica principal dentro del modal
  if (modalChart) {
    modalChart.innerHTML = "";
    const backup = document.createElement("div");
    backup.id = "modal-sparkline-inner";
    backup.style.width = "100%";
    backup.style.height = "160px";
    modalChart.appendChild(backup);
    renderSparkline("modal-sparkline-inner", historyPoints);
  }

  modal.classList.add("is-open");
}

// Cerrar modal (asumiendo un botón con id close-sensor-modal)
const closeBtn = document.getElementById("close-sensor-modal");
if (closeBtn && modal) {
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("is-open");
  });
}

// ===========================
// Click en tarjetas para abrir modal + sparkline pequeño
// ===========================
document.querySelectorAll(".js-sensor-card").forEach(card => {
  card.addEventListener("click", async () => {
    const key = card.dataset.key;
    try {
      const history = await fetchHistory(key, 24);
      // sparkline pequeño
      const sparkId = {
        temperature: "sparkline-temp",
        power: "sparkline-power",
        voltage: "sparkline-voltage",
        battery: "sparkline-battery",
        lastCharge: "sparkline-charge"
      }[key];
      if (sparkId) renderSparkline(sparkId, history);

      // abrir modal con misma data
      openSensorModal(key, history);
    } catch (e) {
      console.error("Error al cargar historial para", key, e);
    }
  });
});

// ===========================
// 🔁 RETROCESO: Forzar carga de batería
// ===========================
window.aplicarRetrocesoCarga = async function aplicarRetrocesoCarga() {
  if (!EP.CONTROL) return;
  try {
    const res = await fetch(EP.CONTROL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "ecovolt_digital_twin", // o "smart_plug_01" / "esp32_station_01" si quieres
        action: "force_charge",
        value: 100 // forzar a 100 %
      })
    });

    const data = await res.json();
    console.log("Respuesta control:", data);

    // refrescar estado para que se vea el cambio en la tarjeta
    await cargarEstadoActual();
  } catch (err) {
    console.error("Error aplicando retroceso de carga:", err);
  }
};





