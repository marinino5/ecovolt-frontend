// main.js

document.addEventListener("DOMContentLoaded", () => {
  const config = window.ECOVOLT_CONFIG || {};
  const BACKEND_HTTP = config.BACKEND_HTTP;

  const dataPre = document.getElementById("data"); // Últimos datos IoT
  const logPre  = document.getElementById("log");  // Tiempo real (solo texto por ahora)

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

  // --- 2. Crear datos simulados (hasta que tengas endpoints reales) ---
  function buildFakeIoTPayload() {
    const now = new Date();

    return {
      temperature: 24 + Math.random() * 2 - 1,
      power:       300 + Math.random() * 50 - 25,
      voltage:     220 + Math.random() * 5 - 2,
      battery:     Math.round(60 + Math.random() * 40),
      last:        now.toLocaleTimeString(),
    };
  }

  // --- 3.
