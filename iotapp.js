// iotapp.js - VERSIÓN COMPLETA CORREGIDA
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
// 🔌 INTEGRACIÓN CON BACKEND IOT ECOVOLT - VERSIÓN CORREGIDA
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

// ✅ VALIDACIÓN ROBUSTA DE DATOS DE BATERÍA (NUEVO)
function validateBatteryData(data) {
  const validated = { ...data };
  
  // Validar lastChargeMinutes (NUNCA negativo)
  if (validated.lastChargeMinutes < 0) {
    console.warn('⚠️ Minutos negativos detectados:', validated.lastChargeMinutes, '-> corrigiendo a 0');
    validated.lastChargeMinutes = 0;
  }
  
  // Validar batería (0-100%)
  if (validated.battery < 0) {
    validated.battery = 0;
  } else if (validated.battery > 100) {
    validated.battery = 100;
  }
  
  // Limitar lastChargeMinutes a máximo 480 min (8 horas)
  if (validated.lastChargeMinutes > 480) {
    validated.lastChargeMinutes = 480;
  }
  
  return validated;
}

// ✅ FORMATEO INTELIGENTE DEL TIEMPO DE CARGA (NUEVO)
function formatLastChargeTime(minutes, batteryLevel) {
  // Si está cargando o la batería está llena, mostrar estado especial
  if (minutes < 5) {
    return batteryLevel >= 95 ? 'Completa' : 'Cargando...';
  }
  
  // Si son más de 60 minutos, mostrar en horas
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  // Menos de 60 minutos, mostrar solo minutos
  return `${Math.round(minutes)} min`;
}

// ✅ DETECTAR Y MOSTRAR TENDENCIA DE BATERÍA (NUEVO)
let lastBatteryLevel = null;

function updateBatteryTrend(currentBattery) {
  if (lastBatteryLevel === null) {
    lastBatteryLevel = currentBattery;
    return;
  }
  
  const trendElement = document.querySelector('.battery-trend');
  if (!trendElement) return;
  
  const difference = currentBattery - lastBatteryLevel;
  
  if (difference > 0.1) {
    // Batería subiendo
    trendElement.textContent = 'Tendencia: subiendo ↗';
    trendElement.style.color = '#22c55e';
  } else if (difference < -0.1) {
    // Batería bajando
    trendElement.textContent = 'Tendencia: bajando ↘';
    trendElement.style.color = '#ef4444';
  } else {
    // Batería estable
    trendElement.textContent = 'Tendencia: estable →';
    trendElement.style.color = '#6b7280';
  }
  
  lastBatteryLevel = currentBattery;
}

// 1️⃣ ESTADO ACTUAL (TODAS LAS TARJETAS NUMÉRICAS) - VERSIÓN CORREGIDA
async function cargarEstadoActual() {
  if (!ENDPOINTS.STATE) {
    console.log('🌐 Modo estático - Backend no configurado');
    // Mostrar modo simulación en la UI
    document.querySelectorAll('.ha-card__timestamp').forEach(ts => {
      ts.textContent = 'Modo simulación';
      ts.style.color = '#eab308';
    });
    return;
  }

  try {
    const res = await fetch(ENDPOINTS.STATE);
    if (!res.ok) throw new Error(`Backend respondió con error: ${res.status}`);

    const data = await res.json();
    
    // ✅ VALIDACIÓN CRÍTICA DE DATOS
    const validatedData = validateBatteryData(data);
    
    const tsText = formatTimestamp(validatedData.timestamp);

    // Temperatura
    updateCard("temperature", `${validatedData.temperature.toFixed(1)} °C`, tsText);

    // Potencia
    updateCard("power", `${validatedData.power.toFixed(2)} kW`, tsText);

    // Voltaje
    updateCard("voltage", `${validatedData.voltage.toFixed(1)} V`, tsText);

    // Batería
    updateCard("battery", `${validatedData.battery.toFixed(1)} %`, tsText);

    // ✅ ÚLTIMA CARGA CORREGIDA (sin negativos, con lógica inteligente)
    const chargeDisplay = formatLastChargeTime(validatedData.lastChargeMinutes, validatedData.battery);
    updateCard("lastCharge", chargeDisplay, tsText);

    // ✅ ACTUALIZAR TENDENCIA DE BATERÍA
    updateBatteryTrend(validatedData.battery);

    // Indicador de conexión exitosa
    document.querySelectorAll('.ha-card__timestamp').forEach(ts => {
      ts.textContent = 'En tiempo real';
      ts.style.color = '#22c55e';
    });

  } catch (err) {
    console.log('🌐 Backend no disponible - Modo simulación activado:', err.message);
    
    // NO usar alert - en su lugar mostrar estado en UI
    document.querySelectorAll('.ha-card__timestamp').forEach(ts => {
      ts.textContent = 'Modo simulación';
      ts.style.color = '#eab308';
    });
  }
}

