/* =================================================
   CONSTANTES DEL JUEGO
   ================================================= */
const CONFIG = {
    TOTAL_FRAMES: 4,
    VELOCIDAD_ANIMACION_MS: 41,
    RUTA_LANZAMIENTO: "img/lanzamiento/",
    RUTA_TRANSICION: "img/transicion/",
    FRAMES_TRANSICION: 9,          // del 9 al 0
    TIEMPO_ANTES_TRANSICION_MS: 400,
    IDs: {
        PANEL: "panel",
        FONDO: "fondo-img",
        TIRACHINAS: "tirachinas-img",
        BASE_TIRACHINAS: "base-banda-tirachinas-img",
        SATELITE: "satelite-img",
        BASE_BANDA: "base-banda-img",
        BANDA_DER: "banda-der-img",
        TRANSICION: "transicion-img",
        MENSAJE: "mensaje",
        INPUT_NUMERO: "numUsuario",
        HISTORIAL: "historial",
        BOTON_REINICIAR: "btn-reiniciar",
        SELECT_DIFICULTAD: "select-dificultad"
    },
    PREFIJOS: {
        BANDA_IZQ: "banda-izq-",
        BANDA_DER: "banda-der-"
    },
    MAX_INTENTOS: 10,
    DIFICULTADES: {
    FACIL: { max: 100, nombre: "Fácil (1-100)" },
    MEDIA: { max: 333, nombre: "Media (1-333)" },
    DIFICIL: { max: 767, nombre: "Difícil (1-767)" }
},
};

// Elementos que forman parte del lanzamiento (para ocultar/mostrar)
const ELEMENTOS_LANZAMIENTO = [
    CONFIG.IDs.FONDO,
    CONFIG.IDs.TIRACHINAS,
    CONFIG.IDs.BASE_TIRACHINAS,
    CONFIG.IDs.SATELITE,
    CONFIG.IDs.BASE_BANDA,
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_IZQ}${i + 1}`),
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_DER}${i + 1}`)
];

/* =================================================
   VARIABLES DE ESTADO
   ================================================= */
let numeroSecreto = Math.floor(Math.random() * 100) + 1;
let intentos = 0;
let historial = [];
let faseJuego = "lanzamiento"; // "lanzamiento", "espacio", "final"
let dificultadActual = "FACIL";
let maximoActual = CONFIG.DIFICULTADES.FACIL.max;


function generarNumeroSecreto() {
    return Math.floor(Math.random() * maximoActual) + 1;
}

function cambiarDificultad() {
    const select = document.getElementById(CONFIG.IDs.SELECT_DIFICULTAD);
    dificultadActual = select.value;
    maximoActual = CONFIG.DIFICULTADES[dificultadActual].max;
    actualizarTextoRango();
    const input = document.getElementById(CONFIG.IDs.INPUT_NUMERO);
    input.max = maximoActual;
    input.placeholder = `1-${maximoActual}`;
    iniciarJuego();
}

/* =================================================
   FUNCIONES DE VISIBILIDAD
   ================================================= */
function mostrarElemento(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("oculto");
}

function ocultarElemento(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("oculto");
}

function mostrarGrupo(ids) {
    ids.forEach(mostrarElemento);
}

function ocultarGrupo(ids) {
    ids.forEach(ocultarElemento);
}

/* =================================================
   FUNCIONES DE SPRITES
   ================================================= */
function asignarFrame(id, rutaBase, frame) {
    const img = document.getElementById(id);
    if (!img) return;
    img.src = rutaBase + frame + ".png";
    img.classList.remove("oculto");
    img.onerror = () => img.classList.add("oculto");
}

// Activa las bandas acumulativas hasta el frame indicado
function actualizarBandas(prefijo, frameActivo) {
    for (let i = 1; i <= CONFIG.TOTAL_FRAMES; i++) {
        const banda = document.getElementById(prefijo + i);
        if (banda) {
            banda.classList.toggle("oculto", i > frameActivo);
        }
    }
}

// Prepara todos los elementos del lanzamiento para un frame específico
function establecerFrameLanzamiento(frame) {
    asignarFrame(CONFIG.IDs.SATELITE, CONFIG.RUTA_LANZAMIENTO + "satelite-", frame);
    asignarFrame(CONFIG.IDs.BASE_BANDA, CONFIG.RUTA_LANZAMIENTO + "base-banda-", frame);
    asignarFrame(CONFIG.IDs.BANDA_DER, CONFIG.RUTA_LANZAMIENTO + "banda-der-", frame);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_IZQ, frame);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_DER, frame);
}

/* =================================================
   ANIMACIONES
   ================================================= */
function ocultarLanzamiento() {
    ocultarGrupo(ELEMENTOS_LANZAMIENTO);
}

function animarLanzamiento() {
    colocarSateliteInicial();
    let frame = CONFIG.TOTAL_FRAMES;
    const intervalo = setInterval(() => {
        establecerFrameLanzamiento(frame);
        frame--;
        if (frame < 0) clearInterval(intervalo);
    }, CONFIG.VELOCIDAD_ANIMACION_MS);
}

