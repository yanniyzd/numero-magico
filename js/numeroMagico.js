// Constantes del juego
const CONFIG = {
    TOTAL_FRAMES: 4,
    VELOCIDAD_ANIMACION_MS: 41,
    VELOCIDAD_ESPACIO_MS: 120,
    TIEMPO_ANTES_TRANSICION_MS: 280,
    MAX_INTENTOS: 10,
    FISICA: {
        ALTURA_CHOQUE_PX: 90,
        ALTURA_ORBITA_PX: 140,
        ALTURA_PERDIDA_PX: 220,
        ANGULO_INICIAL_RAD: Math.PI / 4,
        SENTIDO_HORARIO: true,
        PERIODO_ORBITA_MS: 2000,
        RENDER_ESPACIO_MS: 1000 / 24,
        MIN_RESULTADO_MS: 500,
        DURACION_MIN_RESULTADO_MS: 1000,
        DURACION_MAX_RESULTADO_MS: 5000,
        DURACION_ORBITA_ACIERTO_MS: 5000,
        TIEMPO_FALLBACK_MS: 5000
    },
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
    CONFIG.IDs.FONDO, CONFIG.IDs.TIRACHINAS, CONFIG.IDs.BASE_TIRACHINAS,
    CONFIG.IDs.SATELITE, CONFIG.IDs.BASE_BANDA,
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_IZQ}${i + 1}`),
    ...Array.from({ length: CONFIG.TOTAL_FRAMES }, (_, i) => `${CONFIG.PREFIJOS.BANDA_DER}${i + 1}`)
];

const ELEMENTOS_ESPACIO = [CONFIG.IDs.ESPACIO, CONFIG.IDs.TIERRA, CONFIG.IDs.ZOOM_SATELITE];
const ELEMENTOS_PANTALLA = [CONFIG.IDs.FONDO_PANEL, CONFIG.IDs.PANTALLA];
const DIFICULTAD_POR_DEFECTO = "FACIL";

// Estado del juego
let numeroSecreto = 1;
let intentos = 0;
let historial = [];
let dificultadActual = "FACIL";
let maximoActual = CONFIG.DIFICULTADES.FACIL.max;
let faseJuego = "menu";
let juegoEnAnimacion = false;
let recursosPrecargados = false;
let intervaloTierra = null;
let frameTierraActual = 1;
let intervaloEspacio = null;
let frameEspacioActual = 1;
let simulacionEspacio = null;
let rafEspacio = null;

// Utilidades DOM
function el(id) { return document.getElementById(id); }
function mostrarElemento(id) { el(id)?.classList.remove("oculto"); }
function ocultarElemento(id) { el(id)?.classList.add("oculto"); }
function mostrarGrupo(ids) { ids.forEach(mostrarElemento); }
function ocultarGrupo(ids) { ids.forEach(ocultarElemento); }

function ocultarEscenasVisuales(preservarTransicion = false) {
    detenerAnimacionTierra();
    detenerAnimacionFondoEspacio();
    detenerSimulacionEspacio();
    ocultarGrupo(ELEMENTOS_LANZAMIENTO);
    ocultarGrupo(ELEMENTOS_ESPACIO);
    ocultarGrupo(ELEMENTOS_PANTALLA);
    if (!preservarTransicion) ocultarElemento(CONFIG.IDs.TRANSICION);
}

function asignarFrame(id, rutaBase, frame) {
    const img = el(id);
    if (!img) return;
    img.src = `${rutaBase}${frame}.png`;
    img.classList.remove("oculto");
}

function asignarImagenPantalla(nombreArchivo) {
    const img = el(CONFIG.IDs.PANTALLA);
    if (img) {
        img.src = CONFIG.RUTA_PANTALLAS + nombreArchivo;
        img.classList.remove("oculto");
    }
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
    el("panel-marco")?.classList.toggle("panel-inactivo", inactivo);
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
    historialDiv.innerHTML = `<ul>${historial.map(num => `<li>${num}</li>`).join("")}</ul>`;
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
        frameTierraActual = (frameTierraActual % 12) + 1;
        asignarFrame(CONFIG.IDs.TIERRA, CONFIG.RUTA_ESPACIO + "tierra", frameTierraActual);
    }, 80);
}

function detenerAnimacionTierra() {
    if (intervaloTierra) {
        clearInterval(intervaloTierra);
        intervaloTierra = null;
    }
}

function iniciarAnimacionFondoEspacio() {
    detenerAnimacionFondoEspacio();
    frameEspacioActual = 1;
    asignarFrame(CONFIG.IDs.ESPACIO, CONFIG.RUTA_ESPACIO + "espacio-", frameEspacioActual);
    intervaloEspacio = setInterval(() => {
        frameEspacioActual = (frameEspacioActual % CONFIG.TOTAL_FRAMES) + 1;
        asignarFrame(CONFIG.IDs.ESPACIO, CONFIG.RUTA_ESPACIO + "espacio-", frameEspacioActual);
    }, CONFIG.VELOCIDAD_ESPACIO_MS);
}

function detenerAnimacionFondoEspacio() {
    if (intervaloEspacio) {
        clearInterval(intervaloEspacio);
        intervaloEspacio = null;
    }
}

function actualizarPosicionSateliteEspacio(angulo, radioPx) {
    const satelite = el(CONFIG.IDs.ZOOM_SATELITE);
    const pantalla = el("pantalla");
    if (!satelite || !pantalla) return;
    const rect = pantalla.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    const px = cx + (radioPx * Math.cos(angulo));
    const py = cy - (radioPx * Math.sin(angulo));
    satelite.style.left = `${(px / rect.width) * 100}%`;
    satelite.style.top = `${(py / rect.height) * 100}%`;
}

function detenerSimulacionEspacio() {
    if (rafEspacio) {
        cancelAnimationFrame(rafEspacio);
        rafEspacio = null;
    }
    simulacionEspacio = null;
}

// Funciones auxiliares matemáticas
function clamp(valor, min, max) { return Math.min(max, Math.max(min, valor)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function calcularDuracionResultadoMs(fuerzaUsuario) {
    const diferencia = Math.abs(fuerzaUsuario - numeroSecreto);
    const rangoGlobal = Math.max(1, maximoActual - 1);
    const progreso = clamp(diferencia / rangoGlobal, 0, 1);
    return CONFIG.FISICA.DURACION_MAX_RESULTADO_MS -
        ((CONFIG.FISICA.DURACION_MAX_RESULTADO_MS - CONFIG.FISICA.DURACION_MIN_RESULTADO_MS) * progreso);
}

function construirCondicionesInicialesEspacio(fuerzaUsuario) {
    return {
        r0: CONFIG.FISICA.ALTURA_ORBITA_PX,
        anguloInicial: CONFIG.FISICA.ANGULO_INICIAL_RAD,
        fuerza: Math.max(1, Math.min(maximoActual, fuerzaUsuario)),
        numeroSecreto,
        maximoActual,
        progresoError: clamp(Math.abs(fuerzaUsuario - numeroSecreto) / Math.max(1, maximoActual - 1), 0, 1)
    };
}

function finalizarResultadoEspacio(tipoResultado, motivoFinal) {
    if (!simulacionEspacio) return;
    const callbackResultado = simulacionEspacio.onResultado;
    detenerSimulacionEspacio();
    if (typeof callbackResultado === "function") callbackResultado(tipoResultado, motivoFinal);
}

function iniciarSimulacionEspacio(fuerzaUsuario, resultadoEsperado, onResultado) {
    detenerSimulacionEspacio();
    const inicial = construirCondicionesInicialesEspacio(fuerzaUsuario);
    const radioChoque = CONFIG.FISICA.ALTURA_CHOQUE_PX;
    const radioPerdida = CONFIG.FISICA.ALTURA_PERDIDA_PX;
    const signoSentido = CONFIG.FISICA.SENTIDO_HORARIO ? -1 : 1;
    const omegaAngular = signoSentido * ((2 * Math.PI) / (CONFIG.FISICA.PERIODO_ORBITA_MS / 1000));
    const duracionObjetivoMs = resultadoEsperado === "ACIERTO"
        ? CONFIG.FISICA.DURACION_ORBITA_ACIERTO_MS
        : calcularDuracionResultadoMs(inicial.fuerza);

    let radioObjetivo = inicial.r0;
    let modoTrayectoria = "ORBITA";
    if (resultadoEsperado === "BAJO") {
        radioObjetivo = radioChoque;
        modoTrayectoria = "CAIDA";
    } else if (resultadoEsperado === "ALTO") {
        radioObjetivo = radioPerdida;
        modoTrayectoria = "ASCENSO";
    }

    simulacionEspacio = {
        estado: "TRAYECTORIA",
        tAnterior: null,
        tiempoS: 0,
        tiempoTrayectoriaMs: 0,
        vueltas: 0,
        anguloInicial: inicial.anguloInicial,
        anguloActual: inicial.anguloInicial,
        anguloAnterior: inicial.anguloInicial,
        anguloAcumulado: 0,
        omegaAngular,
        resultadoEsperado,
        resultadoPendiente: null,
        motivoPendiente: null,
        radioInicio: inicial.r0,
        radioObjetivo,
        radioActual: inicial.r0,
        modoTrayectoria,
        duracionObjetivoMs,
        progresoError: inicial.progresoError,
        radioMaximo: inicial.r0,
        radioMinimo: inicial.r0,
        tInicioReal: performance.now(),
        acumuladoRenderMs: 0,
        frameRenderMs: CONFIG.FISICA.RENDER_ESPACIO_MS,
        onResultado,
        fuerzaUsuario: inicial.fuerza,
        numeroSecreto: inicial.numeroSecreto,
        maximoActual: inicial.maximoActual
    };

    actualizarPosicionSateliteEspacio(simulacionEspacio.anguloActual, simulacionEspacio.radioActual);

    const loop = (timestamp) => {
        if (!simulacionEspacio) return;

        if (simulacionEspacio.tAnterior === null) {
            simulacionEspacio.tAnterior = timestamp;
            rafEspacio = requestAnimationFrame(loop);
            return;
        }

        const tiempoVisibleMs = timestamp - simulacionEspacio.tInicioReal;
        const puedeConcluir = tiempoVisibleMs >= CONFIG.FISICA.MIN_RESULTADO_MS;

        if (simulacionEspacio.resultadoPendiente && puedeConcluir) {
            finalizarResultadoEspacio(
                simulacionEspacio.resultadoPendiente,
                simulacionEspacio.motivoPendiente || "pendiente_minimo_visual"
            );
            return;
        }

        const dtMs = Math.max(0, timestamp - simulacionEspacio.tAnterior);
        simulacionEspacio.tAnterior = timestamp;
        simulacionEspacio.tiempoTrayectoriaMs += dtMs;
        simulacionEspacio.tiempoS = simulacionEspacio.tiempoTrayectoriaMs / 1000;
        simulacionEspacio.acumuladoRenderMs += dtMs;

        const progreso = simulacionEspacio.duracionObjetivoMs > 0
            ? clamp(simulacionEspacio.tiempoTrayectoriaMs / simulacionEspacio.duracionObjetivoMs, 0, 1)
            : 1;

        simulacionEspacio.anguloActual = simulacionEspacio.anguloInicial +
            (simulacionEspacio.omegaAngular * simulacionEspacio.tiempoS);

        simulacionEspacio.radioActual = simulacionEspacio.modoTrayectoria === "ORBITA"
            ? simulacionEspacio.radioInicio
            : lerp(simulacionEspacio.radioInicio, simulacionEspacio.radioObjetivo, progreso);

        simulacionEspacio.radioMaximo = Math.max(simulacionEspacio.radioMaximo, simulacionEspacio.radioActual);
        simulacionEspacio.radioMinimo = Math.min(simulacionEspacio.radioMinimo, simulacionEspacio.radioActual);

        let deltaAngulo = simulacionEspacio.anguloActual - simulacionEspacio.anguloAnterior;
        if (deltaAngulo > Math.PI) deltaAngulo -= 2 * Math.PI;
        if (deltaAngulo < -Math.PI) deltaAngulo += 2 * Math.PI;
        simulacionEspacio.anguloAcumulado += Math.abs(deltaAngulo);
        simulacionEspacio.anguloAnterior = simulacionEspacio.anguloActual;
        simulacionEspacio.vueltas = simulacionEspacio.anguloAcumulado / (2 * Math.PI);

        if (progreso >= 1 && !simulacionEspacio.resultadoPendiente) {
            simulacionEspacio.resultadoPendiente = simulacionEspacio.resultadoEsperado;
            if (simulacionEspacio.resultadoEsperado === "ACIERTO") {
                simulacionEspacio.estado = "ORBITA";
                simulacionEspacio.motivoPendiente = "orbita_5s";
            } else if (simulacionEspacio.resultadoEsperado === "BAJO") {
                simulacionEspacio.estado = "IMPACTO";
                simulacionEspacio.motivoPendiente = "caida_lineal";
            } else {
                simulacionEspacio.estado = "ESCAPE";
                simulacionEspacio.motivoPendiente = "ascenso_lineal";
            }
            if (puedeConcluir) {
                finalizarResultadoEspacio(simulacionEspacio.resultadoPendiente, simulacionEspacio.motivoPendiente);
                return;
            }
        }

        if (simulacionEspacio.acumuladoRenderMs >= simulacionEspacio.frameRenderMs) {
            actualizarPosicionSateliteEspacio(simulacionEspacio.anguloActual, simulacionEspacio.radioActual);
            simulacionEspacio.acumuladoRenderMs %= simulacionEspacio.frameRenderMs;
        }

        if (!simulacionEspacio.resultadoPendiente && tiempoVisibleMs >= CONFIG.FISICA.TIEMPO_FALLBACK_MS) {
            finalizarResultadoEspacio(simulacionEspacio.resultadoEsperado, "fallback_5s_sin_evento");
            return;
        }

        rafEspacio = requestAnimationFrame(loop);
    };

    rafEspacio = requestAnimationFrame(loop);
}

// Precarga de recursos
function obtenerRutasRecursos() {
    const rutas = [
        "img/dispositivos/televisor.png", "img/dispositivos/panel.png",
        "img/lanzamiento/fondo.png", "img/lanzamiento/tirachinas.png",
        "img/lanzamiento/base-banda-tirachinas.png", "img/espacio/zoom-satelite.png",
        "img/pantallas/main-menu.png", "img/pantallas/partida-ganada.png",
        "img/pantallas/satelite-cayendo.png", "img/pantallas/satelite-perdiendose.png"
    ];
    for (let i = 0; i <= 4; i++) rutas.push(`img/lanzamiento/satelite-${i}.png`);
    for (let i = 1; i <= 4; i++) {
        rutas.push(`img/lanzamiento/base-banda-${i}.png`);
        rutas.push(`img/lanzamiento/banda-izq-${i}.png`);
        rutas.push(`img/lanzamiento/banda-der-${i}.png`);
        rutas.push(`img/espacio/espacio-${i}.png`);
    }
    for (let i = 0; i <= 9; i++) rutas.push(`img/transicion/${i}.png`);
    for (let i = 1; i <= 12; i++) rutas.push(`img/espacio/tierra${i}.png`);
    return [...new Set(rutas)];
}

function precargarImagen(src) {
    return new Promise(resolve => { const img = new Image(); img.onload = img.onerror = resolve; img.src = src; });
}

async function precargarRecursosIniciales() {
    if (recursosPrecargados) return;
    setBotonJugarCargando(true);
    const inicio = Date.now();
    await Promise.all(obtenerRutasRecursos().map(precargarImagen));
    const transcurrido = Date.now() - inicio;
    if (transcurrido < 300) await new Promise(r => setTimeout(r, 300 - transcurrido));
    recursosPrecargados = true;
    setBotonJugarCargando(false);
}

// Paneles UI
function mostrarPanelMenu() {
    mostrarElemento(CONFIG.IDs.TITULO_MENU);
    mostrarElemento(CONFIG.IDs.DESCRIPCION);
    mostrarElemento(CONFIG.IDs.DIFICULTAD);
    mostrarElemento(CONFIG.IDs.ACCIONES_MENU);
    ocultarElemento(CONFIG.IDs.FORM_INGRESO);
    ocultarElemento(CONFIG.IDs.HISTORIAL);
    ocultarElemento(CONFIG.IDs.ACCIONES_FINAL);
    ocultarElemento(CONFIG.IDs.ZONA_MENSAJES);
    limpiarMensajes();
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

// Escenas visuales
function mostrarEscenaMenu(preservarTransicion = false) {
    faseJuego = "menu";
    ocultarEscenasVisuales(preservarTransicion);
    asignarImagenPantalla("main-menu.png");
}

function mostrarEscenaLanzamiento(preservarTransicion = false) {
    faseJuego = "juego";
    ocultarEscenasVisuales(preservarTransicion);
    mostrarGrupo([CONFIG.IDs.FONDO, CONFIG.IDs.TIRACHINAS, CONFIG.IDs.BASE_TIRACHINAS, CONFIG.IDs.SATELITE, CONFIG.IDs.BASE_BANDA]);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_IZQ, CONFIG.TOTAL_FRAMES);
    actualizarBandas(CONFIG.PREFIJOS.BANDA_DER, CONFIG.TOTAL_FRAMES);
    establecerFrameLanzamiento(CONFIG.TOTAL_FRAMES);
}

function mostrarEscenaEspacio(fuerzaUsuario, resultadoEsperado, onResultadoEspacio, preservarTransicion = false) {
    faseJuego = "espacio";
    ocultarEscenasVisuales(preservarTransicion);
    iniciarAnimacionFondoEspacio();
    iniciarAnimacionTierra();
    mostrarElemento(CONFIG.IDs.ZOOM_SATELITE);
    iniciarSimulacionEspacio(fuerzaUsuario, resultadoEsperado, onResultadoEspacio);
}

function mostrarEscenaFinal(tipoResultado, preservarTransicion = false) {
    faseJuego = "final";
    ocultarEscenasVisuales(preservarTransicion);
    const resultado = CONFIG.RESULTADOS[tipoResultado];
    if (resultado) {
        mostrarGrupo([CONFIG.IDs.FONDO_PANEL]);
        asignarImagenPantalla(resultado.imagen);
    }
}

// Animaciones
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

function lanzarSecuenciaCompleta(fuerzaUsuario, resultadoEsperado, onFinish) {
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
                mostrarEscenaEspacio(fuerzaUsuario, resultadoEsperado, (resultadoEspacio) => {
                    animarTransicion(
                        () => {
                            ocultarGrupo(ELEMENTOS_ESPACIO);
                            mostrarEscenaFinal(resultadoEspacio, true);
                        },
                        () => {
                            juegoEnAnimacion = false;
                            marcarPanelInactivo(false);
                            if (onFinish) onFinish(resultadoEspacio);
                        }
                    );
                }, true);
            },
            () => {}
        );
    }, CONFIG.TIEMPO_ANTES_TRANSICION_MS);
}

// Flujo de partida
function generarNumeroSecreto() { return Math.floor(Math.random() * maximoActual) + 1; }
function resolverResultado(numeroUsuario) {
    if (numeroUsuario === numeroSecreto) return "ACIERTO";
    return numeroUsuario < numeroSecreto ? "BAJO" : "ALTO";
}
function obtenerNombreDificultad() {
    return dificultadActual === "FACIL" ? "Facil" : dificultadActual === "MEDIA" ? "Media" : "Dificil";
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

function irMenuPrincipal() { reiniciarComoRecarga(); }

function iniciarJuego() {
    if (!recursosPrecargados) return;
    prepararNuevaPartida();
    marcarPanelInactivo(false);
    ocultarElemento(CONFIG.IDs.TRANSICION);
    mostrarEscenaLanzamiento();
    mostrarPanelJuego();
    bloquearEntrada(false);
}

function cambiarDificultad() {
    const select = el(CONFIG.IDs.SELECT_DIFICULTAD);
    if (select) aplicarDificultad(select.value);
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
    const resultadoEsperado = resolverResultado(numeroUsuario);

    lanzarSecuenciaCompleta(numeroUsuario, resultadoEsperado, (resultadoEspacio) => {
        const mensajeEl = el(CONFIG.IDs.MENSAJE);
        const acerto = resultadoEspacio === "ACIERTO";
        const perdioPorIntentos = !acerto && intentos >= CONFIG.MAX_INTENTOS;

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
        if (mensajeEl) mensajeEl.textContent = CONFIG.RESULTADOS[resultadoEspacio].mensaje;
        bloquearEntrada(false);
        if (input) input.value = "";
    });
}

// Inicialización
function inicializarEventos() {
    el(CONFIG.IDs.SELECT_DIFICULTAD)?.addEventListener("change", cambiarDificultad);
    el(CONFIG.IDs.BTN_JUGAR)?.addEventListener("click", iniciarJuego);
    el(CONFIG.IDs.BTN_REINICIAR)?.addEventListener("click", iniciarJuego);
    el(CONFIG.IDs.BTN_MENU)?.addEventListener("click", irMenuPrincipal);
}

inicializarEventos();
reiniciarComoRecarga();
precargarRecursosIniciales();
