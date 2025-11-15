// main.js - Versión sin alerts molestos
console.log('🚀 main.js cargado - Panel IoT EcoVolt');

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// Función para cargar datos del backend
async function cargarDatosBackend() {
    if (!ENDPOINTS.STATE) {
        console.log('🌐 Modo estático - Backend no configurado');
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.STATE);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Datos del backend:', data);
            
            // Actualizar la UI con datos reales
            actualizarUIconDatosReales(data);
        } else {
            console.log('⚠️ Backend respondió con error:', response.status);
        }
    } catch (error) {
        console.log('🌐 Backend no disponible - Modo simulación:', error.message);
    }
}

function actualizarUIconDatosReales(data) {
    // Actualizar valores en las tarjetas
    const elementos = {
        temperature: document.querySelector('[data-key="temperature"] .ha-card__value'),
        power: document.querySelector('[data-key="power"] .ha-card__value'),
        voltage: document.querySelector('[data-key="voltage"] .ha-card__value'),
        battery: document.querySelector('[data-key="battery"] .ha-card__value'),
        lastCharge: document.querySelector('[data-key="lastCharge"] .ha-card__value')
    };

    if (elementos.temperature && data.temperature) {
        elementos.temperature.textContent = `${data.temperature.toFixed(1)} °C`;
    }
    if (elementos.power && data.power) {
        elementos.power.textContent = `${data.power.toFixed(2)} kW`;
    }
    if (elementos.voltage && data.voltage) {
        elementos.voltage.textContent = `${data.voltage.toFixed(1)} V`;
    }
    if (elementos.battery && data.battery) {
        elementos.battery.textContent = `${data.battery.toFixed(1)} %`;
    }
    if (elementos.lastCharge && data.lastChargeMinutes) {
        elementos.lastCharge.textContent = `${data.lastChargeMinutes} min`;
    }

    // Actualizar timestamps
    document.querySelectorAll('.ha-card__timestamp').forEach(ts => {
        ts.textContent = 'En tiempo real';
        ts.style.color = '#22c55e';
    });
}

// Sobrescribir la función de carga forzada
window.aplicarRetrocesoCarga = async function() {
    if (!ENDPOINTS.CONTROL) {
        console.log('⚡ Carga forzada simulada - Backend no configurado');
        // Efecto visual en lugar de alert
        const batteryCard = document.querySelector('[data-key="battery"]');
        if (batteryCard) {
            batteryCard.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                batteryCard.style.animation = '';
            }, 500);
        }
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
        console.log(result.ok ? '✅ Carga forzada exitosa' : '❌ Error en carga forzada');
        
        // Efecto visual en lugar de alert
        const batteryValue = document.querySelector('[data-key="battery"] .ha-card__value');
        if (batteryValue && result.ok) {
            batteryValue.textContent = '100 %';
            batteryValue.style.color = '#22c55e';
            setTimeout(() => {
                batteryValue.style.color = '';
            }, 2000);
        }
        
    } catch (error) {
        console.log('❌ Error de conexión con el backend:', error.message);
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Panel IoT inicializado');
    cargarDatosBackend();
    
    // Intentar cargar datos cada 10 segundos
    setInterval(cargarDatosBackend, 10000);
});