// 2️⃣ INICIALIZAR CUANDO CARGUE EL DOM
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
  if (!sensorName || !EP.HISTORY) {
    console.log('📊 Modo simulación - Generando datos históricos ficticios');
    // Generar datos de ejemplo para modo simulación
    return generateMockHistory(sensorKey, hours);
  }

  try {
    const url = `${EP.HISTORY}/${sensorName}?hours=${hours}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error en historial ${sensorName}`);
    const payload = await res.json(); // { sensor, data:[{t,v}], ... }
    return payload.data || [];
  } catch (error) {
    console.log('📊 Usando datos simulados para histórico:', error.message);
    return generateMockHistory(sensorKey, hours);
  }
}

// Generar datos históricos de ejemplo
function generateMockHistory(sensorKey, hours = 24) {
  const baseValues = {
    temperature: 24.5,
    power: 1.47,
    voltage: 220,
    battery: 77,
    lastCharge: 41
  };
  
  const points = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 20; // 20 puntos en el rango de tiempo
  
  for (let i = 0; i < 20; i++) {
    const timestamp = now - (hours * 60 * 60 * 1000) + (i * interval);
    const baseValue = baseValues[sensorKey] || 50;
    const variation = (Math.random() - 0.5) * 10;
    const value = Math.max(0, baseValue + variation);
    
    points.push({
      t: timestamp,
      v: parseFloat(value.toFixed(1))
    });
  }
  
  return points;
}

