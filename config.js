// Actualizar config.js del frontend
const BACKEND_HTTP = "https://lanny-unintensified-guadalupe.ngrok-free.dev";

window.ECOVOLT_CONFIG = {
    BACKEND_HTTP,
    // Nuevos endpoints
    ENDPOINTS: {
        STATE: `${BACKEND_HTTP}/api/state`,
        HISTORY: `${BACKEND_HTTP}/api/history`,
        DEVICES: `${BACKEND_HTTP}/api/devices`,
        CONTROL: `${BACKEND_HTTP}/api/control`,
        WEATHER: `${BACKEND_HTTP}/api/weather`
    },
    // WebSocket para tiempo real
    WS_URL: `wss://lanny-unintensified-guadalupe.ngrok-free.dev`
};
