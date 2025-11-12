// config.js

// Base del backend (SIN el /health al final)
const BACKEND_HTTP = "https://lanny-unintensified-guadalupe.ngrok-free.dev";

// De momento no usamos WebSocket, así que lo dejamos vacío
const BACKEND_WS = null;

window.ECOVOLT_CONFIG = {
  BACKEND_HTTP,
  BACKEND_WS,
};
