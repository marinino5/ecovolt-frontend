// Configuration official del frontend para Ecovolt
// URL del backend desplegado en Azure/Coolify
const BACKEND_HTTP = "http://iotunab.eastus2.cloudapp.azure.com:30081";

// Configuración global accesible en toda la app
window.ECOVOLT_CONFIG = {
    BACKEND_HTTP,
    // Endpoints oficiales del backend IoT
    ENDPOINTS: {
        STATE: `${BACKEND_HTTP}/api/state`,
        HISTORY: `${BACKEND_HTTP}/api/history`,
        DEVICES: `${BACKEND_HTTP}/api/devices`,
        CONTROL: `${BACKEND_HTTP}/api/control`,
        WEATHER: `${BACKEND_HTTP}/api/weather`
    },
    // WebSocket para datos en tiempo real
    WS_URL: "ws://iotunab.eastus2.cloudapp.azure.com:30081"
};
