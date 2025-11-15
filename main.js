// =====================================================
// main.js – Panel IoT Ecovolt (VERSIÓN CORREGIDA)
// - Conexión completa con gráficas y modal
// =====================================================

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// Estado actual desde backend
let currentState = {
    temperature: 24.5,
    power: 1.47,
    voltage: 220,
    battery: 77,
    lastChargeMinutes: 41,
    timestamp: new Date().toISOString()
};

// Historial desde backend (inicial con datos de ejemplo)
let historyData = {
    temperature: Array.from({length: 24}, (_, i) => ({t: Date.now() - (24-i)*600000, v: 24.5 + Math.random() * 2})),
    power: Array.from({length: 24}, (_, i) => ({t: Date.now() - (24-i)*600000, v: 1.47 + Math.random() * 0.3})),
    voltage: Array.from({length: 24}, (_, i) => ({t: Date.now() - (24-i)*600000, v: 220 + Math.random() * 5})),
    battery: Array.from({length: 24}, (_, i) => ({t: Date.now() - (24-i)*600000, v: 77 + Math.random() * 10})),
    lastChargeMinutes: Array.from({length: 24}, (_, i) => ({t: Date.now() - (24-i)*600000, v: 41 + Math.random() * 20}))
};

// =====================================================
// FUNCIONES PRINCIPALES CON DATOS REALES
// =====================================================

async function cargarEstadoActual() {
    if (!ENDPOINTS.STATE) {
        console.error('ENDPOINTS.STATE no configurado');
        // Usar datos de ejemplo como fallback
        actualizarUI();
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.STATE);
        if (!response.ok) throw new Error('Error cargando estado');
        
        const data = await response.json();
        currentState = data;
        
        // Actualizar UI inmediatamente
        actualizarUI();
        
        console.log('✅ Datos actuales cargados:', data);
        
    } catch (error) {
        console.error('Error cargando estado actual:', error);
        // Fallback a datos de ejemplo
        actualizarUI();
    }
}

