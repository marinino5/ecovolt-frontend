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
        }
        
    } catch (error) {
        console.error('Error cargando estado actual:', error);
        if (elLastLog) {
            elLastLog.textContent = 'Error conectando al backend';
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
            elWsLog.style.color = '#10b981';
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
            top: 10px;
            right: 10px;
            background: #10b981;
            color: white;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 12px;
            z-index: 1000;
            font-weight: 500;
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = '🟢 Datos en tiempo real';
    indicator.style.background = '#10b981';
    
    // Resetear después de 5 segundos
    clearTimeout(window.indicatorTimeout);
    window.indicatorTimeout = setTimeout(() => {
        indicator.textContent = '⚪ Datos en cache';
        indicator.style.background = '#6b7280';
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
    const height = 40; // Más alto para valores
    const padding = 5;

    const values = points.map(p => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    // Línea principal
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
    path.setAttribute("stroke", "#3b82f6");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    // Puntos y valores (mostrar cada 3 puntos para no saturar)
    points.forEach((point, index) => {
        if (index % 3 === 0 || index === points.length - 1) {
            const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
            const ratio = (point.v - min) / (max - min);
            const y = height - padding - ratio * (height - padding * 2);

            // Punto
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", "2");
            circle.setAttribute("fill", "#ef4444");
            svg.appendChild(circle);

            // Valor numérico
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y - 6);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "8");
            text.setAttribute("fill", "#374151");
            text.textContent = point.v.toFixed(1);
            svg.appendChild(text);
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
        table = document.createElement('table');
        table.id = 'historical-data-table';
        table.className = 'historical-table';
        table.innerHTML = `
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
        `;
        container.appendChild(table);
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
            <td>${sensor}</td>
            <td>${last.toFixed(1)}</td>
            <td>${min.toFixed(1)}</td>
            <td>${max.toFixed(1)}</td>
            <td>${avg.toFixed(1)}</td>
            <td>${data.length}</td>
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
            alert('✅ Carga forzada aplicada correctamente');
            // Recargar datos actuales
            await cargarEstadoActual();
        } else {
            alert('❌ Error: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error aplicando retroceso:', error);
        alert('❌ Error de conexión');
    }
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
    
    // Conectar WebSocket
    conectarWebSocket();
    
    // Actualizar cada 30 segundos (fallback)
    setInterval(cargarEstadoActual, 30000);
    
    // Actualizar historial cada minuto
    setInterval(() => {
        sensores.forEach(sensor => cargarHistorial(sensor));
    }, 60000);
    
    console.log('✅ Panel IoT inicializado con datos reales');
}

// =====================================================
// ARRANQUE DE LA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    inicializarPanel();
});