// ------ Dibujar sparkline simple en SVG ------
function renderSparkline(containerId, points) {
  const container = document.getElementById(containerId);
  if (!container || !points || points.length === 0) {
    if (container) {
      container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 12px;">Sin datos</div>';
    }
    return;
  }

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
  if (!points || points.length === 0) return null;
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
const modal = document.getElementById("ha-modal");
const modalTitle = document.getElementById("ha-modal-title");
const modalSubtitle = document.getElementById("ha-modal-subtitle");
const modalCurrent = document.getElementById("ha-modal-current");
const modalMin = document.getElementById("ha-modal-min");
const modalMax = document.getElementById("ha-modal-max");
const modalAvg = document.getElementById("ha-modal-avg");
const modalChart = document.getElementById("ha-modal-chart");

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

  const descriptions = {
    temperature: "Temperatura ambiente de la estación",
    power: "Potencia consumida por la estación",
    voltage: "Voltaje del sistema de carga", 
    battery: "Nivel de batería disponible",
    lastCharge: "Tiempo desde la última carga completa"
  };

  if (modalTitle) modalTitle.textContent = titles[key] || key;
  if (modalSubtitle) {
    modalSubtitle.textContent = descriptions[key] || "Datos del sensor";
  }

  // Formatear unidades
  const formatters = {
    temperature: v => `${v.toFixed(1)} °C`,
    power: v => `${v.toFixed(2)} kW`,
    voltage: v => `${v.toFixed(1)} V`,
    battery: v => `${v.toFixed(1)} %`,
    lastCharge: v => {
      if (v < 5) return 'Cargando...';
      if (v >= 60) {
        const hours = Math.floor(v / 60);
        const mins = v % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${Math.round(v)} min`;
    }
  };
  const fmt = formatters[key] || (v => v.toFixed(2));

  if (modalCurrent) modalCurrent.textContent = fmt(st.last);
  if (modalMin) modalMin.textContent = fmt(st.min);
  if (modalMax) modalMax.textContent = fmt(st.max);
  if (modalAvg) modalAvg.textContent = fmt(st.avg);

  // Gráfica principal dentro del modal
  if (modalChart && historyPoints.length > 0) {
    renderModalChart(modalChart, historyPoints, key);
  }

  modal.classList.remove("is-hidden");
}

// Renderizar gráfica del modal mejorada
function renderModalChart(container, data, sensorKey) {
  if (!container || !data || data.length < 2) {
    container.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">No hay datos suficientes para mostrar</div>';
    return;
  }
  
  const width = 400;
  const height = 200;
  const min = Math.min(...data.map(p => p.v));
  const max = Math.max(...data.map(p => p.v));
  const range = Math.max(1, max - min);
  
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const colors = {
    temperature: '#ef4444',
    power: '#8b5cf6', 
    voltage: '#eab308',
    battery: '#22c55e',
    lastCharge: '#3b82f6'
  };
  
  const color = colors[sensorKey] || '#3b82f6';
  
  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:200px;">
      <defs>
        <linearGradient id="modal-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      
      <path d="M0,${height} L${points.replace(/ /g, ' L')} L${width},${height} Z" fill="url(#modal-grad)"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      
      ${data.map((point, index) => {
        if (index % 4 === 0 || index === data.length - 1) {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((point.v - min) / range) * height;
          return `
            <circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#ffffff" stroke-width="2"/>
            <text x="${x}" y="${y - 12}" font-size="10" font-weight="600" fill="${color}" text-anchor="middle">
              ${point.v.toFixed(1)}
            </text>
          `;
        }
        return '';
      }).join('')}
    </svg>
  `;
}

// Cerrar modal
function closeSensorModal() {
  const modal = document.getElementById("ha-modal");
  if (modal) {
    modal.classList.add("is-hidden");
  }
}

// Configurar cierre del modal
const closeBtn = document.getElementById("ha-modal-close");
if (closeBtn) {
  closeBtn.addEventListener("click", closeSensorModal);
}

if (modal) {
  modal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeSensorModal();
    }
  });
}

// Cerrar con ESC
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeSensorModal();
  }
});

// ===========================
// Click en tarjetas para abrir modal + sparkline pequeño
// ===========================
document.querySelectorAll(".js-sensor-card").forEach(card => {
  card.addEventListener("click", async (e) => {
    // ⛔ EVITAR que los clicks en botones abran el modal
    if (e.target.closest('.ha-card__actions') || e.target.classList.contains('ha-btn')) {
      return; // No hacer nada si el click viene de un botón
    }
    
    const key = card.dataset.key;
    try {
      const history = await fetchHistory(key, 24);
      
      // sparkline pequeño en la tarjeta
      const sparkId = `sparkline-${key}`;
      if (sparkId) renderSparkline(sparkId, history);

      // abrir modal con misma data
      openSensorModal(key, history);
    } catch (e) {
      console.log("Error al cargar historial para", key, e);
    }
  });
});

