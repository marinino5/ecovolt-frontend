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
// ========== INTEGRACIÓN CON BACKEND IOT ECOVOLT ==========

// Tomar los endpoints desde config.js
const { ENDPOINTS } = window.ECOVOLT_CONFIG || {};

// 1. Cargar estado actual (tarjetas principales)
async function cargarEstadoActual() {
  if (!ENDPOINTS?.STATE) return;

  try {
    const res = await fetch(ENDPOINTS.STATE);
    if (!res.ok) throw new Error("Error al obtener estado");
    const data = await res.json();

    // Ejemplo de estructura del backend:
    // { temperature, power, voltage, battery, lastChargeMinutes, timestamp }

    // Construimos el HTML para cada "slot" usando la llave data-key
    const cards = {
      temperature: `
        <p class="slot__label">Temperatura ambiente</p>
        <p class="slot__value">${data.temperature.toFixed(1)} °C</p>
        <p class="slot__meta">Actualizado: ${new Date(data.timestamp).toLocaleTimeString()}</p>
      `,
      power: `
        <p class="slot__label">Consumo energético</p>
        <p class="slot__value">${data.power.toFixed(2)} kW</p>
        <p class="slot__meta">Voltaje: ${data.voltage.toFixed(1)} V</p>
      `,
      battery: `
        <p class="slot__label">Nivel de batería</p>
        <p class="slot__value">${data.battery.toFixed(1)} %</p>
        <p class="slot__meta">Minutos desde última carga: ${data.lastChargeMinutes}</p>
      `
      // Si tienes más slots (ej. "general", "status", etc.) puedes agregarlos aquí.
    };

    // Usamos el helper que ya creaste para inyectar el HTML en las tarjetas
    if (window.ECOVOLT_PANEL_MOUNT) {
      window.ECOVOLT_PANEL_MOUNT(cards);
    }

  } catch (err) {
    console.error("Error cargando estado actual:", err);
  }
}

// 2. Cargar clima real
async function cargarClima() {
  if (!ENDPOINTS?.WEATHER) return;

  try {
    const res = await fetch(ENDPOINTS.WEATHER);
    if (!res.ok) throw new Error("Error al obtener clima");
    const w = await res.json();

    // Esperado del backend:
    // { temperature, humidity, pressure, description, windSpeed, ... }

    const html = `
      <p class="slot__label">Clima en tiempo real</p>
      <p class="slot__value">${w.temperature.toFixed(1)} °C</p>
      <p class="slot__meta">${w.description || "Condiciones actuales"}</p>
      <p class="slot__meta">Humedad: ${w.humidity?.toFixed ? w.humidity.toFixed(0) : w.humidity}%</p>
    `;

    const cell = document.querySelector('.slot[data-key="weather"] .slot__body');
    if (cell) cell.innerHTML = html;

  } catch (err) {
    console.error("Error cargando clima:", err);
  }
}

// 3. Cargar lista de dispositivos IoT
async function cargarDispositivos() {
  if (!ENDPOINTS?.DEVICES) return;

  try {
    const res = await fetch(ENDPOINTS.DEVICES);
    if (!res.ok) throw new Error("Error al obtener dispositivos");
    const payload = await res.json();

    const list = Object.values(payload.devices || {});
    const cell = document.querySelector('.slot[data-key="devices"] .slot__body');
    if (!cell) return;

    cell.innerHTML = `
      <p class="slot__label">Fuentes IoT conectadas</p>
      <ul class="device-list">
        ${list.map(d => `
          <li class="device-list__item">
            <strong>${d.id}</strong><br>
            <span>${d.description}</span><br>
            <span>Protocolo: ${d.protocol}</span>
          </li>
        `).join('')}
      </ul>
    `;
  } catch (err) {
    console.error("Error cargando dispositivos:", err);
  }
}

// 4. Inicialización: llamar todo cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
  cargarEstadoActual();
  cargarClima();
  cargarDispositivos();

  // Refrescar estado y clima cada 5 segundos
  setInterval(cargarEstadoActual, 5000);
  setInterval(cargarClima, 60000); // clima cada 1 minuto
});


