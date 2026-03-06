/* =================================================
   CONSTANTES DEL JUEGO
   ================================================= */
const CONFIG = {
    TOTAL_FRAMES: 4,
    VELOCIDAD_ANIMACION_MS: 41,
    TIEMPO_ANTES_TRANSICION_MS: 280,
    TIEMPO_ESPACIO_MS: 250,
    MAX_INTENTOS: 10,
    RUTA_LANZAMIENTO: "img/lanzamiento/",
    RUTA_TRANSICION: "img/transicion/",
    RUTA_ESPACIO: "img/espacio/",
    RUTA_PANTALLAS: "img/pantallas/",
    FRAMES_TRANSICION: 9,
    IDs: {
        PANEL: "panel",
        MENSAJE: "mensaje",
        INPUT_NUMERO: "numUsuario",
        HISTORIAL: "historial",
        SELECT_DIFICULTAD: "select-dificultad",
        RANGO_MAXIMO: "rango-maximo",
        FORM_INGRESO: "form-ingreso",
        ZONA_MENSAJES: "zona-mensajes",
        TITULO_MENU: "titulo-menu",
        DESCRIPCION: "descripcion-juego",
        DIFICULTAD: "dificultad",
        ACCIONES_MENU: "acciones-menu",
        ACCIONES_FINAL: "acciones-final",
        BTN_JUGAR: "btn-jugar",
        BTN_REINICIAR: "btn-reiniciar",
        BTN_MENU: "btn-menu",
        FONDO: "fondo-img",
        TIRACHINAS: "tirachinas-img",
        BASE_TIRACHINAS: "base-banda-tirachinas-img",
        SATELITE: "satelite-img",
        BASE_BANDA: "base-banda-img",
        TRANSICION: "transicion-img",
        ESPACIO: "espacio-img",
        TIERRA: "tierra-img",
        ZOOM_SATELITE: "zoom-satelite-img",
        FONDO_PANEL: "fondo-panel-img",
        PANTALLA: "pantalla-img"
    },
    PREFIJOS: {
        BANDA_IZQ: "banda-izq-",
        BANDA_DER: "banda-der-"
    },
    DIFICULTADES: {
        FACIL: { max: 100 },
        MEDIA: { max: 333 },
        DIFICIL: { max: 767 }
    },
    RESULTADOS: {
        BAJO: {
            mensaje: "¡Tu fuerza es demasiado baja!",
            imagen: "satelite-cayendo.png"
        },
        ALTO: {
            mensaje: "¡Te has pasado, máquina!",
            imagen: "satelite-perdiendose.png"
        },
        ACIERTO: {
            mensaje: "¡Felicidades! ¡Lo has puesto en órbita!",
            imagen: "partida-ganada.png"
        }
    }
};

const ELEMENTOS_LANZAMIENTO = [
    CONFIG.IDs.FONDO,
    CONFIG.IDs.TIRACHINAS,
    CONFIG.IDs.BASE_TIRACHINAS,
    CONFIG.IDs.SATELITE,
    CONFIG.IDs.BASE_BANDA,
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_IZQ}${i + 1}`),
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_DER}${i + 1}`)
];

const ELEMENTOS_ESPACIO = [
    CONFIG.IDs.ESPACIO,
    CONFIG.IDs.TIERRA,
    CONFIG.IDs.ZOOM_SATELITE
];

const ELEMENTOS_PANTALLA = [
    CONFIG.IDs.FONDO_PANEL,
    CONFIG.IDs.PANTALLA
];
const DIFICULTAD_POR_DEFECTO = "FACIL";

/* =================================================
   ESTADO
   ================================================= */
let numeroSecreto = 1;
let intentos = 0;
let historial = [];
let dificultadActual = "FACIL";
let maximoActual = CONFIG.DIFICULTADES.FACIL.max;
let faseJuego = "menu"; // menu | juego | espacio | final
let juegoEnAnimacion = false;
let recursosPrecargados = false;
let intervaloTierra = null;
let frameTierraActual = 1;

/* =================================================
   UTILIDADES UI
   ================================================= */
function el(id) {
    return document.getElementById(id);
}

function mostrarElemento(id) {
    const nodo = el(id);
    if (nodo) nodo.classList.remove("oculto");
}

