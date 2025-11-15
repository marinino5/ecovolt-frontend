// =====================================================
// main.js – Panel IoT Ecovolt (VERSIÓN CON DATOS REALES)
// - Conexión a backend real
// - WebSocket para tiempo real
// - Gráficas con valores numéricos
// =====================================================

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// ---- Elementos principales del panel ----
const elLastLog = document.querySelector('[data-iot="last-log"]');
const elWsLog   = document.querySelector('[data-iot="ws-log"]');

// Tarjetas métricas
const elTemp       = document.querySelector('[data-iot="temp"]');
const elPower      = document.querySelector('[data-iot="power"]');
const elVoltage    = document.querySelector('[data-iot="voltage"]');
const elBattery    = document.querySelector('[data-iot="battery"]');
const elLastCharge = document.querySelector('[data-iot="last-charge"]');

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
        
        // Actualizar UI
        actualizarUI();
        
        // Actualizar log
        if (elLastLog) {
            const time = new Date(data.timestamp).toLocaleTimeString();
            elLastLog.textContent = `Datos reales - Actualizado: ${time}`;
            elLastLog.style.color = '#22c55e';
        }
        
    } catch (error) {
        console.error('Error cargando estado actual:', error);
        if (elLastLog) {
            elLastLog.textContent = 'Error conectando al backend';
            elLastLog.style.color = '#ef4444';
        }
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
        
        // Actualizar sparklines
        actualizarSparklines();
        
    } catch (error) {
        console.error(`Error cargando historial de ${sensor}:`, error);
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
        if (elWsLog) {
            elWsLog.textContent = 'Conectado - Esperando datos en tiempo real...';
            elWsLog.style.color = '#22c55e';
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'sensor_update') {
                // Actualizar estado actual
                currentState = { ...currentState, ...data.data };
                actualizarUI();
                
                // Actualizar log WebSocket
                if (elWsLog) {
                    const time = new Date().toLocaleTimeString();
                    elWsLog.textContent = `[${time}] Datos en tiempo real recibidos`;
                    elWsLog.style.color = '#3b82f6';
                }
                
                // Mostrar indicador de datos reales
                mostrarIndicadorTiempoReal();
            }
            
        } catch (error) {
            console.error('Error procesando WebSocket:', error);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket desconectado');
        if (elWsLog) {
            elWsLog.textContent = 'Desconectado - Reconectando...';
            elWsLog.style.color = '#ef4444';
        }
        
        // Reconectar después de 3 segundos
        setTimeout(conectarWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Indicador visual de datos en tiempo real
function mostrarIndicadorTiempoReal() {
    let indicator = document.getElementById('realtime-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'realtime-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
            border: 2px solid #ffffff;
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = '🟢 Datos en tiempo real';
    indicator.style.background = '#22c55e';
    
    // Resetear después de 5 segundos
    clearTimeout(window.indicatorTimeout);
    window.indicatorTimeout = setTimeout(() => {
        indicator.textContent = '⚪ Datos en cache';
        indicator.style.background = '#6b7280';
        indicator.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
    }, 5000);
}

// =====================================================
// ACTUALIZACIÓN DE UI CON DATOS REALES
// =====================================================

function actualizarUI() {
    // Valores actuales desde backend real
    if (elTemp && currentState.temperature) {
        elTemp.textContent = `${currentState.temperature.toFixed(1)} °C`;
    }

    if (elPower && currentState.power) {
        elPower.textContent = `${currentState.power.toFixed(2)} kW`;
    }

    if (elVoltage && currentState.voltage) {
        elVoltage.textContent = `${currentState.voltage.toFixed(1)} V`;
    }

    if (elBattery && currentState.battery) {
        elBattery.textContent = `${currentState.battery.toFixed(1)} %`;
    }

    if (elLastCharge && currentState.lastChargeMinutes) {
        elLastCharge.textContent = `${currentState.lastChargeMinutes} min`;
    }
}

// =====================================================
// GRÁFICAS MEJORADAS CON VALORES NUMÉRICOS
// =====================================================

function actualizarSparklines() {
    // Actualizar todas las sparklines con datos reales
    Object.keys(historyData).forEach(sensor => {
        const data = historyData[sensor];
        if (data.length > 0) {
            renderEnhancedSparkline(sensor, data);
        }
    });
}

// Sparkline mejorada con valores numéricos
function renderEnhancedSparkline(sensorKey, points) {
    const container = document.querySelector(`.slot__sparkline--${sensorKey}`);
    if (!container) return;

    const width = 120;
    const height = 40;
    const padding = 5;

    const values = points.map(p => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    // Línea principal con gradiente
    let pathData = "";
    points.forEach((point, index) => {
        const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
        const ratio = (point.v - min) / (max - min);
        const y = height - padding - ratio * (height - padding * 2);
        
        if (index === 0) {
            pathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }
    });

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#sparklineGradient)");
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    // Definir gradiente
    const defs = document.createElementNS(svgNS, "defs");
    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.setAttribute("id", "sparklineGradient");
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "0%");
    
    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#22d3ee");
    
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#2dd4bf");
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Puntos y valores (mostrar cada 3 puntos)
    points.forEach((point, index) => {
        if (index % 3 === 0 || index === points.length - 1) {
            const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
            const ratio = (point.v - min) / (max - min);
            const y = height - padding - ratio * (height - padding * 2);

            // Punto
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", "2.5");
            circle.setAttribute("fill", "#ffffff");
            circle.setAttribute("stroke", "#ef4444");
            circle.setAttribute("stroke-width", "1.5");
            svg.appendChild(circle);

            // Valor numérico
            if (index === points.length - 1) { // Solo mostrar último valor
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", x);
                text.setAttribute("y", y - 8);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("font-size", "9");
                text.setAttribute("font-weight", "bold");
                text.setAttribute("fill", "#0f172a");
                text.textContent = point.v.toFixed(1);
                svg.appendChild(text);
            }
        }
    });

    container.innerHTML = "";
    container.appendChild(svg);
}

// =====================================================
// TABLA DE DATOS HISTÓRICOS
// =====================================================

function crearTablaHistorica() {
    const container = document.getElementById('historical-table-container');
    if (!container) return;

    // Crear tabla si no existe
    let table = document.getElementById('historical-data-table');
    if (!table) {
        const section = document.createElement('div');
        section.style.marginTop = '40px';
        section.style.padding = '20px';
        section.style.background = 'var(--card)';
        section.style.borderRadius = '16px';
        section.style.border = '1px solid var(--stroke)';
        
        section.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: var(--text); font-size: 1.3rem; font-weight: 700;">
                📊 Datos Históricos - Últimas 24 horas
            </h3>
            <table id="historical-data-table" class="historical-table">
                <thead>
                    <tr>
                        <th>Sensor</th>
                        <th>Último Valor</th>
                        <th>Mínimo</th>
                        <th>Máximo</th>
                        <th>Promedio</th>
                        <th>Total Datos</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        
        const panel = document.querySelector('.panel');
        panel.appendChild(section);
        table = document.getElementById('historical-data-table');
    }

    // Actualizar datos
    const tbody = table.querySelector('tbody');
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
        row.innerHTML = `
            <td style="font-weight: 600; color: var(--text);">${sensor}</td>
            <td style="color: #22c55e; font-weight: 700;">${last.toFixed(1)}</td>
            <td>${min.toFixed(1)}</td>
            <td>${max.toFixed(1)}</td>
            <td>${avg.toFixed(1)}</td>
            <td style="color: var(--muted);">${data.length}</td>
        `;
        tbody.appendChild(row);
    });
}

// =====================================================
// CONTROL DE RETROCESO (ACTUALIZADO)
// =====================================================

async function aplicarRetrocesoCarga() {
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
            // Mostrar notificación estilo Home Assistant
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

async function inicializarPanel() {
    console.log('🚀 Inicializando panel IoT con datos reales...');
    
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
        crearTablaHistorica();
    }, 60000);
    
    console.log('✅ Panel IoT inicializado con datos reales');
}

// =====================================================
// ARRANQUE DE LA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    inicializarPanel();
    
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
        .historical-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .historical-table th {
            background: #f8fafc;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        .historical-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
        }
        .historical-table tr:hover {
            background: #f9fafb;
        }
    `;
    document.head.appendChild(style);
});