function animarTransicion() {
    let frame = CONFIG.FRAMES_TRANSICION;
    mostrarElemento(CONFIG.IDs.TRANSICION);
    const intervalo = setInterval(() => {
        asignarFrame(CONFIG.IDs.TRANSICION, CONFIG.RUTA_TRANSICION, frame);
        frame--;
        if (frame < 0) clearInterval(intervalo);
    }, CONFIG.VELOCIDAD_ANIMACION_MS);
}

function iniciarTransicion() {
    ocultarLanzamiento();
    animarTransicion();
}

function lanzarSatelite() {
    faseJuego = "espacio";
    //ocultarElemento(CONFIG.IDs.PANEL);
    animarLanzamiento();
    setTimeout(iniciarTransicion, CONFIG.TIEMPO_ANTES_TRANSICION_MS);
}

/* =================================================
   CONFIGURACIÓN INICIAL
   ================================================= */
function colocarSateliteInicial() {
    mostrarGrupo([
        CONFIG.IDs.FONDO,
        CONFIG.IDs.TIRACHINAS,
        CONFIG.IDs.BASE_TIRACHINAS,
        CONFIG.IDs.SATELITE,
        CONFIG.IDs.BASE_BANDA
    ]);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_IZQ, CONFIG.TOTAL_FRAMES);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_DER, CONFIG.TOTAL_FRAMES);
}

function reiniciarEstado() {
    faseJuego = "lanzamiento";
    numeroSecreto = generarNumeroSecreto();
    intentos = 0;
    historial = [];
    document.getElementById(CONFIG.IDs.MENSAJE).innerHTML = "";
    document.getElementById(CONFIG.IDs.HISTORIAL).innerHTML = "";
    const input = document.getElementById(CONFIG.IDs.INPUT_NUMERO);
    input.disabled = false;
    input.value = "";
    const btnEnviar = document.querySelector("#form-ingreso button[type='submit']");
    if (btnEnviar) btnEnviar.disabled = false;
    ocultarElemento(CONFIG.IDs.BOTON_REINICIAR);
}

function actualizarHistorial() {
    const historialDiv = document.getElementById(CONFIG.IDs.HISTORIAL);
    if (!historialDiv) return;
    let html = "<h3>Intentos anteriores:</h3><ul>";
    historial.forEach(num => {
        html += `<li>${num}</li>`;
    });
    html += "</ul>";
    historialDiv.innerHTML = html;
}

function actualizarTextoRango() {
    const spanRango = document.getElementById('rango-maximo');
    if (spanRango) {
        spanRango.textContent = maximoActual;
    }
}

/* =================================================
   FUNCIONES PRINCIPALES (GLOBALES)
   ================================================= */
function iniciarJuego() {
    reiniciarEstado();
    colocarSateliteInicial();
    establecerFrameLanzamiento(CONFIG.TOTAL_FRAMES);
    actualizarTextoRango();
    const input = document.getElementById(CONFIG.IDs.INPUT_NUMERO);
    input.max = maximoActual;
    input.placeholder = `1-${maximoActual}`;
}

function validarNumero() {
    const input = document.getElementById(CONFIG.IDs.INPUT_NUMERO);
    if (input.disabled) return;

    lanzarSatelite(); // tu animación existente

    const numeroUsuario = parseInt(input.value, 10);
    if (isNaN(numeroUsuario) || numeroUsuario < 1 || numeroUsuario > maximoActual) {
        alert(`Por favor ingresa un número entre 1 y ${maximoActual}`);
        return;
    }

    intentos++;
    historial.push(numeroUsuario);
    actualizarHistorial();

    const mensajeEl = document.getElementById(CONFIG.IDs.MENSAJE);
    let juegoTerminado = false;

    if (numeroUsuario === numeroSecreto) {
        mensajeEl.innerHTML = `¡Felicidades! ¡Lo has puesto en órbita con ${intentos} intento(s)!`;
        juegoTerminado = true;
    } else {
        if (numeroUsuario < numeroSecreto) {
            mensajeEl.innerHTML = "¡Tu fuerza es demasiado baja!";
        } else {
            mensajeEl.innerHTML = "¡Te has pasado, máquina!";
        }

        if (intentos >= CONFIG.MAX_INTENTOS) {
            mensajeEl.innerHTML = ` Has agotado tus 10 intentos. El número era ${numeroSecreto}.`;
            juegoTerminado = true;
        }
    }

    if (juegoTerminado) {
        input.disabled = true;
        const btnEnviar = document.querySelector("#form-ingreso button[type='submit']");
        if (btnEnviar) btnEnviar.disabled = true;
        mostrarElemento(CONFIG.IDs.BOTON_REINICIAR);
    } else {
        input.value = "";
    }
}

document.getElementById(CONFIG.IDs.SELECT_DIFICULTAD).addEventListener('change', cambiarDificultad);

// Iniciar automáticamente al cargar la página
iniciarJuego();