function ocultarElemento(id) {
    const nodo = el(id);
    if (nodo) nodo.classList.add("oculto");
}

function mostrarGrupo(ids) {
    ids.forEach(mostrarElemento);
}

function ocultarGrupo(ids) {
    ids.forEach(ocultarElemento);
}

function ocultarEscenasVisuales() {
    detenerAnimacionTierra();
    ocultarGrupo(ELEMENTOS_LANZAMIENTO);
    ocultarGrupo(ELEMENTOS_ESPACIO);
    ocultarGrupo(ELEMENTOS_PANTALLA);
    ocultarElemento(CONFIG.IDs.TRANSICION);
}

function asignarFrame(id, rutaBase, frame) {
    const img = el(id);
    if (!img) return;
    img.src = `${rutaBase}${frame}.png`;
    img.onerror = () => img.classList.add("oculto");
    img.classList.remove("oculto");
}

function asignarImagenPantalla(nombreArchivo) {
    const img = el(CONFIG.IDs.PANTALLA);
    if (!img) return;
    img.src = CONFIG.RUTA_PANTALLAS + nombreArchivo;
    img.classList.remove("oculto");
}

function actualizarBandas(prefijo, frameActivo) {
    for (let i = 1; i <= CONFIG.TOTAL_FRAMES; i++) {
        const banda = el(prefijo + i);
        if (banda) banda.classList.toggle("oculto", i > frameActivo);
    }
}

function establecerFrameLanzamiento(frame) {
    const frameSatelite = Math.max(0, frame);
    const frameBandas = Math.max(1, frame);

    asignarFrame(CONFIG.IDs.SATELITE, CONFIG.RUTA_LANZAMIENTO + "satelite-", frameSatelite);
    asignarFrame(CONFIG.IDs.BASE_BANDA, CONFIG.RUTA_LANZAMIENTO + "base-banda-", frameBandas);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_IZQ, frameBandas);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_DER, frameBandas);
}

function bloquearEntrada(bloquear) {
    const input = el(CONFIG.IDs.INPUT_NUMERO);
    if (input) input.disabled = bloquear;

    const btnEnviar = document.querySelector("#form-ingreso button[type='submit']");
    if (btnEnviar) btnEnviar.disabled = bloquear;
}

function marcarPanelInactivo(inactivo) {
    const panelMarco = el("panel-marco");
    if (panelMarco) panelMarco.classList.toggle("panel-inactivo", inactivo);
}

function limpiarMensajes() {
    const mensajeEl = el(CONFIG.IDs.MENSAJE);
    const historialEl = el(CONFIG.IDs.HISTORIAL);
    if (mensajeEl) mensajeEl.textContent = "";
    if (historialEl) historialEl.innerHTML = "";
}

function actualizarHistorial() {
    const historialDiv = el(CONFIG.IDs.HISTORIAL);
    if (!historialDiv) return;

    const items = historial.map((num) => `<li>${num}</li>`).join("");
    historialDiv.innerHTML = `<ul>${items}</ul>`;
}

function actualizarRangoUI() {
    const spanRango = el(CONFIG.IDs.RANGO_MAXIMO);
    if (spanRango) spanRango.textContent = maximoActual;

    const input = el(CONFIG.IDs.INPUT_NUMERO);
    if (input) {
        input.max = maximoActual;
        input.placeholder = `1-${maximoActual}`;
    }
}

function setBotonJugarCargando(cargando) {
    const btnJugar = el(CONFIG.IDs.BTN_JUGAR);
    if (!btnJugar) return;
    btnJugar.disabled = cargando;
    btnJugar.textContent = cargando ? "Cargando..." : "Jugar";
}

function iniciarAnimacionTierra() {
    detenerAnimacionTierra();
    frameTierraActual = 1;
    asignarFrame(CONFIG.IDs.TIERRA, CONFIG.RUTA_ESPACIO + "tierra", frameTierraActual);

    intervaloTierra = setInterval(() => {
        frameTierraActual++;
        if (frameTierraActual > 12) frameTierraActual = 1;
        asignarFrame(CONFIG.IDs.TIERRA, CONFIG.RUTA_ESPACIO + "tierra", frameTierraActual);
    }, 80);
}

function detenerAnimacionTierra() {
    if (!intervaloTierra) return;
    clearInterval(intervaloTierra);
    intervaloTierra = null;
}

