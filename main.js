// main.js - VERSIÓN CORREGIDA Y OPTIMIZADA (Complementa iotapp.js)
console.log('🚀 main.js cargado - Módulo de utilidades IoT EcoVolt');

const ECOVOLT_CONFIG = window.ECOVOLT_CONFIG || {};
const ENDPOINTS = ECOVOLT_CONFIG.ENDPOINTS || {};

// ===========================
// 🛠️ FUNCIONES DE UTILIDAD CORREGIDAS
// ===========================

// Función para verificar estado del backend
async function verificarEstadoBackend() {
    if (!ENDPOINTS.HEALTH && !ENDPOINTS.STATE) {
        console.log('🌐 Backend no configurado - Modo estático');
        return { status: 'offline', message: 'Backend no configurado' };
    }

    try {
        const endpoint = ENDPOINTS.HEALTH || ENDPOINTS.STATE;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            return { 
                status: 'online', 
                message: 'Backend operativo',
                data: data,
                timestamp: new Date().toISOString()
            };
        } else {
            return { 
                status: 'error', 
                message: `Backend respondió con error: ${response.status}` 
            };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return { 
                status: 'timeout', 
                message: 'Backend no responde (timeout)' 
            };
        }
        return { 
            status: 'offline', 
            message: `Backend no disponible: ${error.message}` 
        };
    }
}

// Función para obtener datos de dispositivos
async function obtenerDispositivos() {
    if (!ENDPOINTS.DEVICES) {
        console.log('📱 Endpoint de dispositivos no configurado');
        return null;
    }

    try {
        const response = await fetch(ENDPOINTS.DEVICES);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Dispositivos obtenidos:', data);
            return data;
        }
    } catch (error) {
        console.log('❌ Error obteniendo dispositivos:', error.message);
    }
    return null;
}

// Función para obtener datos climáticos
async function obtenerClima() {
    if (!ENDPOINTS.WEATHER) {
        console.log('🌤️ Endpoint de clima no configurado');
        return null;
    }

    try {
        const response = await fetch(ENDPOINTS.WEATHER);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Datos climáticos obtenidos');
            return data;
        }
    } catch (error) {
        console.log('❌ Error obteniendo clima:', error.message);
    }
    return null;
}

// ===========================
// 🎯 INICIALIZACIÓN Y CONFIGURACIÓN
// ===========================

// Configuración global mejorada
window.ECOVOLT_UTILS = {
    verificarEstadoBackend,
    obtenerDispositivos,
    obtenerClima,
    version: '2.0.0',
    ultimaActualizacion: new Date().toISOString()
};

// Indicador de estado de conexión en la UI
function crearIndicadorConexion() {
    const existingIndicator = document.getElementById('connection-indicator');
    if (existingIndicator) return existingIndicator;

    const indicator = document.createElement('div');
    indicator.id = 'connection-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #eab308;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        transition: all 0.3s ease;
    `;

    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        padding: 6px 10px;
        background: #1f2937;
        color: white;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        pointer-events: none;
    `;
    tooltip.textContent = 'Verificando conexión...';

    indicator.appendChild(tooltip);
    
    // Mostrar tooltip al hacer hover
    indicator.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
    });
    
    indicator.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(-10px)';
    });

    document.body.appendChild(indicator);
    return indicator;
}

// Actualizar indicador de conexión
async function actualizarIndicadorConexion() {
    const indicator = crearIndicadorConexion();
    const tooltip = indicator.querySelector('div');
    
    const estado = await verificarEstadoBackend();
    
    switch (estado.status) {
        case 'online':
            indicator.style.background = '#22c55e';
            tooltip.textContent = `✅ ${estado.message}`;
            break;
        case 'error':
            indicator.style.background = '#ef4444';
            tooltip.textContent = `❌ ${estado.message}`;
            break;
        case 'timeout':
            indicator.style.background = '#f59e0b';
            tooltip.textContent = '⏰ Backend no responde';
            break;
        case 'offline':
            indicator.style.background = '#6b7280';
            tooltip.textContent = '🌐 Modo simulación';
            break;
    }
    
    // Efecto de pulso al actualizar
    indicator.style.transform = 'scale(1.3)';
    setTimeout(() => {
        indicator.style.transform = 'scale(1)';
    }, 300);
}

// ===========================
// 📊 ANALÍTICAS Y MONITOREO
// ===========================

// Registrar eventos de uso
function registrarEvento(tipo, datos = {}) {
    const evento = {
        tipo,
        datos,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    console.log('📊 Evento registrado:', evento);
    
    // Enviar a analytics si está configurado
    if (ENDPOINTS.ANALYTICS) {
        fetch(ENDPOINTS.ANALYTICS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evento)
        }).catch(err => console.log('❌ Error enviando analytics:', err));
    }
}

// Monitorear rendimiento
function monitorearRendimiento() {
    if ('performance' in window) {
        const perfData = performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        
        console.log(`⚡ Tiempo de carga: ${loadTime}ms`);
        
        if (loadTime > 3000) {
            console.warn('⚠️ Tiempo de carga lento');
        }
    }
}

// ===========================
// 🔧 MANEJO DE ERRORES MEJORADO
// ===========================

