// main.js - Versión simplificada y funcional
console.log('🚀 main.js cargado - Panel IoT EcoVolt');

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// Función para cargar datos del backend
async function cargarDatosBackend() {
    if (!ENDPOINTS.STATE) {
        console.log('⚠️  Backend no configurado, usando datos locales');
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.STATE);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Datos del backend:', data);
            
            // Actualizar la UI con datos reales
            actualizarUIconDatosReales(data);
        }
    } catch (error) {
        console.log('❌ Error conectando al backend:', error);
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
        alert('🎯 Función de carga forzada activada (modo simulación)');
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
        alert(result.ok ? '✅ Carga forzada exitosa' : '❌ Error en carga forzada');
        
    } catch (error) {
        alert('❌ Error de conexión con el backend');
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Panel IoT inicializado');
    cargarDatosBackend();
    
    // Intentar cargar datos cada 10 segundos
    setInterval(cargarDatosBackend, 10000);
});