function obtenerRutasRecursos() {
    const rutas = [
        "img/dispositivos/televisor.png",
        "img/dispositivos/panel.png",
        "img/lanzamiento/fondo.png",
        "img/lanzamiento/tirachinas.png",
        "img/lanzamiento/base-banda-tirachinas.png",
        "img/espacio/zoom-satelite.png",
        "img/pantallas/main-menu.png",
        "img/pantallas/partida-ganada.png",
        "img/pantallas/satelite-cayendo.png",
        "img/pantallas/satelite-perdiendose.png"
    ];

    for (let i = 0; i <= 4; i++) {
        rutas.push(`img/lanzamiento/satelite-${i}.png`);
    }
    for (let i = 1; i <= 4; i++) {
        rutas.push(`img/lanzamiento/base-banda-${i}.png`);
        rutas.push(`img/lanzamiento/banda-izq-${i}.png`);
        rutas.push(`img/lanzamiento/banda-der-${i}.png`);
        rutas.push(`img/espacio/espacio-${i}.png`);
    }
    for (let i = 0; i <= 9; i++) {
        rutas.push(`img/transicion/${i}.png`);
    }
    for (let i = 1; i <= 12; i++) {
        rutas.push(`img/espacio/tierra${i}.png`);
    }

    return [...new Set(rutas)];
}

function precargarImagen(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = src;
    });
}

async function precargarRecursosIniciales() {
    if (recursosPrecargados) return;
    setBotonJugarCargando(true);

    const inicio = Date.now();
    const rutas = obtenerRutasRecursos();
    await Promise.all(rutas.map(precargarImagen));

    const tiempoMinimoCarga = 300;
    const transcurrido = Date.now() - inicio;
    if (transcurrido < tiempoMinimoCarga) {
        await new Promise((resolve) => setTimeout(resolve, tiempoMinimoCarga - transcurrido));
    }

    recursosPrecargados = true;
    setBotonJugarCargando(false);
}

/* =================================================
   MODOS DE PANEL
   ================================================= */
function mostrarPanelMenu() {
    mostrarElemento(CONFIG.IDs.TITULO_MENU);
    mostrarElemento(CONFIG.IDs.DESCRIPCION);
    mostrarElemento(CONFIG.IDs.DIFICULTAD);
    mostrarElemento(CONFIG.IDs.ACCIONES_MENU);

    ocultarElemento(CONFIG.IDs.FORM_INGRESO);
    ocultarElemento(CONFIG.IDs.HISTORIAL);
    ocultarElemento(CONFIG.IDs.ACCIONES_FINAL);
    ocultarElemento(CONFIG.IDs.ZONA_MENSAJES);

    const mensajeEl = el(CONFIG.IDs.MENSAJE);
    if (mensajeEl) mensajeEl.textContent = "";
}

function mostrarPanelJuego() {
    ocultarElemento(CONFIG.IDs.TITULO_MENU);
    ocultarElemento(CONFIG.IDs.DESCRIPCION);
    ocultarElemento(CONFIG.IDs.DIFICULTAD);
    ocultarElemento(CONFIG.IDs.ACCIONES_MENU);
    ocultarElemento(CONFIG.IDs.ACCIONES_FINAL);

    mostrarElemento(CONFIG.IDs.FORM_INGRESO);
    mostrarElemento(CONFIG.IDs.HISTORIAL);
    mostrarElemento(CONFIG.IDs.ZONA_MENSAJES);
}

function mostrarPanelFinPorIntentos(numero) {
    ocultarElemento(CONFIG.IDs.TITULO_MENU);
    ocultarElemento(CONFIG.IDs.DESCRIPCION);
    ocultarElemento(CONFIG.IDs.DIFICULTAD);
    ocultarElemento(CONFIG.IDs.ACCIONES_MENU);
    ocultarElemento(CONFIG.IDs.FORM_INGRESO);

    mostrarElemento(CONFIG.IDs.HISTORIAL);
    mostrarElemento(CONFIG.IDs.ACCIONES_FINAL);
    mostrarElemento(CONFIG.IDs.ZONA_MENSAJES);
    const mensajeEl = el(CONFIG.IDs.MENSAJE);
    if (mensajeEl) mensajeEl.textContent = `Sin intentos. Numero secreto: ${numero}`;
}

