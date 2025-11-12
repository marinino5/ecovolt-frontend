// main.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js CARGADO");

  const config = window.ECOVOLT_CONFIG || {};
  const BACKEND_HTTP = config.BACKEND_HTTP;

  const dataPre = document.getElementById("data");
  const logPre  = document.getElementById("log");

  // 0. Comprobación visual inmediata
  if (dataPre) {
    dataPre.textContent = "✅ JS funcionando, preparando solicitud al backend...";
  }

  // --- 1. Función para pintar datos en los slots ---
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

  // --- 2. Datos IoT simulados (para que el panel se vea vivo) ---
  function fakeIoT() {
    const now = new Date();
    return {
      temperature: 23 + Math.random() * 3,
      power:       300 + Math.random() * 20,
      voltage:     2
