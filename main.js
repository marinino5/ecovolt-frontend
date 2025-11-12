// main.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js CARGADO");

  const config = window.ECOVOLT_CONFIG || {};
  const BACKEND_HTTP = config.BACKEND_HTTP;

  const dataPre = document.getElementById("data");
  const logPre  = document.getElementById("log");

  // Mensaje inicial para comprobar que el JS corre
  if (dataPre) {
    dataPre.textContent = "✅ JS funcionando, preparando solicitud al backend...";
  }

  // --- 1. Pintar datos en los slots IoT ---
  function renderSlots(payload) {
    if (!payload) return;

    const formatters = {
      temperature: (v) => `${v} °C`,
      power:       (v) => `${v} W`,
      voltage:     (v) => `${v} V`,
      battery:     (v) => `${v} %`,
      last:        (v) => v,
    };

    Object.keys(formatters).forEach((key) => {
      const slotBody = document.querySelector(
        `.slot[data-key="${key}"] .slot__body`
      );
      if (!slotBody) return;

      const raw = payload[key];
      if (raw === undefined || raw === null) {
        slotBody.textContent = "—";
        return;
      }

      const format = formatters[key];
      let value = raw;

      if (typeof raw === "number" && key !== "battery") {
        value = raw.toFixed(1);
      }

      slotBody.textContent = format ? format(value) : raw;
    });
  }

  // --- 2. Datos IoT simulados ---
  function fakeIoT() {
    const now = new Date();
    return {
      temperature: 23 + Math.random() * 3,   // 23–26 °C
      power:       300 + Math.random() * 20, // 300–320 W
      voltage:     220 + Math.random() * 4,  // ~220 V
      battery:     Math.round(40 + Math.random() * 60), // 40–100 %
      last:        now.toLocaleTimeString(),
    };
  }

  // --- 3. Llamar al backend /health ---
  async function loadLatestData() {
    if (!BACKEND_HTTP) {
      if (dataPre) dataPre.textContent = "❌ BACKEND_HTTP no está definido en config.js";
      return;
    }

    if (dataPre) {
      dataPre.textContent = "🔄 Llamando a " + BACKEND_HTTP + "/health ...";
    }

    try {
      const resp = await fetch(`${BACKEND_HTTP}/health`);

      let text;
      try {
        const json = await resp.json();
        text = JSON.stringify(json, null, 2);
      } catch {
        text = await resp.text();
      }

      if (dataPre) {
        dataPre.textContent = text || "Respuesta vacía del servidor";
      }

      // Si el backend responde OK, actualizamos los slots
      if (resp.ok) {
        const payload = fakeIoT();
        renderSlots(payload);
      } else if (logPre) {
        logPre.textContent = "Servidor respondió con código " + resp.status;
      }
    } catch (err) {
      console.error("Error en fetch /health:", err);
      if (dataPre) dataPre.textContent = "❌ Error al conectar: " + err.message;
      if (logPre)  logPre.textContent  = "No se pudo conectar al backend.";
    }
  }

  // Primera carga + refresco cada 15 segundos
  loadLatestData();
  setInterval(loadLatestData, 15000);
});