/* =================================================
   ESCENAS VISUALES
   ================================================= */
function mostrarEscenaMenu() {
    faseJuego = "menu";
    ocultarEscenasVisuales();
    asignarImagenPantalla("main-menu.png");
}

function mostrarEscenaLanzamiento() {
    faseJuego = "juego";
    ocultarEscenasVisuales();
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

function mostrarEscenaEspacio() {
    faseJuego = "espacio";
    ocultarEscenasVisuales();
    asignarFrame(CONFIG.IDs.ESPACIO, CONFIG.RUTA_ESPACIO + "espacio-", 1);
    iniciarAnimacionTierra();
    mostrarElemento(CONFIG.IDs.ZOOM_SATELITE);
}

function mostrarEscenaFinal(tipoResultado) {
    faseJuego = "final";
    ocultarEscenasVisuales();

    const resultado = CONFIG.RESULTADOS[tipoResultado];
    if (!resultado) return;

    mostrarGrupo([CONFIG.IDs.FONDO_PANEL]);
    asignarImagenPantalla(resultado.imagen);
}

/* =================================================
   ANIMACIONES
   ================================================= */
function animarLanzamiento() {
    let frame = CONFIG.TOTAL_FRAMES;
    const intervalo = setInterval(() => {
        establecerFrameLanzamiento(frame);
        frame--;
        if (frame < 0) clearInterval(intervalo);
    }, CONFIG.VELOCIDAD_ANIMACION_MS);
}

function animarTransicion(onCubierto, onFinish) {
    let frame = CONFIG.FRAMES_TRANSICION;
    mostrarElemento(CONFIG.IDs.TRANSICION);

    asignarFrame(CONFIG.IDs.TRANSICION, CONFIG.RUTA_TRANSICION, frame);
    if (onCubierto) onCubierto();
    frame--;

    const intervalo = setInterval(() => {
        asignarFrame(CONFIG.IDs.TRANSICION, CONFIG.RUTA_TRANSICION, frame);
        frame--;
        if (frame < 0) {
            clearInterval(intervalo);
            ocultarElemento(CONFIG.IDs.TRANSICION);
            if (onFinish) onFinish();
        }
    }, CONFIG.VELOCIDAD_ANIMACION_MS);
}

function lanzarSecuenciaCompleta(tipoResultado, onFinish) {
    if (juegoEnAnimacion) return;
    juegoEnAnimacion = true;
    marcarPanelInactivo(true);

    mostrarEscenaLanzamiento();
    establecerFrameLanzamiento(CONFIG.TOTAL_FRAMES);
    animarLanzamiento();

    setTimeout(() => {
        animarTransicion(
            () => {
                ocultarGrupo(ELEMENTOS_LANZAMIENTO);
                mostrarEscenaEspacio();
            },
            () => {
                setTimeout(() => {
                    animarTransicion(
                        () => {
                            ocultarGrupo(ELEMENTOS_ESPACIO);
                            mostrarEscenaFinal(tipoResultado);
                        },
                        () => {
                            juegoEnAnimacion = false;
                            marcarPanelInactivo(false);
                            if (onFinish) onFinish();
                        }
                    );
                }, CONFIG.TIEMPO_ESPACIO_MS);
            }
        );
    }, CONFIG.TIEMPO_ANTES_TRANSICION_MS);
}

/* =================================================
   FLUJO DE PARTIDA
   ================================================= */
function generarNumeroSecreto() {
    return Math.floor(Math.random() * maximoActual) + 1;
}

function resolverResultado(numeroUsuario) {
    if (numeroUsuario === numeroSecreto) return "ACIERTO";
    if (numeroUsuario < numeroSecreto) return "BAJO";
    return "ALTO";
}

function obtenerNombreDificultad() {
    if (dificultadActual === "FACIL") return "Facil";
    if (dificultadActual === "MEDIA") return "Media";
    return "Dificil";
}

function aplicarDificultad(nuevaDificultad) {
    if (!CONFIG.DIFICULTADES[nuevaDificultad]) return;
    dificultadActual = nuevaDificultad;
    maximoActual = CONFIG.DIFICULTADES[dificultadActual].max;

    const select = el(CONFIG.IDs.SELECT_DIFICULTAD);
    if (select) select.value = dificultadActual;
    actualizarRangoUI();
}

function resetEstadoBase() {
    faseJuego = "menu";
    juegoEnAnimacion = false;
    intentos = 0;
    historial = [];

    ocultarEscenasVisuales();
    limpiarMensajes();
    bloquearEntrada(true);
    marcarPanelInactivo(false);
    actualizarHistorial();

    const input = el(CONFIG.IDs.INPUT_NUMERO);
    if (input) input.value = "";
}

function prepararNuevaPartida() {
    numeroSecreto = generarNumeroSecreto();
    intentos = 0;
    historial = [];
    juegoEnAnimacion = false;
    limpiarMensajes();
    actualizarHistorial();
    actualizarRangoUI();

    const input = el(CONFIG.IDs.INPUT_NUMERO);
    if (input) input.value = "";
}

function reiniciarComoRecarga() {
    aplicarDificultad(DIFICULTAD_POR_DEFECTO);
    resetEstadoBase();
    numeroSecreto = generarNumeroSecreto();
    mostrarEscenaMenu();
    mostrarPanelMenu();
}

function irMenuPrincipal() {
    reiniciarComoRecarga();
}

function iniciarJuego() {
    if (!recursosPrecargados) return;
    faseJuego = "juego";
    prepararNuevaPartida();
    mostrarEscenaLanzamiento();
    mostrarPanelJuego();
    bloquearEntrada(false);
}

function cambiarDificultad() {
    const select = el(CONFIG.IDs.SELECT_DIFICULTAD);
    if (!select) return;
    aplicarDificultad(select.value);
}

function validarNumero() {
    if (juegoEnAnimacion || faseJuego === "menu") return;

    const input = el(CONFIG.IDs.INPUT_NUMERO);
    if (!input || input.disabled) return;

    const numeroUsuario = parseInt(input.value, 10);
    if (isNaN(numeroUsuario) || numeroUsuario < 1 || numeroUsuario > maximoActual) {
        alert(`Por favor ingresa un número entre 1 y ${maximoActual}`);
        return;
    }

    intentos++;
    historial.push(numeroUsuario);
    actualizarHistorial();
    bloquearEntrada(true);

    const resultado = resolverResultado(numeroUsuario);
    const acerto = resultado === "ACIERTO";
    const perdioPorIntentos = !acerto && intentos >= CONFIG.MAX_INTENTOS;

    lanzarSecuenciaCompleta(resultado, () => {
        const mensajeEl = el(CONFIG.IDs.MENSAJE);

        if (perdioPorIntentos) {
            mostrarPanelFinPorIntentos(numeroSecreto);
            bloquearEntrada(true);
            return;
        }

        if (acerto) {
            if (mensajeEl) {
                mensajeEl.textContent = `¡Felicidades! Lo lograste en ${intentos} intento(s) en la dificultad ${obtenerNombreDificultad()}.`;
            }
            mostrarElemento(CONFIG.IDs.HISTORIAL);
            mostrarElemento(CONFIG.IDs.ZONA_MENSAJES);
            ocultarElemento(CONFIG.IDs.FORM_INGRESO);
            mostrarElemento(CONFIG.IDs.ACCIONES_FINAL);
            bloquearEntrada(true);
            return;
        }

        mostrarPanelJuego();
        if (mensajeEl) mensajeEl.textContent = CONFIG.RESULTADOS[resultado].mensaje;
        bloquearEntrada(false);
        if (input) input.value = "";
    });
}

/* =================================================
   INICIALIZACION
   ================================================= */
function inicializarEventos() {
    const select = el(CONFIG.IDs.SELECT_DIFICULTAD);
    if (select) select.addEventListener("change", cambiarDificultad);

    const btnJugar = el(CONFIG.IDs.BTN_JUGAR);
    if (btnJugar) btnJugar.addEventListener("click", iniciarJuego);

    const btnReiniciar = el(CONFIG.IDs.BTN_REINICIAR);
    if (btnReiniciar) btnReiniciar.addEventListener("click", iniciarJuego);

    const btnMenu = el(CONFIG.IDs.BTN_MENU);
    if (btnMenu) btnMenu.addEventListener("click", irMenuPrincipal);
}

inicializarEventos();
reiniciarComoRecarga();
precargarRecursosIniciales();