// ===========================
// 🔁 RETROCESO: Forzar carga de batería MEJORADO Y CORREGIDO
// ===========================
window.aplicarRetrocesoCarga = async function aplicarRetrocesoCarga() {
  console.log('⚡ Iniciando carga forzada...');
  
  if (!EP.CONTROL) {
    console.log('🔋 Carga forzada simulada');
    
    // Efecto visual mejorado
    const batteryCard = document.querySelector('[data-key="battery"]');
    const batteryValue = document.querySelector('[data-key="battery"] .ha-card__value');
    const lastChargeCard = document.querySelector('[data-key="lastCharge"] .ha-card__value');
    
    if (batteryCard && batteryValue && lastChargeCard) {
      // Animación de carga
      batteryCard.style.transition = 'all 0.5s ease';
      batteryCard.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
      batteryCard.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';
      
      // Cambiar valor a 100%
      batteryValue.textContent = '100 %';
      batteryValue.style.color = '#16a34a';
      batteryValue.style.fontWeight = 'bold';
      
      // ✅ RESETEAR LAST CHARGE A "CARGANDO..."
      lastChargeCard.textContent = 'Cargando...';
      lastChargeCard.style.color = '#16a34a';
      
      // ✅ ACTUALIZAR TENDENCIA
      const trendElement = document.querySelector('.battery-trend');
      if (trendElement) {
        trendElement.textContent = 'Tendencia: subiendo ↗';
        trendElement.style.color = '#22c55e';
      }
      
      // Restaurar después de 3 segundos
      setTimeout(() => {
        batteryCard.style.background = '';
        batteryCard.style.boxShadow = '';
        batteryValue.style.color = '';
        batteryValue.style.fontWeight = '';
        lastChargeCard.style.color = '';
        console.log('✅ Carga simulada completada');
      }, 3000);
    }
    return;
  }

  try {
    console.log('🔄 Enviando comando de carga al backend...');
    
    const res = await fetch(EP.CONTROL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "ecovolt_digital_twin",
        action: "force_charge",
        value: 100
      })
    });

    const data = await res.json();
    console.log("✅ Respuesta del backend:", data);

    if (data.ok) {
      // Efecto visual de éxito
      const batteryValue = document.querySelector('[data-key="battery"] .ha-card__value');
      const batteryCard = document.querySelector('[data-key="battery"]');
      const lastChargeCard = document.querySelector('[data-key="lastCharge"] .ha-card__value');
      const trendElement = document.querySelector('.battery-trend');
      
      if (batteryValue && batteryCard && lastChargeCard) {
        batteryValue.textContent = '100 %';
        batteryValue.style.color = '#16a34a';
        batteryValue.style.fontWeight = 'bold';
        
        // ✅ RESETEAR LAST CHARGE
        lastChargeCard.textContent = 'Cargando...';
        lastChargeCard.style.color = '#16a34a';
        
        // ✅ ACTUALIZAR TENDENCIA
        if (trendElement) {
          trendElement.textContent = 'Tendencia: subiendo ↗';
          trendElement.style.color = '#22c55e';
        }
        
        batteryCard.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
        batteryCard.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';
        
        setTimeout(() => {
          batteryValue.style.color = '';
          batteryValue.style.fontWeight = '';
          batteryCard.style.background = '';
          batteryCard.style.boxShadow = '';
          lastChargeCard.style.color = '';
        }, 3000);
      }
      
      // Refrescar datos después de 2 segundos
      setTimeout(() => {
        cargarEstadoActual();
      }, 2000);
      
    } else {
      console.log('❌ El backend reportó error:', data.message);
      // Efecto visual de error
      const batteryCard = document.querySelector('[data-key="battery"]');
      if (batteryCard) {
        batteryCard.style.background = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
        setTimeout(() => {
          batteryCard.style.background = '';
        }, 2000);
      }
    }

  } catch (err) {
    console.log("❌ Error de conexión:", err.message);
    
    // Efecto visual de error de conexión
    const batteryCard = document.querySelector('[data-key="battery"]');
    if (batteryCard) {
      batteryCard.style.background = 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)';
      setTimeout(() => {
        batteryCard.style.background = '';
      }, 2000);
    }
  }
};

// ===========================
// ✅ INICIALIZACIÓN DE TENDENCIA AL CARGAR
// ===========================
document.addEventListener("DOMContentLoaded", function() {
  // Asegurarse de que exista el elemento de tendencia
  const lastChargeCard = document.querySelector('[data-key="lastCharge"] .ha-card__header');
  if (lastChargeCard && !document.querySelector('.battery-trend')) {
    const trendElement = document.createElement('span');
    trendElement.className = 'battery-trend';
    trendElement.style.cssText = 'font-size: 12px; color: #6b7280; margin-left: 8px;';
    trendElement.textContent = 'Tendencia: estable →';
    lastChargeCard.appendChild(trendElement);
  }
});