async function cargarHistorial(sensor, hours = 24) {
    if (!ENDPOINTS.HISTORY) {
        // Usar datos de ejemplo como fallback
        if (window.updateSensorData) {
            window.updateSensorData(sensor, historyData[sensor] || []);
        }
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.HISTORY}/${sensor}?hours=${hours}`);
        if (!response.ok) throw new Error(`Error cargando historial de ${sensor}`);
        
        const data = await response.json();
        historyData[sensor] = data.data || [];
        
        // Actualizar el HTML con los datos reales
        if (window.updateSensorData) {
            window.updateSensorData(sensor, data.data || []);
        }
        
    } catch (error) {
        console.error(`Error cargando historial de ${sensor}:`, error);
        // Fallback a datos de ejemplo
        if (window.updateSensorData) {
            window.updateSensorData(sensor, historyData[sensor] || []);
        }
    }
}

// =====================================================
// ACTUALIZACIÓN DE UI
// =====================================================

function actualizarUI() {
    // Actualizar valores principales en las tarjetas
    const cards = {
        temperature: document.querySelector('.ha-card[data-key="temperature"] .ha-card__value'),
        power: document.querySelector('.ha-card[data-key="power"] .ha-card__value'),
        voltage: document.querySelector('.ha-card[data-key="voltage"] .ha-card__value'),
        battery: document.querySelector('.ha-card[data-key="battery"] .ha-card__value'),
        lastCharge: document.querySelector('.ha-card[data-key="lastCharge"] .ha-card__value')
    };

    // Actualizar timestamps
    const timestamps = document.querySelectorAll('.ha-card__timestamp');
    timestamps.forEach(ts => {
        ts.textContent = 'Actualizado ahora';
        ts.style.color = '#22c55e';
    });

    // Actualizar valores
    if (cards.temperature) {
        cards.temperature.textContent = `${currentState.temperature?.toFixed(1) || '24.5'} °C`;
    }
    if (cards.power) {
        cards.power.textContent = `${currentState.power?.toFixed(2) || '1.47'} kW`;
    }
    if (cards.voltage) {
        cards.voltage.textContent = `${currentState.voltage?.toFixed(1) || '220'} V`;
    }
    if (cards.battery) {
        cards.battery.textContent = `${currentState.battery?.toFixed(1) || '77'} %`;
    }
    if (cards.lastCharge) {
        cards.lastCharge.textContent = `${currentState.lastChargeMinutes || '41'} min`;
    }
}

// =====================================================
// WEBSOCKET PARA DATOS EN TIEMPO REAL
// =====================================================

function conectarWebSocket() {
    const wsUrl = ECOVOLT_CONFIG.WS_URL;
    if (!wsUrl) {
        console.warn('WebSocket URL no configurada');
        return;
    }

    try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('🔌 WebSocket conectado');
            mostrarIndicadorTiempoReal('Conectado', '#22c55e');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'sensor_update') {
                    // Actualizar estado actual
                    currentState = { ...currentState, ...data.data };
                    actualizarUI();
                    
                    // Mostrar indicador de datos reales
                    mostrarIndicadorTiempoReal('Datos en tiempo real', '#3b82f6');
                }
                
            } catch (error) {
                console.error('Error procesando WebSocket:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket desconectado');
            mostrarIndicadorTiempoReal('Desconectado', '#ef4444');
            
            // Reconectar después de 5 segundos
            setTimeout(conectarWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('Error creando WebSocket:', error);
    }
}

// Indicador visual de datos en tiempo real
function mostrarIndicadorTiempoReal(mensaje, color) {
    let indicator = document.getElementById('realtime-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'realtime-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = `🟢 ${mensaje}`;
    indicator.style.background = color;
    
    clearTimeout(window.indicatorTimeout);
    window.indicatorTimeout = setTimeout(() => {
        indicator.textContent = '⚪ Datos en cache';
        indicator.style.background = '#6b7280';
    }, 5000);
}

// =====================================================
// FUNCIONES GLOBALES PARA EL HTML
// =====================================================

// Función global para el botón de carga
window.aplicarRetrocesoCarga = async function() {
    if (!ENDPOINTS.CONTROL) {
        mostrarNotificacion('❌ Backend no configurado', 'error');
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.CONTROL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                deviceId: "ecovolt_digital_twin",
                action: "force_charge",
                value: 100
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            mostrarNotificacion('✅ Carga forzada aplicada', 'success');
            // Recargar datos
            await cargarEstadoActual();
        } else {
            mostrarNotificacion('❌ Error: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error aplicando retroceso:', error);
        mostrarNotificacion('❌ Error de conexión', 'error');
    }
};

// Función para obtener datos del sensor (usada por el modal)
window.getSensorData = function(sensorId) {
    return {
        history: historyData[sensorId] || [],
        current: currentState[sensorId] || 0,
        unit: getSensorUnit(sensorId)
    };
};

function getSensorUnit(sensorId) {
    const units = {
        temperature: '°C',
        power: 'kW',
        voltage: 'V',
        battery: '%',
        lastChargeMinutes: 'min'
    };
    return units[sensorId] || '';
}

// Notificación estilo Home Assistant
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: ${tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 1001;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        border: 2px solid #ffffff;
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

async function inicializarPanel() {
    console.log('🚀 Inicializando panel IoT...');
    
    // Agregar estilos para animaciones
    if (!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Cargar datos iniciales
    await cargarEstadoActual();
    
    // Cargar historial de todos los sensores
    const sensores = ['temperature', 'power', 'voltage', 'battery', 'lastChargeMinutes'];
    sensores.forEach(sensor => cargarHistorial(sensor));
    
    // Conectar WebSocket
    conectarWebSocket();
    
    // Actualizar periódicamente
    setInterval(cargarEstadoActual, 10000); // Cada 10 segundos
    
    console.log('✅ Panel IoT inicializado');
}

// =====================================================
// ARRANQUE
// =====================================================

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPanel);
} else {
    inicializarPanel();
}
