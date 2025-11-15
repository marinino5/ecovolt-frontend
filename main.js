// =====================================================
// main.js – Panel IoT Ecovolt (VERSIÓN CON DATOS REALES)
// - Conexión a backend real
// - WebSocket para tiempo real
// - Gráficas con valores numéricos
// =====================================================

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// =====================================================
// CONEXIÓN A BACKEND REAL
// =====================================================

// Estado actual desde backend
let currentState = {
    temperature: 0,
    power: 0,
    voltage: 0,
    battery: 0,
    lastChargeMinutes: 0,
    timestamp: new Date().toISOString()
};

// Historial desde backend
let historyData = {
    temperature: [],
    power: [],
    voltage: [],
    battery: [],
    lastChargeMinutes: []
};

// =====================================================
// FUNCIONES PRINCIPALES CON DATOS REALES
// =====================================================

// Cargar estado actual desde backend
async function cargarEstadoActual() {
    if (!ENDPOINTS.STATE) {
        console.error('ENDPOINTS.STATE no configurado');
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
    }
}

// Cargar historial desde backend
async function cargarHistorial(sensor, hours = 24) {
    if (!ENDPOINTS.HISTORY) return;
    
    try {
        const response = await fetch(`${ENDPOINTS.HISTORY}/${sensor}?hours=${hours}`);
        if (!response.ok) throw new Error(`Error cargando historial de ${sensor}`);
        
        const data = await response.json();
        historyData[sensor] = data.data || [];
        
        // Actualizar el HTML con los datos reales
        if (window.updateSensorData) {
            window.updateSensorData(sensor, data.data || []);
        }
        
        console.log(`✅ Historial de ${sensor} cargado:`, data.data?.length || 0, 'puntos');
        
    } catch (error) {
        console.error(`Error cargando historial de ${sensor}:`, error);
    }
}

// =====================================================
// ACTUALIZACIÓN DE UI CON DATOS REALES
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
    if (cards.temperature && currentState.temperature) {
        cards.temperature.textContent = `${currentState.temperature.toFixed(1)} °C`;
    }
    if (cards.power && currentState.power) {
        cards.power.textContent = `${currentState.power.toFixed(2)} kW`;
    }
    if (cards.voltage && currentState.voltage) {
        cards.voltage.textContent = `${currentState.voltage.toFixed(1)} V`;
    }
    if (cards.battery && currentState.battery) {
        cards.battery.textContent = `${currentState.battery.toFixed(1)} %`;
    }
    if (cards.lastCharge && currentState.lastChargeMinutes) {
        cards.lastCharge.textContent = `${currentState.lastChargeMinutes} min`;
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
        
        // Reconectar después de 3 segundos
        setTimeout(conectarWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
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
    
    // Resetear después de 5 segundos
    clearTimeout(window.indicatorTimeout);
    window.indicatorTimeout = setTimeout(() => {
        indicator.textContent = '⚪ Datos en cache';
        indicator.style.background = '#6b7280';
    }, 5000);
}

// =====================================================
// TABLA DE DATOS HISTÓRICOS
// =====================================================

function crearTablaHistorica() {
    const container = document.getElementById('historical-data-container');
    if (!container) return;

    // Crear tabla si no existe
    let table = document.getElementById('historical-data-table');
    if (!table) {
        container.innerHTML = `
            <div style="background: var(--card); padding: 24px; border-radius: 16px; border: 1px solid var(--stroke);">
                <h3 style="margin: 0 0 20px 0; color: var(--text); font-size: 1.3rem; font-weight: 700;">
                    📊 Datos Históricos - Últimas 24 horas
                </h3>
                <table id="historical-data-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden;">
                    <thead>
                        <tr>
                            <th style="background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Sensor</th>
                            <th style="background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Último Valor</th>
                            <th style="background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Mínimo</th>
                            <th style="background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Máximo</th>
                            <th style="background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Promedio</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        table = document.getElementById('historical-data-table');
    }

    // Actualizar datos
    const tbody = table.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '';

        Object.keys(historyData).forEach(sensor => {
            const data = historyData[sensor];
            if (data.length === 0) return;

            const values = data.map(p => p.v);
            const last = values[values.length - 1];
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e5e7eb';
            row.innerHTML = `
                <td style="padding: 12px 16px; font-weight: 600; color: var(--text);">${sensor}</td>
                <td style="padding: 12px 16px; color: #22c55e; font-weight: 700;">${last.toFixed(1)}</td>
                <td style="padding: 12px 16px;">${min.toFixed(1)}</td>
                <td style="padding: 12px 16px;">${max.toFixed(1)}</td>
                <td style="padding: 12px 16px;">${avg.toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// =====================================================
// CONTROL DE RETROCESO (ACTUALIZADO)
// =====================================================

window.aplicarRetrocesoCarga = async function() {
    if (!ENDPOINTS.CONTROL) {
        alert('Endpoint de control no configurado');
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
            mostrarNotificacion('✅ Carga forzada aplicada correctamente', 'success');
            // Recargar datos actuales
            await cargarEstadoActual();
        } else {
            mostrarNotificacion('❌ Error: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error aplicando retroceso:', error);
        mostrarNotificacion('❌ Error de conexión con el backend', 'error');
    }
};

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
    console.log('🚀 Inicializando panel IoT con datos reales...');
    
    // Agregar estilos para animaciones
    const style = document.createElement('style');
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
    
    // Cargar datos iniciales
    await cargarEstadoActual();
    
    // Cargar historial de todos los sensores
    const sensores = ['temperature', 'power', 'voltage', 'battery', 'lastChargeMinutes'];
    await Promise.all(sensores.map(sensor => cargarHistorial(sensor)));
    
    // Crear tabla histórica después de cargar datos
    setTimeout(crearTablaHistorica, 1000);
    
    // Conectar WebSocket
    conectarWebSocket();
    
    // Actualizar cada 30 segundos (fallback)
    setInterval(cargarEstadoActual, 30000);
    
    // Actualizar historial cada minuto
    setInterval(() => {
        sensores.forEach(sensor => cargarHistorial(sensor));
        setTimeout(crearTablaHistorica, 1000);
    }, 60000);
    
    console.log('✅ Panel IoT inicializado con datos reales');
}

// =====================================================
// ARRANQUE DE LA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    inicializarPanel();
});