// Manejo global de errores
window.addEventListener('error', function(event) {
    console.error('🚨 Error global capturado:', event.error);
    registrarEvento('error_global', {
        mensaje: event.error?.message,
        archivo: event.filename,
        linea: event.lineno,
        columna: event.colno
    });
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Promesa rechazada no manejada:', event.reason);
    registrarEvento('promesa_rechazada', {
        razon: event.reason?.message || event.reason
    });
});

// ===========================
// 🎪 ANIMACIONES Y MEJORAS UX
// ===========================

// Efecto de carga sutil en tarjetas
function agregarEfectosTarjetas() {
    const tarjetas = document.querySelectorAll('.ha-card, .slot');
    
    tarjetas.forEach(tarjeta => {
        // Efecto al hacer hover
        tarjeta.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'all 0.2s ease';
        });
        
        tarjeta.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
        
        // Efecto al actualizar datos
        tarjeta.actualizarConAnimacion = function() {
            this.style.boxShadow = '0 0 0 2px #3b82f6';
            setTimeout(() => {
                this.style.boxShadow = '';
            }, 500);
        };
    });
}

// Notificación toast sutil
function mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    const colores = {
        info: '#3b82f6',
        exito: '#22c55e',
        error: '#ef4444',
        advertencia: '#f59e0b'
    };
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${colores[tipo] || colores.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ===========================
// 🚀 INICIALIZACIÓN PRINCIPAL
// ===========================

async function inicializarModulo() {
    console.log('🎯 Módulo de utilidades inicializado');
    
    // Esperar a que el DOM esté completamente listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            inicializarComponentes();
        });
    } else {
        inicializarComponentes();
    }
}

function inicializarComponentes() {
    // Crear indicador de conexión
    crearIndicadorConexion();
    
    // Actualizar estado de conexión cada 30 segundos
    actualizarIndicadorConexion();
    setInterval(actualizarIndicadorConexion, 30000);
    
    // Agregar efectos a las tarjetas
    agregarEfectosTarjetas();
    
    // Monitorear rendimiento
    monitorearRendimiento();
    
    // Registrar evento de inicialización
    registrarEvento('modulo_inicializado', {
        version: window.ECOVOLT_UTILS.version,
        endpointsConfigurados: Object.keys(ENDPOINTS).filter(key => ENDPOINTS[key])
    });
    
    // Mostrar notificación de bienvenida
    setTimeout(() => {
        mostrarNotificacion('✅ Panel IoT EcoVolt listo', 'exito');
    }, 1000);
}

// ===========================
// 📡 WEB SOCKET HELPER (complementa iotapp.js)
// ===========================

function conectarWebSocket(url) {
    try {
        const ws = new WebSocket(url);
        
        ws.onopen = function() {
            console.log('🔌 WebSocket conectado');
            mostrarNotificacion('Conexión en tiempo real activa', 'exito');
        };
        
        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Mensaje WebSocket:', data);
                
                // Disparar evento personalizado para que iotapp.js lo capture
                const evento = new CustomEvent('websocketMessage', { detail: data });
                window.dispatchEvent(evento);
                
            } catch (error) {
                console.error('❌ Error procesando mensaje WebSocket:', error);
            }
        };
        
        ws.onclose = function() {
            console.log('🔌 WebSocket desconectado');
            mostrarNotificacion('Conexión en tiempo real perdida', 'advertencia');
            
            // Intentar reconectar después de 5 segundos
            setTimeout(() => {
                console.log('🔄 Intentando reconectar WebSocket...');
                conectarWebSocket(url);
            }, 5000);
        };
        
        ws.onerror = function(error) {
            console.error('❌ Error WebSocket:', error);
        };
        
        return ws;
    } catch (error) {
        console.error('❌ Error creando WebSocket:', error);
        return null;
    }
}

// ===========================
// 🎛️ FUNCIONES DE CONTROL ADICIONALES
// ===========================

// Control de dispositivo específico
async function controlarDispositivo(deviceId, accion, parametros = {}) {
    if (!ENDPOINTS.CONTROL) {
        console.log('🎛️ Control no disponible - Modo simulación');
        mostrarNotificacion(`Simulando ${accion} en ${deviceId}`, 'info');
        return { ok: true, simulado: true };
    }

    try {
        const response = await fetch(ENDPOINTS.CONTROL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                deviceId,
                action: accion,
                ...parametros
            })
        });

        const resultado = await response.json();
        
        if (resultado.ok) {
            mostrarNotificacion(`✅ ${accion} ejecutado correctamente`, 'exito');
        } else {
            mostrarNotificacion(`❌ Error en ${accion}: ${resultado.message}`, 'error');
        }
        
        return resultado;
    } catch (error) {
        console.log('❌ Error de control:', error.message);
        mostrarNotificacion('❌ Error de conexión con el backend', 'error');
        return { ok: false, error: error.message };
    }
}

// Exportar funciones globalmente
window.ECOVOLT_CONTROLES = {
    controlarDispositivo,
    mostrarNotificacion,
    verificarEstadoBackend,
    conectarWebSocket
};

// Inicializar el módulo
inicializarModulo();

// Mantener compatibilidad con código existente (evitar duplicación)
if (!window.aplicarRetrocesoCarga) {
    window.aplicarRetrocesoCarga = async function() {
        return await controlarDispositivo(
            "ecovolt_digital_twin", 
            "force_charge", 
            { value: 100 }
        );
    };
}
