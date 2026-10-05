"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";

import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type EstadoSuscripcion = {
  suscrito: boolean;
  status: string;
  customer_id: string | null;
  subscription_id: string | null;
  plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  cancelacion_programada: boolean;
  ended_at: string | null;
  prueba_gratuita_disponible: boolean;
  prueba_gratuita_consumida_at: string | null;
  prueba_24h_inicio_at: string | null;
  prueba_24h_fin_at: string | null;
  prueba_24h_activa: boolean;
  prueba_24h_tests_usados: number;
  prueba_24h_tests_restantes: number;
  prueba_24h_simulacros_usados: number;
  prueba_24h_simulacros_restantes: number;
  prueba_24h_materiales_descargados: number;
  prueba_24h_materiales_restantes: number;
  historico_post_baja_dias: number;
  acceso_historico_hasta: string | null;
  acceso_historico_activo: boolean;
  pago_pendiente: boolean;
};

type Me = {
  id: string;
  email: string;
};

type Convocatoria = {
  id: number;
  puesto: string;
  numero: string;
  anio: number;
  codigo: string;
};

type Pregunta = {
  simulacro_pregunta_id: number;
  orden: number;
  parte_nombre: string | null;
  respuesta_usuario: string | null;
  seguridad_usuario: string | null;
  enunciado: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
};

type PreguntaCorregida = Pregunta & {
  respuesta_correcta: string;
  resultado: "ACIERTO" | "FALLO" | "NO_CONTESTADA";
};

type Resultado = {
  simulacro_id: number;
  total: number;
  contestadas: number;
  aciertos: number;
  fallos: number;
  no_contestadas: number;
  puntos: number;
  nota: number;
  tiempo_correccion_segundos: number;
};

type AcumuladoTema = {
  tema_id: number | null;
  parte: string;
  numero_tema: number;
  titulo: string;
  preguntas: number;
  contestadas: number;
  no_contestadas: number;
  aciertos: number;
  fallos: number;
  fallos_seguro: number;
  porcentaje_convocatoria: number;
  porcentaje_aciertos: number;
  porcentaje_fallos: number;
  porcentaje_no_contestadas: number;
  porcentaje_aciertos_contestadas: number;
};

type AcumuladoNorma = {
  norma: string;
  preguntas: number;
  contestadas: number;
  no_contestadas: number;
  aciertos: number;
  fallos: number;
  fallos_seguro: number;
  porcentaje_convocatoria: number;
  porcentaje_aciertos: number;
  porcentaje_fallos: number;
  porcentaje_no_contestadas: number;
  porcentaje_aciertos_contestadas: number;
};

type AcumuladoSeguridad = {
  codigo: "SEGURO" | "MENOS_SEGURO";
  seguridad: string;
  contestadas: number;
  aciertos: number;
  fallos: number;
  porcentaje_aciertos: number;
  porcentaje_fallos: number;
};

type ResultadoAcumulado = {
  convocatoria_id: number;
  tipo_prueba: "SIMULACRO" | "TEST";
  simulacros: number;
  simulacros_ids: number[];
  preguntas: number;
  contestadas: number;
  no_contestadas: number;
  aciertos: number;
  fallos: number;
  temas: AcumuladoTema[];
  normas: AcumuladoNorma[];
  seguridad: AcumuladoSeguridad[];
  firma_datos: string;
};

type PdfGenerado = {
  filename: string;
  content_base64: string;
};

type AnalisisRendimiento = {
  firma_datos: string;
  texto: string;
};

type SimulacroListado = {
  id: number;
  convocatoria_id: number;
  numero: number;
  fecha_generacion: string;
  total_preguntas: number;
  estado: "GENERADO" | "FINALIZADO";
  tipo_prueba: "SIMULACRO" | "TEST";
  es_prueba_gratuita: boolean;
  convocatoria_codigo: string | null;
  contestadas: number;
};

type TemaTest = {
  id: number;
  parte: string;
  numero_tema: number;
  titulo: string;
  tipo_contenido: string | null;
  disponibles: number;
};

type NormaTest = {
  norma_clave: string;
  norma_nombre: string;
  disponibles: number;
};


type NormaMaterial = {
  norma_id: number;
  nombre_canonico: string;
  id_fuente: string;
  articulos_corpus: number;
};

type TestCreado = {
  id: number;
  numero: number;
  total_solicitado: number;
  total_generado: number;
  avisos: string[];
};

type RespuestaLocal = {
  respuesta: string | null;
  seguridad: string | null;
};

type ChatModo = "CONVOCATORIA" | "GENERAL";

type ChatMensaje = {
  role: "user" | "assistant";
  content: string;
};

type ChatFuente = {
  tipo: string;
  tema?: string;
  titulo_tema?: string;
  norma?: string;
  articulo?: string;
  articulo_boe?: string;
  clave?: string;
  titulo?: string;
};

type ChatRespuesta = {
  respuesta: string;
  fuentes: ChatFuente[];
  modelo: string | null;
  modo: ChatModo;
};

const ORIGENES = [
  "A1", "A2", "C1", "C2",
  "AYTO-A1", "AYTO-A2", "AYTO-C1", "AYTO-C2",
] as const;
const FUENTES = ["REAL", "IA"] as const;

const SEGURIDADES = [
  ["SEGURO", "Seguro"],
  ["MENOS_SEGURO", "Menos seguro"],
] as const;

function formatearFechaSuscripcion(valor: string | null): string | null {
  if (!valor) return null;

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}


function formatearTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundosRestantes = total % 60;

  if (horas > 0) {
    return `${horas} h ${String(minutos).padStart(2, "0")} min ${String(
      segundosRestantes
    ).padStart(2, "0")} s`;
  }

  return `${minutos} min ${String(segundosRestantes).padStart(2, "0")} s`;
}

function CronometroCorreccion({
  inicioMs,
  tiempoPrevio,
}: {
  inicioMs: number;
  tiempoPrevio: number;
}) {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const sesion = Math.max(0, Math.floor((ahora - inicioMs) / 1000));
  return (
    <div style={{ fontWeight: 600, marginBottom: 14 }}>
      Tiempo transcurrido: {formatearTiempo(tiempoPrevio + sesion)}
    </div>
  );
}


function renderChatInlineMarkdown(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);

  return partes.map((parte, indice) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length >= 4) {
      return <strong key={indice}>{parte.slice(2, -2)}</strong>;
    }

    return <span key={indice}>{parte}</span>;
  });
}

function renderChatMarkdown(texto: string) {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const elementos: React.ReactNode[] = [];
  let indice = 0;

  while (indice < lineas.length) {
    const linea = lineas[indice].trim();

    if (!linea) {
      indice += 1;
      continue;
    }

    if (/^-\s+/.test(linea)) {
      const items: string[] = [];

      while (
        indice < lineas.length &&
        /^-\s+/.test(lineas[indice].trim())
      ) {
        items.push(lineas[indice].trim().replace(/^-\s+/, ""));
        indice += 1;
      }

      elementos.push(
        <ul key={`ul-${indice}`} style={{ margin: "8px 0 8px 22px" }}>
          {items.map((item, itemIndice) => (
            <li key={itemIndice} style={{ marginBottom: 4 }}>
              {renderChatInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(linea)) {
      const items: string[] = [];

      while (
        indice < lineas.length &&
        /^\d+\.\s+/.test(lineas[indice].trim())
      ) {
        items.push(
          lineas[indice].trim().replace(/^\d+\.\s+/, "")
        );
        indice += 1;
      }

      elementos.push(
        <ol key={`ol-${indice}`} style={{ margin: "8px 0 8px 22px" }}>
          {items.map((item, itemIndice) => (
            <li key={itemIndice} style={{ marginBottom: 4 }}>
              {renderChatInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    elementos.push(
      <p
        key={`p-${indice}`}
        style={{
          margin: "0 0 10px 0",
          lineHeight: 1.6,
        }}
      >
        {renderChatInlineMarkdown(linea)}
      </p>
    );
    indice += 1;
  }

  return elementos;
}


export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [pantallaPublica, setPantallaPublica] = useState< "LANDING" | "LOGIN" | "REGISTRO" | "RECUPERAR" | "NUEVA_PASSWORD" >("LANDING");
  const [email, setEmail] = useState("");
  const correoInput = useRef<HTMLInputElement>(null);
  const reenviando = useRef(false);
  const [esperaReenvio, setEsperaReenvio] = useState(0);
  const [password, setPassword] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [misSimulacros, setMisSimulacros] = useState<SimulacroListado[]>([]);
  const [misTests, setMisTests] = useState<SimulacroListado[]>([]);
  const [seccion, setSeccion] = useState<"INICIO" | "SIMULACROS" | "TESTS" | "CHAT" | "MATERIALES">("INICIO");
  const [tipoActivo, setTipoActivo] = useState<"SIMULACRO" | "TEST" | null>(null);
  const [convocatoriaSimulacroId, setConvocatoriaSimulacroId] = useState<number | null>(null);
  const [convocatoriaTestId, setConvocatoriaTestId] = useState<number | null>(null);
  const [modoTest, setModoTest] = useState<"TEMA" | "NORMA">("TEMA");
  const [numeroPreguntasTest, setNumeroPreguntasTest] = useState(10);
  const [temasTest, setTemasTest] = useState<TemaTest[]>([]);
  const [normasTest, setNormasTest] = useState<NormaTest[]>([]);
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [normasSeleccionadas, setNormasSeleccionadas] = useState<string[]>([]);
  const [simulacroId, setSimulacroId] = useState<number | null>(null);
  const [pruebaActivaEsGratuita, setPruebaActivaEsGratuita] = useState(false);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({});
  const [evaluarSeguridad, setEvaluarSeguridad] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mostrarCronometro, setMostrarCronometro] = useState(false);
  const [tiempoPrevioCorreccion, setTiempoPrevioCorreccion] = useState(0);
  const [inicioCorreccionMs, setInicioCorreccionMs] = useState<number | null>(null);
  const [correccion, setCorreccion] = useState<PreguntaCorregida[]>([]);
  const [vistaPrueba, setVistaPrueba] = useState<"RESUMEN" | "PREGUNTAS">("RESUMEN");
  const [mostrarCorreccionPantalla, setMostrarCorreccionPantalla] = useState(false);
  const [resultadoAcumulado, setResultadoAcumulado] = useState<ResultadoAcumulado | null>(null);
  const [analisisRendimiento, setAnalisisRendimiento] = useState<
    Record<string, AnalisisRendimiento>
  >({});
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!mensaje) return;

    const temporizador = window.setTimeout(() => {
      setMensaje("");
    }, 3000);

    return () => window.clearTimeout(temporizador);
  }, [mensaje]);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [checkoutRetorno, setCheckoutRetorno] = useState<"success" | "cancel" | null>(null);
  const [estadoSuscripcion, setEstadoSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [chatConvocatoriaId, setChatConvocatoriaId] = useState<number | null>(null);
  const [chatModo, setChatModo] = useState<ChatModo>("CONVOCATORIA");
  const [chatEntrada, setChatEntrada] = useState("");
  const [chatHistoriales, setChatHistoriales] = useState<
    Record<string, ChatMensaje[]>
  >({});

const [materialConvocatoriaId, setMaterialConvocatoriaId] = useState<number | null>(null);
const [normasMateriales, setNormasMateriales] = useState<NormaMaterial[]>([]);
const [materialNormaId, setMaterialNormaId] = useState<number | null>(null);
const [materialTipo, setMaterialTipo] = useState<
  "resumen" | "extracto" | "completo"
>("resumen");

  const modoHistoricoPostBaja = Boolean(
    estadoSuscripcion &&
      !estadoSuscripcion.suscrito &&
      estadoSuscripcion.acceso_historico_activo
  );

  const modoSoloLecturaActivo = Boolean(
    modoHistoricoPostBaja && !pruebaActivaEsGratuita
  );

  function itemSoloLectura(item: SimulacroListado): boolean {
    return Boolean(modoHistoricoPostBaja && !item.es_prueba_gratuita);
  }

  const actividadReciente = useMemo(
    () =>
      [...misSimulacros, ...misTests]
        .sort(
          (a, b) =>
            new Date(b.fecha_generacion).getTime() -
            new Date(a.fecha_generacion).getTime()
        )
        .slice(0, 4),
    [misSimulacros, misTests]
  );

  const totalPruebas = misSimulacros.length + misTests.length;
  const totalPendientes = [...misSimulacros, ...misTests].filter(
    (item) => item.estado !== "FINALIZADO"
  ).length;
  const totalCorregidas = totalPruebas - totalPendientes;

  const prueba24hActiva = Boolean(
    estadoSuscripcion &&
      !estadoSuscripcion.suscrito &&
      estadoSuscripcion.prueba_24h_activa
  );

  const inicialUsuario = (me?.email?.trim()?.[0] ?? "O").toUpperCase();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get("checkout");

    if (params.get("acceso") === "login") {
      setPantallaPublica("LOGIN");
      params.delete("acceso");
      const consulta = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${consulta ? `?${consulta}` : ""}${window.location.hash}`);
    }

    if (estado === "success" || estado === "cancel") {
      setCheckoutRetorno(estado);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargandoSesion(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPantallaPublica("NUEVA_PASSWORD");
        setError("");
        setMensaje("");
      }

      setSession(nextSession);
      if (!nextSession) {
        setMe(null);
        setEstadoSuscripcion(null);
        setConvocatorias([]);
        setMisSimulacros([]);
        setMisTests([]);
        setAnalisisRendimiento({});
        setChatHistoriales({});
        setChatEntrada("");
        limpiarSimulacro();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;

    let cancelado = false;

    // La identidad y la suscripción son datos críticos de cabecera. Se cargan
    // aparte para que una consulta lenta de simulacros, tests o convocatorias
    // no deje la cabecera en un estado aparente de usuario anónimo.
    Promise.all([
      apiFetch<Me>("api/v1/me"),
      apiFetch<EstadoSuscripcion>("api/v1/billing/subscription"),
    ])
      .then(([usuario, suscripcion]) => {
        if (cancelado) return;
        setMe(usuario);
        setEstadoSuscripcion(suscripcion);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    Promise.all([
      apiFetch<Convocatoria[]>("api/v1/convocatorias"),
      apiFetch<SimulacroListado[]>("api/v1/simulacros"),
      apiFetch<SimulacroListado[]>("api/v1/tests"),
    ])
      .then(([lista, guardados, tests]) => {
        if (cancelado) return;
        setConvocatorias(lista);
        setMisSimulacros(guardados);
        setMisTests(tests);
        if (convocatoriaSimulacroId === null && lista.length > 0) {
          setConvocatoriaSimulacroId(lista[0].id);
        }
        if (convocatoriaTestId === null && lista.length > 0) {
          setConvocatoriaTestId(lista[0].id);
        }
        if (chatConvocatoriaId === null && lista.length > 0) {
          setChatConvocatoriaId(lista[0].id);
        }
        if (materialConvocatoriaId === null && lista.length > 0) {
          setMaterialConvocatoriaId(lista[0].id);
        }
        setError("");
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelado = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || convocatoriaTestId === null) return;

    const query = FUENTES
      .map((f) => `fuente=${encodeURIComponent(f)}`)
      .join("&");

    if (!query) {
      setTemasTest([]);
      setNormasTest([]);
      return;
    }

    Promise.all([
      apiFetch<TemaTest[]>(
        `api/v1/convocatorias/${convocatoriaTestId}/tests/temas?${query}`
      ),
      apiFetch<NormaTest[]>(
        `api/v1/convocatorias/${convocatoriaTestId}/tests/normas?${query}`
      ),
    ])
      .then(([temas, normas]) => {
        setTemasTest(temas);
        setNormasTest(normas);
        setTemasSeleccionados((actual) =>
          actual.filter((id) => temas.some((t) => t.id === id))
        );
        setNormasSeleccionadas((actual) =>
          actual.filter((clave) =>
            normas.some((n) => n.norma_clave === clave)
          )
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [session, convocatoriaTestId]);


useEffect(() => {
  if (
    !session ||
    !estadoSuscripcion ||
    (!estadoSuscripcion.suscrito && !estadoSuscripcion.prueba_24h_activa) ||
    materialConvocatoriaId === null ||
    modoHistoricoPostBaja
  ) {
    setNormasMateriales([]);
    setMaterialNormaId(null);
    return;
  }

  apiFetch<NormaMaterial[]>(
    `api/v1/convocatorias/${materialConvocatoriaId}/materiales/normas`
  )
    .then((normas) => {
      setNormasMateriales(normas);
      setMaterialNormaId((actual) => {
        if (
          actual !== null &&
          normas.some((norma) => norma.norma_id === actual)
        ) {
          return actual;
        }
        return normas.length > 0 ? normas[0].norma_id : null;
      });
      setError("");
    })
    .catch((err) => {
      setNormasMateriales([]);
      setMaterialNormaId(null);
      setError(err instanceof Error ? err.message : String(err));
    });
}, [session, materialConvocatoriaId, modoHistoricoPostBaja]);


  function limpiarSimulacro() {
    setPreguntas([]);
    setRespuestas({});
    setEvaluarSeguridad(false);
    setResultado(null);
    setCorreccion([]);
    setResultadoAcumulado(null);
    setSimulacroId(null);
    setTipoActivo(null);
    setPruebaActivaEsGratuita(false);
    setMostrarCronometro(false);
    setTiempoPrevioCorreccion(0);
    setInicioCorreccionMs(null);
    setVistaPrueba("RESUMEN");
    setMostrarCorreccionPantalla(false);
  }


  function iniciarTiempoCorreccion(tiempoPrevio = 0) {
    setTiempoPrevioCorreccion(Math.max(0, Math.floor(tiempoPrevio)));
    setInicioCorreccionMs(Date.now());
    setMostrarCronometro(false);
  }


  async function recargarSimulacros() {
    const guardados = await apiFetch<SimulacroListado[]>("api/v1/simulacros");
    setMisSimulacros(guardados);
  }

  async function recargarTests() {
    const guardados = await apiFetch<SimulacroListado[]>("api/v1/tests");
    setMisTests(guardados);
  }

  async function recargarListaActiva() {
    if (tipoActivo === "TEST") {
      await recargarTests();
    } else {
      await recargarSimulacros();
    }
  }

  function inicializarRespuestas(lista: Pregunta[]) {
    const iniciales: Record<number, RespuestaLocal> = {};
    lista.forEach((p) => {
      iniciales[p.simulacro_pregunta_id] = {
        respuesta: p.respuesta_usuario,
        seguridad: p.seguridad_usuario,
      };
    });
    setRespuestas(iniciales);
    setEvaluarSeguridad(
      lista.some((p) => p.seguridad_usuario !== null)
    );
  }

  async function abrirSimulacro(simulacro: SimulacroListado) {
    setOcupado(true);
    setAccionEnCurso(
      simulacro.estado === "FINALIZADO"
        ? "Abriendo corrección..."
        : "Recuperando simulacro..."
    );
    setError("");
    setMensaje("");
    limpiarSimulacro();
    setTipoActivo(simulacro.tipo_prueba);
    setPruebaActivaEsGratuita(Boolean(simulacro.es_prueba_gratuita));

    try {
      if (simulacro.estado === "FINALIZADO") {
        const [res, corr, acumulado] = await Promise.all([
          apiFetch<Resultado>(
            `api/v1/simulacros/${simulacro.id}/resultado`
          ),
          apiFetch<PreguntaCorregida[]>(
            `api/v1/simulacros/${simulacro.id}/correccion`
          ),
          apiFetch<ResultadoAcumulado>(
            `api/v1/simulacros/${simulacro.id}/acumulado`
          ),
        ]);
        setSimulacroId(simulacro.id);
        setResultado(res);
        setTiempoPrevioCorreccion(res.tiempo_correccion_segundos);
        setInicioCorreccionMs(null);
        setMostrarCronometro(false);
        setCorreccion(corr);
        setResultadoAcumulado(acumulado);
        setMostrarCorreccionPantalla(false);
      } else {
        const [lista, tiempo] = await Promise.all([
          apiFetch<Pregunta[]>(
            `api/v1/simulacros/${simulacro.id}/preguntas`
          ),
          apiFetch<{ tiempo_correccion_segundos: number }>(
            `api/v1/simulacros/${simulacro.id}/tiempo-correccion`
          ),
        ]);
        setSimulacroId(simulacro.id);
        setPreguntas(lista);
        inicializarRespuestas(lista);
        if (itemSoloLectura(simulacro)) {
          setTiempoPrevioCorreccion(tiempo.tiempo_correccion_segundos);
          setInicioCorreccionMs(null);
          setMostrarCronometro(false);
        } else {
          iniciarTiempoCorreccion(tiempo.tiempo_correccion_segundos);
        }
        setVistaPrueba("RESUMEN");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  function salirDePrueba(destino: "INICIO" | "LISTA") {
    const tipo = tipoActivo;
    limpiarSimulacro();
    setMensaje("");
    setError("");

    if (destino === "INICIO") {
      setSeccion("INICIO");
    } else {
      setSeccion(tipo === "TEST" ? "TESTS" : "SIMULACROS");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  async function modificarRespuestas() {
    if (simulacroId === null) return;
    if (modoSoloLecturaActivo) {
      setError(
        "Tras la baja, el histórico está disponible únicamente en modo lectura y para descarga de PDFs."
      );
      return;
    }

    setOcupado(true);
    setAccionEnCurso("Preparando modificación de respuestas...");
    setError("");
    setMensaje("");

    try {
      const [lista, tiempo] = await Promise.all([
        apiFetch<Pregunta[]>(
          `api/v1/simulacros/${simulacroId}/preguntas`
        ),
        apiFetch<{ tiempo_correccion_segundos: number }>(
          `api/v1/simulacros/${simulacroId}/tiempo-correccion`
        ),
      ]);

      setPreguntas(lista);
      inicializarRespuestas(lista);
      setResultado(null);
      setCorreccion([]);
      setResultadoAcumulado(null);
      iniciarTiempoCorreccion(tiempo.tiempo_correccion_segundos);
      setVistaPrueba("PREGUNTAS");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function eliminarGuardado(simulacro: SimulacroListado) {
    const nombre = simulacro.tipo_prueba === "TEST" ? "test" : "simulacro";
    const confirmar = window.confirm(
      `¿Eliminar definitivamente el ${nombre} nº ${simulacro.numero}?`
    );
    if (!confirmar) return;

    setOcupado(true);
    setAccionEnCurso(`Eliminando simulacro ${simulacro.numero}...`);
    setError("");
    setMensaje("");

    try {
      await apiFetch<void>(`api/v1/simulacros/${simulacro.id}`, {
        method: "DELETE",
      });
      if (simulacro.tipo_prueba === "TEST") {
        await recargarTests();
      } else {
        await recargarSimulacros();
      }
      setMensaje(
        `${simulacro.tipo_prueba === "TEST" ? "Test" : "Simulacro"} nº ${simulacro.numero} eliminado.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  function claveAnalisisActual(): string | null {
    if (!resultadoAcumulado) return null;
    return `${resultadoAcumulado.tipo_prueba}:${resultadoAcumulado.convocatoria_id}`;
  }

  function analisisActual(): AnalisisRendimiento | null {
    const clave = claveAnalisisActual();
    if (!clave || !resultadoAcumulado) return null;

    const cache = analisisRendimiento[clave];
    if (!cache) return null;

    return cache.firma_datos === resultadoAcumulado.firma_datos
      ? cache
      : null;
  }


function descargarPdfGenerado(pdf: PdfGenerado) {
  const binario = atob(pdf.content_base64);
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = pdf.filename;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}


async function descargarMaterialPdf() {
  if (materialConvocatoriaId === null || materialNormaId === null) return;

  setOcupado(true);
  setAccionEnCurso("Preparando material de estudio...");
  setError("");
  setMensaje("");

  try {
    const pdf = await apiFetch<PdfGenerado>(
      `api/v1/convocatorias/${materialConvocatoriaId}/materiales/normas/${materialNormaId}/pdf?tipo=${materialTipo}`
    );
    descargarPdfGenerado(pdf);
    await actualizarSuscripcion();
    setMensaje("Material de estudio descargado.");
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setOcupado(false);
    setAccionEnCurso(null);
  }
}


  async function descargarPdfSoluciones() {
    if (simulacroId === null) return;

    setOcupado(true);
    setAccionEnCurso("Generando PDF de soluciones...");
    setError("");
    setMensaje("");

    try {
      const pdf = await apiFetch<PdfGenerado>(
        `api/v1/simulacros/${simulacroId}/pdf-soluciones`
      );

      const binario = atob(pdf.content_base64);
      const bytes = new Uint8Array(binario.length);

      for (let i = 0; i < binario.length; i += 1) {
        bytes[i] = binario.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = pdf.filename;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);
      setMensaje("PDF de soluciones generado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }


  async function descargarPdfPreguntas() {
    if (simulacroId === null) return;

    setOcupado(true);
    setAccionEnCurso("Generando PDF de preguntas...");
    setError("");
    setMensaje("");

    try {
      const pdf = await apiFetch<PdfGenerado>(
        `api/v1/simulacros/${simulacroId}/pdf-preguntas?incluir_seguridad=true`
      );

      const binario = atob(pdf.content_base64);
      const bytes = new Uint8Array(binario.length);

      for (let i = 0; i < binario.length; i += 1) {
        bytes[i] = binario.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = pdf.filename;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);
      setMensaje("PDF de preguntas generado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }


  async function generarAnalisisRendimiento() {
    if (simulacroId === null || !resultadoAcumulado) return;

    setOcupado(true);
    setAccionEnCurso("Analizando los resultados acumulados...");
    setError("");
    setMensaje("");

    try {
      const analisis = await apiFetch<AnalisisRendimiento>(
        `api/v1/simulacros/${simulacroId}/analisis-rendimiento`,
        { method: "POST" }
      );

      const clave = `${resultadoAcumulado.tipo_prueba}:${resultadoAcumulado.convocatoria_id}`;
      setAnalisisRendimiento((actual) => ({
        ...actual,
        [clave]: analisis,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  function renderInlineMarkdown(texto: string) {
    const partes = texto.split(/(\*\*[^*]+\*\*)/g);

    return partes.map((parte, indice) => {
      if (parte.startsWith("**") && parte.endsWith("**")) {
        return <strong key={indice}>{parte.slice(2, -2)}</strong>;
      }

      return <span key={indice}>{parte}</span>;
    });
  }

  function renderAnalisisRendimiento(texto: string) {
    return texto.split("\n").map((linea, indice) => {
      const textoLinea = linea.trim();

      if (!textoLinea) {
        return <div key={indice} style={{ height: 8 }} />;
      }

      if (textoLinea.startsWith("### ")) {
        return (
          <h3 key={indice} style={{ marginTop: 22, marginBottom: 10 }}>
            {renderInlineMarkdown(textoLinea.slice(4))}
          </h3>
        );
      }

      const numero = textoLinea.match(/^(\d+)\.\s+(.*)$/);
      if (numero) {
        return (
          <p key={indice} style={{ margin: "8px 0 8px 18px" }}>
            <strong>{numero[1]}.</strong>{" "}
            {renderInlineMarkdown(numero[2])}
          </p>
        );
      }

      if (textoLinea.startsWith("- ")) {
        return (
          <p key={indice} style={{ margin: "6px 0 6px 22px" }}>
            • {renderInlineMarkdown(textoLinea.slice(2))}
          </p>
        );
      }

      return (
        <p key={indice} style={{ margin: "8px 0", lineHeight: 1.55 }}>
          {renderInlineMarkdown(textoLinea)}
        </p>
      );
    });
  }


  function claveChat(
    convocatoriaId: number | null = chatConvocatoriaId,
    modo: ChatModo = chatModo
  ): string | null {
    if (convocatoriaId === null) return null;
    return `${convocatoriaId}:${modo}`;
  }

  function mensajesChatActuales(): ChatMensaje[] {
    const clave = claveChat();
    return clave ? chatHistoriales[clave] ?? [] : [];
  }

  function limpiarChatActual() {
    const clave = claveChat();
    if (!clave) return;

    setChatHistoriales((actual) => ({
      ...actual,
      [clave]: [],
    }));
    setChatEntrada("");
    setError("");
    setMensaje("");
    setOcupado(false);
    setAccionEnCurso(null);
  }

  async function enviarChat(event: FormEvent) {
    event.preventDefault();

    if (chatConvocatoriaId === null) {
      setError("Selecciona una convocatoria para el chat.");
      return;
    }

    const pregunta = chatEntrada.trim().replace(/\s+/g, " ");
    if (!pregunta) return;

    const clave = claveChat();
    if (!clave) return;

    const previos = chatHistoriales[clave] ?? [];
    const mensajeUsuario: ChatMensaje = {
      role: "user",
      content: pregunta,
    };

    setChatHistoriales((actual) => ({
      ...actual,
      [clave]: [...(actual[clave] ?? []), mensajeUsuario],
    }));
    setChatEntrada("");
    setOcupado(true);
    setAccionEnCurso(
      chatModo === "CONVOCATORIA"
        ? "Consultando las fuentes disponibles..."
        : "Generando una respuesta de conocimiento general..."
    );
    setError("");
    setMensaje("");

    try {
      const resultadoChat = await apiFetch<ChatRespuesta>("api/v1/chat", {
        method: "POST",
        body: JSON.stringify({
          convocatoria_id: chatConvocatoriaId,
          pregunta,
          mensajes_previos: previos,
          modo: chatModo,
        }),
      });

      const mensajeAsistente: ChatMensaje = {
        role: "assistant",
        content: resultadoChat.respuesta,
      };

      setChatHistoriales((actual) => ({
        ...actual,
        [clave]: [...(actual[clave] ?? []), mensajeAsistente],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function actualizarSuscripcion() {
    try {
      const estado = await apiFetch<EstadoSuscripcion>(
        "api/v1/billing/subscription"
      );
      setEstadoSuscripcion(estado);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (
      !session ||
      !estadoSuscripcion ||
      estadoSuscripcion.suscrito ||
      !estadoSuscripcion.prueba_24h_activa ||
      !estadoSuscripcion.prueba_24h_fin_at
    ) {
      return;
    }

    const finMs = new Date(estadoSuscripcion.prueba_24h_fin_at).getTime();
    if (!Number.isFinite(finMs)) return;

    const actualizarAlCaducar = () => {
      void actualizarSuscripcion();
    };
    const esperaMs = finMs - Date.now();

    if (esperaMs <= 0) {
      actualizarAlCaducar();
      return;
    }

    const temporizador = window.setTimeout(
      actualizarAlCaducar,
      Math.min(esperaMs + 250, 2_147_483_647)
    );

    return () => window.clearTimeout(temporizador);
  }, [
    session,
    estadoSuscripcion?.suscrito,
    estadoSuscripcion?.prueba_24h_activa,
    estadoSuscripcion?.prueba_24h_fin_at,
  ]);

  async function abrirCheckout() {
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Abriendo pago seguro de Stripe...");

    try {
      const checkout = await apiFetch<{ id: string; url: string }>(
        "api/v1/billing/checkout",
        { method: "POST" }
      );
      window.location.assign(checkout.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function abrirPortalSuscripcion() {
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Abriendo gestión de suscripción...");

    try {
      const portal = await apiFetch<{ url: string }>(
        "api/v1/billing/portal",
        { method: "POST" }
      );
      window.location.assign(portal.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  useEffect(() => {
    if (esperaReenvio <= 0) return;
    const temporizador = window.setTimeout(() => setEsperaReenvio((valor) => valor - 1), 1000);
    return () => window.clearTimeout(temporizador);
  }, [esperaReenvio]);

  async function reenviarConfirmacion() {
    if (ocupado || reenviando.current || esperaReenvio > 0) return;
    if (!correoInput.current?.reportValidity()) return;

    reenviando.current = true;
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Solicitando correo de confirmación...");
    setEsperaReenvio(60);

    try {
      const { error: authError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (authError) {
        setError(authError.status === 429
          ? "Se han solicitado demasiados correos. Espera unos minutos antes de volver a intentarlo."
          : "No se ha podido solicitar el correo de confirmación. Inténtalo de nuevo más tarde.");
        return;
      }
      setMensaje("Si esta dirección tiene un registro pendiente de confirmación, recibirás un nuevo correo. Revisa la bandeja de entrada y las carpetas Spam, Correo no deseado o Promociones.");
    } catch {
      setError("No se ha podido conectar para solicitar el correo. Inténtalo de nuevo más tarde.");
    } finally {
      reenviando.current = false;
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function iniciarSesion(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Iniciando sesión...");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setOcupado(false);
    setAccionEnCurso(null);

    if (authError) {
      setError(authError.code === "email_not_confirmed"
        ? "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada y Spam o Correo no deseado. Si no encuentras el mensaje, solicita el reenvío de confirmación."
        : authError.message);
      return;
    }

    setPassword("");
  }

  async function crearCuenta(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Creando cuenta...");

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setOcupado(false);
    setAccionEnCurso(null);

    if (authError) {
      setError(authError.message);
      return;
    }

    setPassword("");

    if (!data.session) {
      setMensaje(
        `Revisa tu correo para completar el registro en Tu Coach. Abre el mensaje enviado a ${email.trim()} y pulsa «Confirmar mi cuenta». Si no lo encuentras, revisa las carpetas Spam, Correo no deseado o Promociones. Después de confirmar tu correo, podrás iniciar sesión.`
      );
      setPantallaPublica("LOGIN");
    }
  }

  async function solicitarRecuperacion(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMensaje("");
    setOcupado(true);
    setAccionEnCurso("Enviando instrucciones...");

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    );

    setOcupado(false);
    setAccionEnCurso(null);

    if (authError) {
      setError("No se ha podido enviar el correo de recuperación. Inténtalo de nuevo.");
      return;
    }

    setMensaje(
      "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña."
    );
  }

  async function cambiarPassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (nuevaPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setOcupado(true);
    setAccionEnCurso("Guardando nueva contraseña...");

    const { error: authError } = await supabase.auth.updateUser({
      password: nuevaPassword,
    });

    setOcupado(false);
    setAccionEnCurso(null);

    if (authError) {
      setError("No se ha podido cambiar la contraseña. Solicita de nuevo el enlace de recuperación si es necesario.");
      return;
    }

    setNuevaPassword("");
    setConfirmarPassword("");
    setPassword("");
    await supabase.auth.signOut();
    setMensaje("Contraseña cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.");
    setPantallaPublica("LOGIN");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  function toggle(
    valor: string,
    seleccion: string[],
    setter: (x: string[]) => void
  ) {
    setter(
      seleccion.includes(valor)
        ? seleccion.filter((x) => x !== valor)
        : [...seleccion, valor]
    );
  }

  function establecerRespuesta(id: number, respuesta: string | null) {
    setRespuestas((actual) => {
      const previo = actual[id] ?? { respuesta: null, seguridad: null };
      return {
        ...actual,
        [id]: {
          respuesta,
          seguridad: respuesta === null ? null : previo.seguridad,
        },
      };
    });
  }

  function establecerSeguridad(id: number, seguridad: string | null) {
    setRespuestas((actual) => {
      const previo = actual[id] ?? { respuesta: null, seguridad: null };
      return {
        ...actual,
        [id]: {
          ...previo,
          seguridad,
        },
      };
    });
  }

  function cambiarEvaluacionSeguridad(activada: boolean) {
    setEvaluarSeguridad(activada);
    if (!activada) {
      setRespuestas((actual) => {
        const siguientes: Record<number, RespuestaLocal> = {};
        for (const [id, respuesta] of Object.entries(actual)) {
          siguientes[Number(id)] = { ...respuesta, seguridad: null };
        }
        return siguientes;
      });
    }
  }

  async function crear(convocatoriaId: number) {
    setError("");
    setMensaje("");
    limpiarSimulacro();
    setOcupado(true);
    setAccionEnCurso("Creando simulacro...");

    try {
      const creado = await apiFetch<{ id: number }>("api/v1/simulacros", {
        method: "POST",
        body: JSON.stringify({
          convocatoria_id: convocatoriaId,
          origenes: [...ORIGENES],
          fuentes: [...FUENTES],
        }),
      });

      const lista = await apiFetch<Pregunta[]>(
        `api/v1/simulacros/${creado.id}/preguntas`
      );

      setTipoActivo("SIMULACRO");
      setPruebaActivaEsGratuita(!estadoSuscripcion?.suscrito);
      setSimulacroId(creado.id);
      setPreguntas(lista);
      inicializarRespuestas(lista);
      iniciarTiempoCorreccion(0);
      setVistaPrueba("RESUMEN");
      await recargarSimulacros();
      await actualizarSuscripcion();
      setMensaje(
        `Simulacro ${creado.id} creado correctamente: ${lista.length} preguntas.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function crearTest() {
    if (convocatoriaTestId === null) {
      setError("Selecciona una convocatoria.");
      return;
    }
    if (numeroPreguntasTest <= 0) {
      setError("El número de preguntas debe ser mayor que cero.");
      return;
    }
    if (modoTest === "TEMA" && temasSeleccionados.length === 0) {
      setError("Selecciona al menos un punto del temario.");
      return;
    }
    if (modoTest === "NORMA" && normasSeleccionadas.length === 0) {
      setError("Selecciona al menos una ley o norma.");
      return;
    }

    setOcupado(true);
    setAccionEnCurso("Creando test...");
    setError("");
    setMensaje("");
    limpiarSimulacro();
    setTipoActivo("TEST");

    try {
      const creado = await apiFetch<TestCreado>("api/v1/tests", {
        method: "POST",
        body: JSON.stringify({
          convocatoria_id: convocatoriaTestId,
          numero_preguntas: numeroPreguntasTest,
          modo_seleccion: modoTest,
          temas_seleccionados: temasSeleccionados,
          normas_seleccionadas: normasSeleccionadas,
          fuentes: [...FUENTES],
        }),
      });

      const lista = await apiFetch<Pregunta[]>(
        `api/v1/simulacros/${creado.id}/preguntas`
      );

      setPruebaActivaEsGratuita(!estadoSuscripcion?.suscrito);
      setSimulacroId(creado.id);
      setPreguntas(lista);
      inicializarRespuestas(lista);
      iniciarTiempoCorreccion(0);
      setVistaPrueba("RESUMEN");
      await recargarTests();
      await actualizarSuscripcion();

      const aviso =
        creado.avisos.length > 0 ? ` ${creado.avisos.join(" ")}` : "";
      setMensaje(
        `Test nº ${creado.numero} creado con ${creado.total_generado} preguntas.${aviso}`
      );
    } catch (err) {
      limpiarSimulacro();
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  function payloadRespuestas() {
    return preguntas.map((p) => {
      const local = respuestas[p.simulacro_pregunta_id] ?? {
        respuesta: null,
        seguridad: null,
      };
      return {
        simulacro_pregunta_id: p.simulacro_pregunta_id,
        respuesta: local.respuesta,
        seguridad:
          evaluarSeguridad && local.respuesta ? local.seguridad : null,
      };
    });
  }

  function validarSeguridad(): string | null {
    if (!evaluarSeguridad) return null;

    const pendientes = preguntas
      .filter((p) => {
        const local = respuestas[p.simulacro_pregunta_id];
        return Boolean(local?.respuesta && !local.seguridad);
      })
      .map((p) => p.orden);

    if (pendientes.length === 0) return null;

    return `Falta indicar el nivel de seguridad en ${pendientes.length === 1 ? "la pregunta" : "las preguntas"}: ${pendientes.join(", ")}.`;
  }

  async function guardar() {
    if (simulacroId === null) return;

    const validacion = validarSeguridad();
    if (validacion) {
      setError(validacion);
      return;
    }

    setOcupado(true);
    setAccionEnCurso("Guardando respuestas...");
    setError("");
    setMensaje("");

    try {
      await apiFetch<void>(
        `api/v1/simulacros/${simulacroId}/respuestas`,
        {
          method: "PUT",
          body: JSON.stringify({ respuestas: payloadRespuestas() }),
        }
      );
      await recargarListaActiva();
      setMensaje("Respuestas guardadas correctamente.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  async function calificar() {
    if (simulacroId === null) return;

    const validacion = validarSeguridad();
    if (validacion) {
      setError(validacion);
      return;
    }

    setOcupado(true);
    setAccionEnCurso("Guardando y calificando simulacro...");
    setError("");
    setMensaje("");

    try {
      await apiFetch<void>(
        `api/v1/simulacros/${simulacroId}/respuestas`,
        {
          method: "PUT",
          body: JSON.stringify({ respuestas: payloadRespuestas() }),
        }
      );

      const segundosSesion =
        inicioCorreccionMs === null
          ? 0
          : Math.max(0, Math.floor((Date.now() - inicioCorreccionMs) / 1000));

      const res = await apiFetch<Resultado>(
        `api/v1/simulacros/${simulacroId}/finalizar?segundos_adicionales=${segundosSesion}`,
        { method: "POST" }
      );

      const [corr, acumulado] = await Promise.all([
        apiFetch<PreguntaCorregida[]>(
          `api/v1/simulacros/${simulacroId}/correccion`
        ),
        apiFetch<ResultadoAcumulado>(
          `api/v1/simulacros/${simulacroId}/acumulado`
        ),
      ]);

      setResultado(res);
      setTiempoPrevioCorreccion(res.tiempo_correccion_segundos);
      setInicioCorreccionMs(null);
      setMostrarCronometro(false);
      setCorreccion(corr);
      setResultadoAcumulado(acumulado);
      await recargarListaActiva();
      setMensaje(`${tipoActivo === "TEST" ? "Test" : "Simulacro"} calificado correctamente.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
      setAccionEnCurso(null);
    }
  }

  if (cargandoSesion) {
    return <main className="page">Comprobando sesión...</main>;
  }

  if (session && pantallaPublica === "NUEVA_PASSWORD") {
    return (
      <main className="auth-shell">
        <button
          type="button"
          className="auth-back"
          onClick={() => {
            setError("");
            setMensaje("");
            setNuevaPassword("");
            setConfirmarPassword("");
            setPantallaPublica("LANDING");
          }}
        >
          ← Volver a NetReto
        </button>

        <div className="auth-card">
          <span className="eyebrow">Restablecer contraseña</span>
          <h2>Elige una nueva contraseña</h2>
          <p className="muted">Introduce tu nueva contraseña y confírmala para completar el proceso.</p>

          {error && <div className="error">{error}</div>}
          {mensaje && <div className="success">{mensaje}</div>}

          <form onSubmit={cambiarPassword}>
            <label htmlFor="nueva-password">Nueva contraseña</label>
            <input
              id="nueva-password"
              type="password"
              autoComplete="new-password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              minLength={6}
              required
            />

            <label htmlFor="confirmar-password">Repite la nueva contraseña</label>
            <input
              id="confirmar-password"
              type="password"
              autoComplete="new-password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              minLength={6}
              required
            />

            <button type="submit" className="primary" disabled={ocupado}>
              {ocupado ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!session) {
    if (pantallaPublica === "LANDING") {
      return (
        <main className="public-site marketing-site">
          <header className="public-header">
            <button type="button" className="brand public-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Tu Coach, inicio">
              <span className="brand-mark" aria-hidden="true">TC</span>
              <span className="brand-copy">
            <span className="brand-name">Tu Coach</span>
            </span>
            </button>
            <nav className="public-nav" aria-label="Navegación pública">
              <a href="#preparacion">Preparación</a>
              <a href="#ayuntamientos">Ayuntamientos</a>
              <a href="#empleo-publico">Empleo público</a>
              <a href="#materiales">Materiales</a>
              <a href="#precio">Precio</a>
              <a href="/contacto">Contacto</a>
            </nav>
            <div className="public-header-actions">
              <button type="button" className="secondary compact-button" onClick={() => { setError(""); setMensaje(""); setPantallaPublica("LOGIN"); }}>Iniciar sesión</button>
              <button type="button" className="primary compact-button" onClick={() => { setError(""); setMensaje(""); setPantallaPublica("REGISTRO"); }}>Probar gratis</button>
            </div>
          </header>

          <section className="public-hero marketing-hero">
            <div className="public-hero-copy">
              <span className="public-kicker marketing-territory"><Image src="/logo-gva.png" alt="Generalitat Valenciana" width={20} height={41} /><span>Oposiciones administrativas · Comunitat Valenciana</span></span>
              <h1>Practica para tu oposición. Encuentra tu próxima oportunidad.</h1>
              <p>Simulacros y tests de convocatorias disponibles y modelos genéricos para ayuntamientos. Preparación y convocatorias de empleo público, en un mismo espacio.</p>
              <div className="public-hero-actions">
                <button type="button" className="primary public-cta" onClick={() => { setError(""); setMensaje(""); setPantallaPublica("REGISTRO"); }}>Probar gratis durante 24 horas</button>
                <a className="secondary public-cta marketing-link" href="/empleo">Explorar empleo público →</a>
              </div>
              <p className="marketing-trial-note">La prueba empieza con tu primer acceso: 2 tests, 2 simulacros y 2 descargas de materiales. Incluye Empleo general.</p>
              <div className="marketing-scope">Generalitat Valenciana · Diputaciones · Ayuntamientos</div>
            </div>
            <aside className="marketing-overview" aria-label="Preparación y empleo en Tu Coach">
              <span className="eyebrow">Dos formas de avanzar</span>
              <a className="marketing-path" href="#preparacion">
            <span className="marketing-path-number">01</span>
            <div>
            <h2>Prepara tu examen</h2>
            <p>Practica, corrige y detecta qué necesitas reforzar.</p>
            <span>Simulacros · Tests · Materiales →</span>
            </div>
            </a>
              <a className="marketing-path" href="#empleo-publico">
            <span className="marketing-path-number">02</span>
            <div>
            <h2>Amplía tu búsqueda</h2>
            <p>Consulta oportunidades y, con tu suscripción, sigue los procesos que te interesan.</p>
            <span>Convocatorias de empleo público →</span>
            </div>
            </a>
              <p className="marketing-overview-note">Empieza por una convocatoria o practica con un modelo genérico municipal.</p>
            </aside>
          </section>

          <section className="marketing-section" id="preparacion">
            <div className="marketing-heading">
            <span className="eyebrow">Preparación</span>
            <h2>Elige cómo quieres practicar</h2>
            <p>Un simulacro para entrenar el conjunto. Un test para trabajar los contenidos que más necesitas.</p>
            </div>
            <div className="marketing-grid marketing-grid-two">
              <article className="marketing-card" id="simulacros">
            <span className="marketing-tag">Simulacros</span>
            <h3>Practica con pruebas completas</h3>
            <p>Entrena con la estructura configurada para las convocatorias disponibles o con modelos genéricos de ayuntamientos.</p>
            <ul>
            <li>Revisa aciertos, fallos y preguntas no contestadas.</li>
            <li>Consulta la corrección y descarga preguntas y soluciones en PDF.</li>
            </ul>
            </article>
              <article className="marketing-card" id="tests">
            <span className="marketing-tag">Tests dirigidos</span>
            <h3>Refuerza temas y normas</h3>
            <p>Selecciona contenidos del temario disponible y concentra la práctica en los puntos que quieras mejorar.</p>
            <ul>
            <li>Practica por temas, leyes y normas.</li>
            <li>Revisa tus resultados y tu nivel de seguridad al responder.</li>
            </ul>
            </article>
            </div>
          </section>

          <section className="marketing-section" id="generalitat-valenciana">
            <div className="marketing-heading">
              <span className="eyebrow">Generalitat Valenciana</span>
              <h2>Preparación por cuerpo administrativo</h2>
              <p>Accede a información específica para los cuerpos A1-01, A2-01, C1-01 y C2-01.</p>
            </div>
            <div className="marketing-grid marketing-grid-two">
              <article className="marketing-card"><span className="marketing-tag">A1-01</span><h3>A1-01 Generalitat Valenciana</h3><p>Preparación del cuerpo A1-01 con tests, simulacros y materiales.</p><a href="/oposiciones/generalitat-valenciana/a1-01">Ver A1-01 →</a></article>
              <article className="marketing-card"><span className="marketing-tag">A2-01</span><h3>A2-01 Generalitat Valenciana</h3><p>Preparación del cuerpo A2-01 con tests, simulacros y materiales.</p><a href="/oposiciones/generalitat-valenciana/a2-01">Ver A2-01 →</a></article>
              <article className="marketing-card"><span className="marketing-tag">C1-01</span><h3>C1-01 Generalitat Valenciana</h3><p>Preparación del cuerpo C1-01 con tests, simulacros y materiales.</p><a href="/oposiciones/generalitat-valenciana/c1-01">Ver C1-01 →</a></article>
              <article className="marketing-card"><span className="marketing-tag">C2-01</span><h3>C2-01 Generalitat Valenciana</h3><p>Preparación del cuerpo C2-01 con tests, simulacros y materiales.</p><a href="/oposiciones/generalitat-valenciana/c2-01">Ver C2-01 →</a></article>
            </div>
          </section>

          <section className="marketing-municipal marketing-section" id="ayuntamientos">
            <div className="marketing-heading">
            <span className="eyebrow">Modelos genéricos de Ayuntamientos</span>
            <h2>Practica aunque todavía no hayas elegido convocatoria</h2>
            <p>Prepara contenidos para puestos administrativos municipales con modelos de referencia y tests por temas y normas.</p>
            </div>
            <div className="marketing-grid marketing-grid-two">
              <article className="marketing-card">
                <span className="marketing-tag">A1</span>
                <h3>Técnico/a de Administración General</h3>
                <p>Practica contenidos de administración general con simulacros y tests del modelo genérico municipal.</p>
              </article>
              <article className="marketing-card">
                <span className="marketing-tag">A2</span>
                <h3>Gestión de Administración General</h3>
                <p>Refuerza contenidos de gestión administrativa con simulacros y tests del modelo genérico municipal.</p>
              </article>
              <article className="marketing-card">
            <span className="marketing-tag">C1</span>
            <h3>Administrativo/a</h3>
            <p>Entrena contenidos generales, teoría e informática con el modelo municipal disponible.</p>
            </article>
              <article className="marketing-card">
            <span className="marketing-tag">C2</span>
            <h3>Auxiliar administrativo/a</h3>
            <p>Prepara contenidos de auxiliar administrativo con simulacros y tests del modelo genérico municipal.</p>
            </article>
            </div>
            <p className="marketing-disclaimer">Los modelos genéricos son herramientas de práctica: no reproducen las bases de una convocatoria municipal concreta.</p>
          </section>

          <section className="marketing-section marketing-employment" id="empleo-publico">
            <div className="marketing-heading">
            <span className="eyebrow">Empleo público</span>
            <h2>Busca más allá de una oposición</h2>
            <p>Consulta oportunidades de la Generalitat Valenciana, diputaciones y ayuntamientos de Valencia, Alicante y Castellón, con acceso a sus publicaciones oficiales.</p>
            </div>
            <div className="marketing-grid marketing-grid-three">
              <article className="marketing-card">
            <span className="marketing-tag">Procesos selectivos</span>
            <h3>Oposiciones</h3>
            <p>Consulta convocatorias administrativas y la información disponible sobre plazas, inscripción y publicaciones.</p>
            </article>
            </div>
            <div className="marketing-follow">
            <div>
            <h3>Sigue los procesos que te interesan</h3>
            <p>Con tu suscripción, guarda oportunidades en seguimiento y revisa sus novedades oficiales. La preparación específica se indica cuando está disponible.</p>
            </div>
            <a href="/empleo" className="primary public-cta marketing-link">Explorar oportunidades →</a>
            </div>
          </section>

          <section className="marketing-section" id="como-funciona">
            <div className="marketing-heading">
            <span className="eyebrow">Cómo funciona</span>
            <h2>Practica, revisa y decide qué reforzar</h2>
            </div>
            <ol className="marketing-steps">
            <li>
            <span>01</span>
            <h3>Elige</h3>
            <p>Una convocatoria disponible, un modelo municipal o un test dirigido.</p>
            </li>
            <li>
            <span>02</span>
            <h3>Practica</h3>
            <p>Responde e indica, si lo deseas, tu seguridad en cada respuesta.</p>
            </li>
            <li>
            <span>03</span>
            <h3>Revisa</h3>
            <p>Consulta la corrección y el rendimiento por temas y normas.</p>
            </li>
            <li>
            <span>04</span>
            <h3>Refuerza</h3>
            <p>Vuelve a practicar y apóyate en los materiales disponibles.</p>
            </li>
            </ol>
          </section>

          <section className="marketing-section marketing-grid marketing-grid-two" id="materiales">
            <article className="marketing-card marketing-card-dark">
            <span className="eyebrow">Materiales de estudio</span>
            <h2>Resúmenes para el repaso esquemático de temas</h2>
            <p>Repasa los temas con resúmenes orientados a una revisión esquemática de sus contenidos. Descárgalos en PDF y completa el estudio con extractos vinculados al temario y textos completos de las normas disponibles.</p>
            </article>
            <article className="marketing-card">
            <span className="eyebrow">Análisis de resultados</span>
            <h2>Una nota no lo explica todo</h2>
            <p>Revisa tu rendimiento acumulado por temas, normas y seguridad al responder. Localiza fallos que merecen más atención y orienta tu siguiente sesión.</p>
            </article>
          </section>

          <section className="public-pricing" id="precio">
            <div>
            <span className="eyebrow">Prueba y suscripción</span>
            <h2>Conoce Tu Coach antes de suscribirte</h2>
            <p>La prueba gratuita empieza con el primer acceso, no al crear tu cuenta. Durante 24 horas puedes hacer hasta 2 tests, 2 simulacros y 2 descargas de materiales, además de consultar Empleo general.</p>
            <p>El seguimiento de oportunidades está reservado a la suscripción.</p>
            </div>
            <div className="pricing-card">
            <span className="pricing-name">Tu Coach</span>
            <div className="pricing-price">
            <strong>15 €</strong>
            <span>/ mes</span>
            </div>
            <ul>
            <li>Simulacros de convocatorias y modelos disponibles</li>
            <li>Tests por temas y normas</li>
            <li>Corrección y análisis acumulado</li>
            <li>PDFs de preguntas y soluciones</li>
            <li>Resúmenes para el repaso esquemático de temas</li>
            <li>Extractos del temario y normas completas disponibles en PDF</li>
            <li>Consulta y seguimiento de oportunidades de empleo público</li>
            </ul>
            <button type="button" className="primary public-cta" onClick={() => { setError(""); setMensaje(""); setPantallaPublica("REGISTRO"); }}>Probar gratis</button>
            <span className="pricing-note">Prueba de 24 horas con los límites indicados. Seguimiento incluido en la suscripción.</span>
            </div>
          </section>

          <section className="marketing-section marketing-faq" aria-labelledby="faq-heading">
            <div className="marketing-heading">
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2 id="faq-heading">Antes de empezar</h2>
            </div>
            <details>
            <summary>¿Necesito tener una convocatoria elegida?</summary>
            <p>No. Puedes practicar con los modelos genéricos municipales y los tests disponibles, y consultar oportunidades para orientar tu búsqueda.</p>
            </details>
            <details>
            <summary>¿Los modelos municipales son exámenes oficiales?</summary>
            <p>No. Son modelos genéricos de práctica. Revisa siempre las bases, el temario y la estructura de la convocatoria oficial a la que quieras presentarte.</p>
            </details>
            <details>
            <summary>¿Puedo seguir oportunidades durante la prueba?</summary>
            <p>La prueba incluye Empleo general. El seguimiento de oportunidades está disponible con la suscripción.</p>
            </details>
            <details>
            <summary>¿Todas las oportunidades tienen preparación específica?</summary>
            <p>No. Cada oportunidad indica si su preparación está disponible en Tu Coach. Puedes consultar su publicación oficial aunque no tenga preparación específica.</p>
            </details>
          </section>
          <section className="public-final-cta">
            <div>
            <span className="eyebrow">Empieza por tu próximo paso</span>
            <h2>Prueba Tu Coach durante 24 horas.</h2>
            </div>
            <button type="button" className="primary public-cta" onClick={() => { setError(""); setMensaje(""); setPantallaPublica("REGISTRO"); }}>Crear cuenta y probar</button>
            </section>
          <footer className="public-footer">
            <strong>Tu Coach</strong>
            <span>Preparación administrativa y oportunidades de empleo público en la Comunitat Valenciana</span>
            <a href="/contacto">Contacto</a>
            </footer>
        </main>
      );
    }

    const esRegistro = pantallaPublica === "REGISTRO";

    if (pantallaPublica === "RECUPERAR") {
      return (
        <main className="auth-shell">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError("");
              setMensaje("");
              setPantallaPublica("LOGIN");
            }}
          >
            ← Volver a iniciar sesión
          </button>

          <div className="auth-card">
            <span className="eyebrow">Recuperar contraseña</span>
            <h2>¿Has olvidado tu contraseña?</h2>
            <p className="muted">Te enviaremos un enlace para crear una nueva contraseña.</p>

            {error && <div className="error">{error}</div>}
            {mensaje && <div className="success">{mensaje}</div>}

            <form onSubmit={solicitarRecuperacion}>
              <label htmlFor="email-recuperacion">Correo electrónico</label>
              <input
                id="email-recuperacion"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button type="submit" className="primary" disabled={ocupado}>
                {ocupado ? "Enviando..." : "Enviar enlace de recuperación"}
              </button>
            </form>
          </div>
        </main>
      );
    }

    return (
      <main className="auth-shell">
        <button
          type="button"
          className="auth-back"
          onClick={() => {
            setError("");
            setMensaje("");
            setPantallaPublica("LANDING");
          }}
        >
          ← Volver a NetReto
        </button>

        <section className="auth-layout">
          <div className="auth-intro">
            <button
              type="button"
              className="brand auth-brand"
              onClick={() => setPantallaPublica("LANDING")}
            >
              <span className="brand-mark" aria-hidden="true">N</span>
              <span className="brand-copy">
                <span className="brand-name">NetReto</span>
                <span className="brand-byline">by netexamenes.com</span>
              </span>
            </button>

            <span className="public-kicker">
              {esRegistro ? "Empieza con una prueba gratuita" : "Bienvenido de nuevo"}
            </span>
            <h1>
              {esRegistro
                ? "Crea tu cuenta y prueba Tu Coach durante 24 horas."
                : "Continúa con tu preparación."}
            </h1>
            <p>
              {esRegistro
                ? "Tu prueba de 24 horas comienza con el primer acceso e incluye hasta 2 tests, 2 simulacros, 2 descargas de materiales y Empleo general."
                : "Accede a tus simulacros, tests, resultados y herramientas de preparación."}
            </p>

            <div className="auth-points">
              <span>Simulacros y tests</span>
              <span>Corrección por seguridad</span>
              <span>Histórico y PDFs</span>
            </div>
          </div>

          <div className="auth-card">
            <span className="eyebrow">
              {esRegistro ? "Crear cuenta" : "Acceso"}
            </span>
            <h2>{esRegistro ? "Prueba Tu Coach gratis" : "Iniciar sesión"}</h2>

            {error && <div className="error">{error}</div>}
            {mensaje && <div className="success">{mensaje}</div>}

            {esRegistro && (
              <p>
                Para completar el registro, tendrás que confirmar tu correo.
                Tras crear la cuenta, revisa tu bandeja de entrada y también
                Spam o Correo no deseado.
              </p>
            )}

            <form onSubmit={esRegistro ? crearCuenta : iniciarSesion}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                ref={correoInput}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete={esRegistro ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />

              <button
                className="primary auth-submit"
                disabled={ocupado}
                type="submit"
              >
                {ocupado
                  ? esRegistro
                    ? "Creando cuenta..."
                    : "Entrando..."
                  : esRegistro
                    ? "Crear cuenta"
                    : "Entrar"}
              </button>
            </form>

            {!esRegistro && (
              <div style={{ marginTop: "0.8rem" }}>
                <p>¿No has recibido el correo para confirmar tu cuenta? Introduce arriba tu correo y solicita otro mensaje.</p>
                <button
                  type="button"
                  className="link-button"
                  disabled={ocupado || esperaReenvio > 0}
                  onClick={() => void reenviarConfirmacion()}
                >
                  {esperaReenvio > 0 ? `Podrás reenviar en ${esperaReenvio} s` : "Reenviar correo de confirmación"}
                </button>
              </div>
            )}

            {!esRegistro && (
        <div style={{ marginTop: "0.8rem", textAlign: "center" }}>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setError("");
              setMensaje("");
              setPantallaPublica("RECUPERAR");
            }}
          >
            ¿Has olvidado tu contraseña?
          </button>
        </div>
      )}

      <div className="auth-switch">
              <span>
                {esRegistro ? "¿Ya tienes cuenta?" : "¿Todavía no tienes cuenta?"}
              </span>
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  setError("");
                  setMensaje("");
                  setPantallaPublica(esRegistro ? "LOGIN" : "REGISTRO");
                }}
              >
                {esRegistro ? "Iniciar sesión" : "Probar gratis"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page app-page">
      {simulacroId === null && (
        <>
          <header className="app-header">
            <button
              type="button"
              className="brand"
              onClick={() => setSeccion("INICIO")}
              aria-label="Ir al inicio"
            >
              <span className="brand-mark" aria-hidden="true">N</span>
              <span className="brand-copy">
                <span className="brand-name">NetReto</span>
                <span className="brand-byline">by netexamenes.com</span>
              </span>
            </button>

            <nav className="app-nav" aria-label="Navegación principal">
              <button
                type="button"
                className={seccion === "SIMULACROS" ? "nav-link active" : "nav-link"}
                onClick={() => setSeccion("SIMULACROS")}
              >
                Simulacros
              </button>
              <button
                type="button"
                className={seccion === "TESTS" ? "nav-link active" : "nav-link"}
                onClick={() => setSeccion("TESTS")}
              >
                Tests
              </button>
              <button
                type="button"
                className={seccion === "MATERIALES" ? "nav-link active" : "nav-link"}
                onClick={() => setSeccion("MATERIALES")}
              >
                Materiales
              </button>
            </nav>

            <div className="account-area">
              {me && estadoSuscripcion ? (
                <>
                  {estadoSuscripcion.suscrito && (
                    <button
                      type="button"
                      className="plan-chip"
                      disabled={ocupado}
                      onClick={abrirPortalSuscripcion}
                      title="Gestionar suscripción"
                    >
                      {estadoSuscripcion.pago_pendiente
                        ? "Pago pendiente"
                        : estadoSuscripcion.cancelacion_programada
                          ? "Plan activo · baja programada"
                          : "Plan activo"}
                    </button>
                  )}
                  <div className="account-identity">
                    <span className="account-avatar">{inicialUsuario}</span>
                    <span className="account-email">{me.email}</span>
                  </div>
                </>
              ) : (
                <div className="account-identity" aria-live="polite" aria-busy="true">
                  <span className="loading-spinner" aria-hidden="true" />
                  <span className="account-email">Cargando cuenta…</span>
                </div>
              )}
              <button
                type="button"
                className="logout-button"
                onClick={cerrarSesion}
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </header>

          {estadoSuscripcion &&
            (
              !estadoSuscripcion.suscrito ||
              estadoSuscripcion.pago_pendiente ||
              estadoSuscripcion.cancelacion_programada ||
              checkoutRetorno === "success" ||
              checkoutRetorno === "cancel"
            ) && (
            <section
              className={
                estadoSuscripcion.pago_pendiente
                  ? "subscription-banner subscription-warning"
                  : estadoSuscripcion.cancelacion_programada
                    ? "subscription-banner subscription-info"
                    : "subscription-banner"
              }
            >
              <div>
                <strong>
                  {estadoSuscripcion.pago_pendiente
                    ? "Hay un problema con el pago"
                    : estadoSuscripcion.cancelacion_programada
                      ? `Suscripción activa hasta ${
                          formatearFechaSuscripcion(
                            estadoSuscripcion.cancel_at ??
                              estadoSuscripcion.current_period_end
                          ) ?? "la fecha de baja"
                        }`
                      : estadoSuscripcion.suscrito
                        ? "Suscripción activa"
                        : prueba24hActiva
                        ? "Prueba gratuita de 24 horas activa"
                        : "Suscripción no activa"}
                </strong>
                <span>
                  {estadoSuscripcion.pago_pendiente
                    ? "Tu acceso continúa temporalmente. Revisa tu método de pago."
                    : estadoSuscripcion.cancelacion_programada
                      ? "Conservas el acceso completo hasta la fecha indicada."
                      : prueba24hActiva
                        ? `Te quedan ${estadoSuscripcion.prueba_24h_tests_restantes} tests, ${estadoSuscripcion.prueba_24h_simulacros_restantes} simulacros y ${estadoSuscripcion.prueba_24h_materiales_restantes} descargas de materiales.`
                        : "La prueba gratuita ha finalizado. Activa una suscripción para continuar con la preparación."}
                </span>

                {checkoutRetorno === "success" && (
                  <span>
                    Stripe ha completado el pago. Puedes comprobar de nuevo el estado si el webhook todavía está procesándose.
                  </span>
                )}
                {checkoutRetorno === "cancel" && (
                  <span>El proceso de pago se ha cancelado.</span>
                )}
              </div>

              <div className="subscription-actions">
                {estadoSuscripcion.suscrito ? (
                  <button
                    type="button"
                    className="secondary compact-button"
                    disabled={ocupado}
                    onClick={abrirPortalSuscripcion}
                  >
                    Gestionar suscripción
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary compact-button"
                    disabled={ocupado}
                    onClick={abrirCheckout}
                  >
                    Activar suscripción
                  </button>
                )}

                {checkoutRetorno === "success" && (
                  <button
                    type="button"
                    className="secondary compact-button"
                    onClick={actualizarSuscripcion}
                  >
                    Comprobar estado
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {(error || mensaje || accionEnCurso) && (
        <div className="feedback-stack" role="status" aria-live="polite">
          {error && (
            <div className="error feedback-message">
              <div className="feedback-text">{error}</div>
              <button
                type="button"
                className="feedback-close"
                aria-label="Cerrar mensaje"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}
          {mensaje && (
            <div className="success feedback-message">
              <div className="feedback-text">{mensaje}</div>
              <button
                type="button"
                className="feedback-close"
                aria-label="Cerrar mensaje"
                onClick={() => setMensaje("")}
              >
                ×
              </button>
            </div>
          )}
          {accionEnCurso && (
            accionEnCurso === "Creando simulacro..." ? (
              <div className="working feedback-message long-operation-message">
                <span className="loading-spinner loading-spinner-large" aria-hidden="true" />
                <div className="feedback-text">
                  <strong>Preparando el simulacro</strong>
                  <span>
                    Estamos seleccionando y organizando las preguntas de tu convocatoria.
                    Esta operación puede tardar unos segundos.
                  </span>
                  <small>
                    No cierres esta página; el simulacro aparecerá automáticamente cuando
                    esté listo.
                  </small>
                </div>
              </div>
            ) : accionEnCurso === "Creando test..." ? (
              <div className="working feedback-message long-operation-message">
                <span className="loading-spinner loading-spinner-large" aria-hidden="true" />
                <div className="feedback-text">
                  <strong>Preparando el test</strong>
                  <span>
                    Estamos seleccionando y organizando las preguntas según los criterios
                    elegidos. Esta operación puede tardar unos segundos.
                  </span>
                  <small>
                    No cierres esta página; el test aparecerá automáticamente cuando esté
                    listo.
                  </small>
                </div>
              </div>
            ) : accionEnCurso === "Generando PDF de soluciones..." ? (
              <div className="working feedback-message long-operation-message">
                <span className="loading-spinner loading-spinner-large" aria-hidden="true" />
                <div className="feedback-text">
                  <strong>Preparando el PDF de soluciones</strong>
                  <span>
                    Estamos generando las explicaciones de las respuestas. En una prueba
                    completa puede tardar alrededor de un minuto.
                  </span>
                  <small>
                    No cierres esta página; la descarga comenzará automáticamente cuando
                    termine.
                  </small>
                </div>
              </div>
            ) : accionEnCurso === "Analizando los resultados acumulados..." ? (
              <div className="working feedback-message long-operation-message">
                <span className="loading-spinner loading-spinner-large" aria-hidden="true" />
                <div className="feedback-text">
                  <strong>Analizando tu rendimiento</strong>
                  <span>
                    Estamos procesando tus resultados y preparando el análisis
                    personalizado. Esta operación puede tardar unos segundos.
                  </span>
                  <small>
                    Mantén esta página abierta; el análisis aparecerá automáticamente.
                  </small>
                </div>
              </div>
            ) : (
              <div className="working feedback-message">
                <span className="loading-spinner" aria-hidden="true" />
                <div className="feedback-text">{accionEnCurso}</div>
              </div>
            )
          )}
        </div>
      )}

      {simulacroId === null && seccion === "INICIO" && (
        <div className="home-dashboard">
          <section className="home-hero">
            <div>
              <span className="eyebrow">Tu preparación</span>
              <h1>Prepárate con criterio, no sólo con más preguntas.</h1>
              <p>
                Simulacros completos, tests dirigidos y correcciones que te ayudan
                a detectar dónde fallas y con qué nivel de seguridad respondes.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="primary primary-large"
                  onClick={() => setSeccion("SIMULACROS")}
                >
                  Crear simulacro
                </button>
                <button
                  type="button"
                  className="secondary primary-large"
                  onClick={() => setSeccion("TESTS")}
                >
                  Crear test
                </button>
              </div>
            </div>

            <div className="hero-summary">
              <span className="summary-label">Tu actividad</span>
              <strong>{totalPruebas}</strong>
              <span>pruebas guardadas</span>
              <div className="summary-divider" />
              <div className="summary-mini-grid">
                <div>
                  <strong>{totalPendientes}</strong>
                  <span>Pendientes</span>
                </div>
                <div>
                  <strong>{totalCorregidas}</strong>
                  <span>Corregidas</span>
                </div>
              </div>
            </div>
          </section>

          <section className="home-grid">
            <div className="home-panel home-panel-wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Actividad reciente</span>
                  <h2>Continúa donde lo dejaste</h2>
                </div>
                {actividadReciente.length > 0 && (
                  <span className="muted">{actividadReciente.length} recientes</span>
                )}
              </div>

              {actividadReciente.length === 0 ? (
                <div className="empty-state">
                  <strong>Aún no tienes pruebas guardadas</strong>
                  <span>
                    Crea tu primer simulacro o construye un test por temas o normas.
                  </span>
                </div>
              ) : (
                <div className="recent-list">
                  {actividadReciente.map((item) => (
                    <button
                      type="button"
                      className="recent-item"
                      key={`${item.tipo_prueba}-${item.id}`}
                      onClick={() => abrirSimulacro(item)}
                    >
                      <span
                        className={
                          item.tipo_prueba === "SIMULACRO"
                            ? "recent-icon recent-icon-blue"
                            : "recent-icon recent-icon-green"
                        }
                      >
                        {item.tipo_prueba === "SIMULACRO" ? "S" : "T"}
                      </span>
                      <span className="recent-main">
                        <strong>
                          {item.tipo_prueba === "SIMULACRO" ? "Simulacro" : "Test"} Nº {item.numero}
                        </strong>
                        <span>
                          {item.convocatoria_codigo ?? `Convocatoria ${item.convocatoria_id}`} ·{" "}
                          {item.total_preguntas} preguntas · {item.contestadas} contestadas
                        </span>
                      </span>
                      <span
                        className={
                          item.estado === "FINALIZADO"
                            ? "status status-finished"
                            : "status status-pending"
                        }
                      >
                        {item.estado === "FINALIZADO" ? "Corregido" : "Pendiente"}
                      </span>
                      <span className="recent-action">
                        {item.estado === "FINALIZADO"
                          ? "Ver corrección"
                          : itemSoloLectura(item)
                            ? "Ver"
                            : "Continuar"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside className="home-panel">
              <span className="eyebrow">Convocatorias</span>
              <h2>Tu espacio de preparación</h2>
              <p className="muted">
                {convocatorias.length === 1
                  ? "Tienes 1 convocatoria disponible."
                  : `Tienes ${convocatorias.length} convocatorias disponibles.`}
              </p>

              <div className="convocatoria-summary-list">
                {convocatorias.map((convocatoria) => (
                  <div className="convocatoria-summary" key={convocatoria.id}>
                    <span className="convocatoria-code">{convocatoria.codigo}</span>
                    <strong>{convocatoria.puesto}</strong>
                  </div>
                ))}
              </div>

            </aside>
          </section>

          <section className="feature-strip">
            <div>
              <span className="feature-number">01</span>
              <strong>Simula el examen</strong>
              <span>Practica con la estructura de tu convocatoria.</span>
            </div>
            <div>
              <span className="feature-number">02</span>
              <strong>Refuerza puntos concretos</strong>
              <span>Construye tests por temas o por leyes y normas.</span>
            </div>
            <div>
              <span className="feature-number">03</span>
              <strong>Revisa cómo respondes</strong>
              <span>Compara aciertos, errores y seguridad declarada.</span>
            </div>
          </section>
        </div>
      )}

      {simulacroId !== null && preguntas.length > 0 && (
        <section className="card">
          <h2>Documentos de la prueba</h2>
          <p className="muted">
            Los dos documentos se generan a partir de la copia congelada de esta
            prueba. Puedes descargarlos aunque no hayas corregido la prueba en la
            aplicación, por ejemplo para realizarla y corregirla en papel.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={ocupado}
              onClick={descargarPdfPreguntas}
            >
              {ocupado && accionEnCurso === "Generando PDF de preguntas..."
                ? "Generando PDF..."
                : "Descargar PDF de preguntas"}
            </button>

            <button
              className="secondary"
              disabled={ocupado}
              onClick={descargarPdfSoluciones}
            >
              {ocupado && accionEnCurso === "Generando PDF de soluciones..."
                ? "Generando PDF..."
                : "Descargar PDF de soluciones"}
            </button>
          </div>
        </section>
      )}

      {resultado && (
        <section className="card">
          <div className="row space-between">
            <h2>Resultado</h2>
            <button
              className="secondary"
              type="button"
              onClick={() => setMostrarCorreccionPantalla((actual) => !actual)}
            >
              {mostrarCorreccionPantalla ? "Ocultar corrección en pantalla" : "Ver corrección en pantalla"}
            </button>
          </div>
          {!modoSoloLecturaActivo && (
            <button
              className="secondary"
              disabled={ocupado}
              onClick={modificarRespuestas}
              style={{ marginBottom: 16 }}
            >
              {ocupado && accionEnCurso === "Preparando modificación de respuestas..."
                ? "Preparando..."
                : "Modificar respuestas"}
            </button>
          )}
          {modoSoloLecturaActivo && (
            <p className="muted">
              Histórico en modo solo lectura. Puedes consultar la prueba y descargar sus PDFs.
            </p>
          )}
          <div className="result-grid">
            <div><strong>{resultado.nota.toFixed(2)}</strong><span>Nota</span></div>
            <div><strong>{resultado.aciertos}</strong><span>Aciertos</span></div>
            <div><strong>{resultado.fallos}</strong><span>Fallos</span></div>
            <div><strong>{resultado.no_contestadas}</strong><span>No contestadas</span></div>
            <div><strong>{resultado.puntos.toFixed(3)}</strong><span>Puntos</span></div>
            <div><strong>{formatearTiempo(resultado.tiempo_correccion_segundos)}</strong><span>Tiempo empleado</span></div>
          </div>
        </section>
      )}

      {resultado && resultadoAcumulado && (
        <section className="card">
          <h2>Rendimiento acumulado de la convocatoria</h2>
          {resultadoAcumulado.simulacros <= 0 ? (
            <p className="muted">
              Todavía no existen pruebas corregidas para mostrar estadísticas acumuladas.
            </p>
          ) : (
            <>
              <p className="muted">
                Las tablas siguientes corresponden a todos los{" "}
                {resultadoAcumulado.tipo_prueba === "TEST" ? "tests" : "simulacros"}{" "}
                corregidos que se conservan actualmente en esta convocatoria, no
                únicamente a la prueba abierta. Si se modifica o elimina una prueba,
                los resultados se recalculan automáticamente.
              </p>

              <p>
                <strong>Datos acumulados:</strong>{" "}
                {resultadoAcumulado.simulacros}{" "}
                {resultadoAcumulado.tipo_prueba === "TEST" ? "tests" : "simulacros"} ·{" "}
                {resultadoAcumulado.preguntas} preguntas ·{" "}
                {resultadoAcumulado.contestadas} contestadas ·{" "}
                {resultadoAcumulado.no_contestadas} no contestadas.
              </p>

              <h3>Resultados acumulados por tema</h3>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Tema</th>
                      <th>Preguntas</th>
                      <th>% acumulado</th>
                      <th>Aciertos</th>
                      <th>% aciertos</th>
                      <th>Fallos</th>
                      <th>% fallos</th>
                      <th>No contestadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoAcumulado.temas.map((tema) => (
                      <tr key={`${tema.parte}-${tema.numero_tema}-${tema.titulo}`}>
                        <td>{tema.parte} {tema.numero_tema}. {tema.titulo}</td>
                        <td>{tema.preguntas}</td>
                        <td>{tema.porcentaje_convocatoria.toFixed(1)} %</td>
                        <td>{tema.aciertos}</td>
                        <td>{tema.porcentaje_aciertos.toFixed(1)} %</td>
                        <td>{tema.fallos}</td>
                        <td>{tema.porcentaje_fallos.toFixed(1)} %</td>
                        <td>{tema.no_contestadas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                El porcentaje acumulado indica el peso de cada tema sobre todas las
                preguntas analizadas. Los porcentajes de aciertos y fallos se calculan
                sobre el total de preguntas de ese tema.
              </p>

              <h3>Resultados acumulados por ley o norma</h3>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Ley o norma</th>
                      <th>Preguntas</th>
                      <th>% acumulado</th>
                      <th>Aciertos</th>
                      <th>% aciertos</th>
                      <th>Fallos</th>
                      <th>% fallos</th>
                      <th>No contestadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoAcumulado.normas.map((norma) => (
                      <tr key={norma.norma}>
                        <td>{norma.norma}</td>
                        <td>{norma.preguntas}</td>
                        <td>{norma.porcentaje_convocatoria.toFixed(1)} %</td>
                        <td>{norma.aciertos}</td>
                        <td>{norma.porcentaje_aciertos.toFixed(1)} %</td>
                        <td>{norma.fallos}</td>
                        <td>{norma.porcentaje_fallos.toFixed(1)} %</td>
                        <td>{norma.no_contestadas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                Las preguntas jurídicas se agrupan por la ley o norma congelada en
                cada prueba. Las preguntas de informática aparecen agrupadas como
                «Informática».
              </p>

              {resultadoAcumulado.seguridad.length > 0 && (
                <>
                  <h3>Resultados acumulados por nivel de seguridad</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Seguridad</th>
                          <th>Contestadas</th>
                          <th>Aciertos</th>
                          <th>% aciertos</th>
                          <th>Fallos</th>
                          <th>% fallos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultadoAcumulado.seguridad.map((seguridad) => (
                          <tr key={seguridad.codigo}>
                            <td>{seguridad.seguridad}</td>
                            <td>{seguridad.contestadas}</td>
                            <td>{seguridad.aciertos}</td>
                            <td>{seguridad.porcentaje_aciertos.toFixed(1)} %</td>
                            <td>{seguridad.fallos}</td>
                            <td>{seguridad.porcentaje_fallos.toFixed(1)} %</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted">
                    Los porcentajes se calculan únicamente sobre las preguntas
                    contestadas en pruebas en las que se valoró la seguridad.
                  </p>
                </>
              )}
            </>
          )}
        </section>
      )}

      {resultado &&
        resultadoAcumulado &&
        resultadoAcumulado.simulacros > 0 &&
        !modoSoloLecturaActivo && (
        <section className="card">
          <h2>Análisis acumulado de la convocatoria</h2>
          <p className="muted">
            El análisis utiliza todas las pruebas corregidas del mismo tipo que
            la prueba abierta y que se conservan actualmente en esta convocatoria,
            no únicamente esta corrección. Si se elimina o modifica una prueba,
            los datos se recalculan.
          </p>
          <p>
            <strong>Datos considerados:</strong>{" "}
            {resultadoAcumulado.simulacros}{" "}
            {resultadoAcumulado.tipo_prueba === "TEST" ? "tests" : "simulacros"} ·{" "}
            {resultadoAcumulado.preguntas} preguntas.
          </p>

          {analisisActual() && (
            <div style={{ marginTop: 18 }}>
              {renderAnalisisRendimiento(analisisActual()!.texto)}
            </div>
          )}

          <button
            className="secondary"
            disabled={ocupado}
            onClick={generarAnalisisRendimiento}
          >
            {ocupado && accionEnCurso === "Analizando los resultados acumulados..."
              ? "Analizando..."
              : analisisActual()
                ? "Regenerar análisis de rendimiento"
                : "Generar análisis de rendimiento"}
          </button>
        </section>
      )}

      {simulacroId === null && seccion === "CHAT" && (
        <section className="card">
          <h2>Chat</h2>

          {modoHistoricoPostBaja && (
            <div className="working" style={{ marginBottom: 18 }}>
              El Chat no está disponible durante el acceso histórico posterior a la baja.
            </div>
          )}

          {!modoHistoricoPostBaja && (
            <>
          <label htmlFor="chat-convocatoria">Convocatoria</label>
          <select
            id="chat-convocatoria"
            value={chatConvocatoriaId ?? ""}
            onChange={(event) => {
              const valor = Number(event.target.value);
              setChatConvocatoriaId(Number.isFinite(valor) ? valor : null);
              setChatEntrada("");
              setError("");
              setMensaje("");
            }}
          >
            {convocatorias.map((convocatoria) => (
              <option key={convocatoria.id} value={convocatoria.id}>
                {convocatoria.codigo} — {convocatoria.puesto}
              </option>
            ))}
          </select>

          <h3>Modo de consulta</h3>
          <div className="options">
            <label>
              <input
                type="radio"
                name="chat-modo"
                checked={chatModo === "CONVOCATORIA"}
                onChange={() => {
                  setChatModo("CONVOCATORIA");
                  setChatEntrada("");
                  setError("");
                  setMensaje("");
                }}
              />{" "}
              Convocatoria y NetReto
            </label>
            <label>
              <input
                type="radio"
                name="chat-modo"
                checked={chatModo === "GENERAL"}
                onChange={() => {
                  setChatModo("GENERAL");
                  setChatEntrada("");
                  setError("");
                  setMensaje("");
                }}
              />{" "}
              Conocimiento general de GPT
            </label>
          </div>

          {chatModo === "CONVOCATORIA" ? (
            <div className="working" style={{ marginTop: 14 }}>
              Las respuestas se limitan al corpus de la convocatoria activa y
              a la base de conocimiento de NetReto.
            </div>
          ) : (
            <div className="working" style={{ marginTop: 14 }}>
              Este modo utiliza conocimiento general de GPT. Sus respuestas
              pueden incluir información ajena al temario y no están respaldadas
              por el corpus de la convocatoria.
            </div>
          )}

          <div style={{ marginTop: 18, marginBottom: 18 }}>
            <button
              type="button"
              className="secondary"
              disabled={ocupado || mensajesChatActuales().length === 0}
              onClick={limpiarChatActual}
            >
              Limpiar conversación
            </button>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
            {mensajesChatActuales().length === 0 ? (
              <p className="muted">La conversación está vacía.</p>
            ) : (
              mensajesChatActuales().map((mensajeChat, indice) => (
                <div
                  key={`${mensajeChat.role}-${indice}`}
                  style={{
                    padding: 14,
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    background:
                      mensajeChat.role === "user" ? "#f7f7f7" : "white",
                  }}
                >
                  <strong>
                    {mensajeChat.role === "user" ? "Tú" : "NetReto"}
                  </strong>
                  <div
                    style={{
                      marginTop: 8,
                      whiteSpace:
                        mensajeChat.role === "user" ? "pre-wrap" : "normal",
                      lineHeight: 1.55,
                    }}
                  >
                    {mensajeChat.role === "assistant"
                      ? renderChatMarkdown(mensajeChat.content)
                      : mensajeChat.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={enviarChat}>
            <label htmlFor="chat-pregunta">
              {chatModo === "CONVOCATORIA"
                ? "Escriba una duda sobre la convocatoria o sobre NetReto"
                : "Escriba una pregunta de conocimiento general"}
            </label>
            <textarea
              id="chat-pregunta"
              rows={4}
              value={chatEntrada}
              disabled={ocupado || chatConvocatoriaId === null}
              onChange={(event) => setChatEntrada(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (
                    !ocupado &&
                    chatConvocatoriaId !== null &&
                    chatEntrada.trim().length > 0
                  ) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              style={{
                width: "100%",
                minHeight: 96,
                resize: "vertical",
              }}
            />
            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="primary"
                disabled={
                  ocupado ||
                  chatConvocatoriaId === null ||
                  chatEntrada.trim().length === 0
                }
              >
                {ocupado && accionEnCurso?.includes("fuentes")
                  ? "Consultando..."
                  : ocupado && accionEnCurso?.includes("conocimiento general")
                    ? "Generando..."
                    : "Enviar"}
              </button>
            </div>
          </form>
            </>
          )}
        </section>
      )}


{simulacroId === null && seccion === "MATERIALES" && (
  <section className="card">
    <h2>Materiales de estudio</h2>

    {modoHistoricoPostBaja ? (
      <div className="working">
        Los materiales de estudio requieren una suscripción activa.
      </div>
    ) : (
      <>
        <p className="muted">
          Selecciona una convocatoria, una norma y el material que quieres
          descargar.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div>
            <label htmlFor="material-convocatoria">Convocatorias</label>
            <select
              id="material-convocatoria"
              className="select"
              style={{ width: "100%" }}
              value={
                materialConvocatoriaId !== null &&
                !convocatorias
                  .find((convocatoria) => convocatoria.id === materialConvocatoriaId)
                  ?.codigo.startsWith("Apoyo-")
                  ? materialConvocatoriaId
                  : ""
              }
              onChange={(event) => {
                setMaterialConvocatoriaId(
                  event.target.value === "" ? null : Number(event.target.value)
                );
                setMaterialNormaId(null);
                setError("");
                setMensaje("");
              }}
            >
              <option value="">Selecciona una convocatoria</option>
              {convocatorias
                .filter((convocatoria) => !convocatoria.codigo.startsWith("Apoyo-"))
                .map((convocatoria) => (
                  <option key={convocatoria.id} value={convocatoria.id}>
                    {convocatoria.codigo} — {convocatoria.puesto}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="modelo-convocatoria-materiales">
              Modelos de Convocatorias para Ayuntamientos
            </label>
            <select
              id="modelo-convocatoria-materiales"
              className="select"
              style={{ width: "100%" }}
              value={
                materialConvocatoriaId !== null &&
                convocatorias
                  .find((convocatoria) => convocatoria.id === materialConvocatoriaId)
                  ?.codigo.startsWith("Apoyo-")
                  ? materialConvocatoriaId
                  : ""
              }
              onChange={(event) => {
                setMaterialConvocatoriaId(
                  event.target.value === "" ? null : Number(event.target.value)
                );
                setMaterialNormaId(null);
                setError("");
                setMensaje("");
              }}
            >
              <option value="">Selecciona un modelo de convocatoria</option>
              {convocatorias
                .filter((convocatoria) => convocatoria.codigo.startsWith("Apoyo-"))
                .map((convocatoria) => (
                  <option key={convocatoria.id} value={convocatoria.id}>
                    {convocatoria.codigo} — {convocatoria.puesto}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label htmlFor="material-norma">Ley / norma</label>
          <select
            id="material-norma"
            className="select"
            value={materialNormaId ?? ""}
            disabled={normasMateriales.length === 0}
            onChange={(event) => {
              const valor = Number(event.target.value);
              setMaterialNormaId(
                Number.isFinite(valor) ? valor : null
              );
              setError("");
              setMensaje("");
            }}
          >
            {normasMateriales.map((norma) => (
              <option key={norma.norma_id} value={norma.norma_id}>
                {norma.nombre_canonico}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 18 }}>
          <label>¿Qué quieres descargar?</label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="material-tipo"
              value="resumen"
              checked={materialTipo === "resumen"}
              onChange={() => setMaterialTipo("resumen")}
            />{" "}
            Resumen para estudiar
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <input
              type="radio"
              name="material-tipo"
              value="extracto"
              checked={materialTipo === "extracto"}
              onChange={() => setMaterialTipo("extracto")}
            />{" "}
            Extracto para esta oposición
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <input
              type="radio"
              name="material-tipo"
              value="completo"
              checked={materialTipo === "completo"}
              onChange={() => setMaterialTipo("completo")}
            />{" "}
            Ley completa
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="primary"
            disabled={
              ocupado ||
              materialConvocatoriaId === null ||
              materialNormaId === null ||
              (!estadoSuscripcion?.suscrito &&
                (!prueba24hActiva ||
                  (estadoSuscripcion?.prueba_24h_materiales_restantes ?? 0) <= 0))
            }
            onClick={descargarMaterialPdf}
          >
            {ocupado &&
            accionEnCurso === "Preparando material de estudio..."
              ? "Preparando PDF..."
              : "Descargar PDF"}
          </button>
        </div>
      </>
    )}
  </section>
)}


      {simulacroId === null &&
        seccion === "SIMULACROS" &&
        !modoHistoricoPostBaja && (
        <section className="card">
          <h2>Crear simulacro</h2>
          <p className="muted">
            Selecciona una convocatoria oficial o un modelo de convocatoria para
            ayuntamientos.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div>
              <label htmlFor="convocatoria-simulacro">Convocatorias</label>
              <select
                id="convocatoria-simulacro"
                className="select"
                style={{ width: "100%" }}
                value={
                  convocatoriaSimulacroId !== null &&
                  !convocatorias
                    .find((convocatoria) => convocatoria.id === convocatoriaSimulacroId)
                    ?.codigo.startsWith("Apoyo-")
                    ? convocatoriaSimulacroId
                    : ""
                }
                onChange={(e) =>
                  setConvocatoriaSimulacroId(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              >
                <option value="">Selecciona una convocatoria</option>
                {convocatorias
                  .filter((convocatoria) => !convocatoria.codigo.startsWith("Apoyo-"))
                  .map((convocatoria) => (
                    <option key={convocatoria.id} value={convocatoria.id}>
                      {convocatoria.codigo} — {convocatoria.puesto}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="modelo-convocatoria-simulacro">
                Modelos de Convocatorias para Ayuntamientos
              </label>
              <select
                id="modelo-convocatoria-simulacro"
                className="select"
                style={{ width: "100%" }}
                value={
                  convocatoriaSimulacroId !== null &&
                  convocatorias
                    .find((convocatoria) => convocatoria.id === convocatoriaSimulacroId)
                    ?.codigo.startsWith("Apoyo-")
                    ? convocatoriaSimulacroId
                    : ""
                }
                onChange={(e) =>
                  setConvocatoriaSimulacroId(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              >
                <option value="">Selecciona un modelo de convocatoria</option>
                {convocatorias
                  .filter((convocatoria) => convocatoria.codigo.startsWith("Apoyo-"))
                  .map((convocatoria) => (
                    <option key={convocatoria.id} value={convocatoria.id}>
                      {convocatoria.codigo} — {convocatoria.puesto}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              className="primary"
              disabled={
                ocupado ||
                convocatoriaSimulacroId === null ||
                (!estadoSuscripcion?.suscrito &&
                  (!prueba24hActiva ||
                    (estadoSuscripcion?.prueba_24h_simulacros_restantes ?? 0) <= 0))
              }
              onClick={() => convocatoriaSimulacroId !== null && crear(convocatoriaSimulacroId)}
            >
              {ocupado && accionEnCurso === "Creando simulacro..."
                ? "Creando simulacro..."
                : "Crear simulacro"}
            </button>
          </div>
        </section>
      )}

      {simulacroId === null && seccion === "SIMULACROS" && (
        <section className="card">
          <h2>Mis simulacros</h2>
          {misSimulacros.length === 0 ? (
            <p className="muted">Todavía no hay simulacros guardados.</p>
          ) : (
            <div className="saved-list">
              {misSimulacros.map((simulacro) => (
                <div className="saved-row" key={simulacro.id}>
                  <div className="saved-main">
                    <strong>
                      Nº {simulacro.numero} ·{" "}
                      {simulacro.convocatoria_codigo ?? `Convocatoria ${simulacro.convocatoria_id}`}
                    </strong>
                    <div className="muted">
                      {new Date(simulacro.fecha_generacion).toLocaleString("es-ES")} ·{" "}
                      {simulacro.total_preguntas} preguntas ·{" "}
                      {simulacro.contestadas} contestadas
                    </div>
                  </div>

                  <span
                    className={
                      simulacro.estado === "FINALIZADO"
                        ? "status status-finished"
                        : "status status-pending"
                    }
                  >
                    {simulacro.estado === "FINALIZADO"
                      ? "Corregido"
                      : "Pendiente"}
                  </span>

                  <div className="saved-actions">
                    <button
                      className="secondary"
                      disabled={ocupado}
                      onClick={() => abrirSimulacro(simulacro)}
                    >
                      {simulacro.estado === "FINALIZADO"
                        ? "Ver corrección"
                        : itemSoloLectura(simulacro)
                          ? "Ver preguntas"
                          : "Continuar"}
                    </button>
                    {!itemSoloLectura(simulacro) && (
                      <button
                        className="danger"
                        disabled={ocupado}
                        onClick={() => eliminarGuardado(simulacro)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {simulacroId === null && seccion === "TESTS" && !modoHistoricoPostBaja && (
        <>
          <section className="card">
            <h2>Construir test</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div>
                <label htmlFor="convocatoria-test">Convocatorias</label>
                <select
                  id="convocatoria-test"
                  className="select"
                  style={{ width: "100%" }}
                  value={
                    convocatoriaTestId !== null &&
                    !convocatorias
                      .find((convocatoria) => convocatoria.id === convocatoriaTestId)
                      ?.codigo.startsWith("Apoyo-")
                      ? convocatoriaTestId
                      : ""
                  }
                  onChange={(e) => {
                    setConvocatoriaTestId(
                      e.target.value === "" ? null : Number(e.target.value)
                    );
                    setTemasSeleccionados([]);
                    setNormasSeleccionadas([]);
                  }}
                >
                  <option value="">Selecciona una convocatoria</option>
                  {convocatorias
                    .filter((convocatoria) => !convocatoria.codigo.startsWith("Apoyo-"))
                    .map((convocatoria) => (
                      <option key={convocatoria.id} value={convocatoria.id}>
                        {convocatoria.codigo} — {convocatoria.puesto}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="modelo-convocatoria-test">
                  Modelos de Convocatorias para Ayuntamientos
                </label>
                <select
                  id="modelo-convocatoria-test"
                  className="select"
                  style={{ width: "100%" }}
                  value={
                    convocatoriaTestId !== null &&
                    convocatorias
                      .find((convocatoria) => convocatoria.id === convocatoriaTestId)
                      ?.codigo.startsWith("Apoyo-")
                      ? convocatoriaTestId
                      : ""
                  }
                  onChange={(e) => {
                    setConvocatoriaTestId(
                      e.target.value === "" ? null : Number(e.target.value)
                    );
                    setTemasSeleccionados([]);
                    setNormasSeleccionadas([]);
                  }}
                >
                  <option value="">Selecciona un modelo de convocatoria</option>
                  {convocatorias
                    .filter((convocatoria) => convocatoria.codigo.startsWith("Apoyo-"))
                    .map((convocatoria) => (
                      <option key={convocatoria.id} value={convocatoria.id}>
                        {convocatoria.codigo} — {convocatoria.puesto}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <label>Número de preguntas</label>
            <input
              className="number-input"
              type="number"
              min={1}
              value={numeroPreguntasTest}
              onChange={(e) => {
                const valor = Math.max(1, Number(e.target.value));
                setNumeroPreguntasTest(valor);
              }}
            />

            <h3>Generar preguntas por</h3>
            <div className="options">
              <label>
                <input
                  type="radio"
                  checked={modoTest === "TEMA"}
                  onChange={() => setModoTest("TEMA")}
                />{" "}
                Puntos del temario
              </label>
              <label>
                <input
                  type="radio"
                  checked={modoTest === "NORMA"}
                  onChange={() => setModoTest("NORMA")}
                />{" "}
                Ley o norma
              </label>
            </div>

            {modoTest === "TEMA" ? (
              <div className="selection-list">
                {temasTest.map((tema) => (
                  <label key={tema.id} className="selection-item">
                    <input
                      type="checkbox"
                      checked={temasSeleccionados.includes(tema.id)}
                      onChange={() =>
                        toggle(
                          String(tema.id),
                          temasSeleccionados.map(String),
                          (valores) =>
                            setTemasSeleccionados(valores.map(Number))
                        )
                      }
                    />
                    <span>
                      {tema.numero_tema}. {tema.parte} — {tema.titulo}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="selection-list">
                {normasTest.map((norma) => (
                  <label key={norma.norma_clave} className="selection-item">
                    <input
                      type="checkbox"
                      checked={normasSeleccionadas.includes(norma.norma_clave)}
                      onChange={() =>
                        toggle(
                          norma.norma_clave,
                          normasSeleccionadas,
                          setNormasSeleccionadas
                        )
                      }
                    />
                    <span>
                      {norma.norma_nombre}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <button
                className="primary"
                disabled={
                  ocupado ||
                  (!estadoSuscripcion?.suscrito &&
                    (!prueba24hActiva ||
                      (estadoSuscripcion?.prueba_24h_tests_restantes ?? 0) <= 0))
                }
                onClick={crearTest}
              >
                {ocupado ? "Creando..." : "Crear test"}
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Mis tests</h2>
            {misTests.length === 0 ? (
              <p className="muted">Todavía no hay tests guardados.</p>
            ) : (
              <div className="saved-list">
                {misTests.map((test) => (
                  <div className="saved-row" key={test.id}>
                    <div className="saved-main">
                      <strong>
                        Nº {test.numero} ·{" "}
                        {test.convocatoria_codigo ??
                          `Convocatoria ${test.convocatoria_id}`}
                      </strong>
                      <div className="muted">
                        {new Date(test.fecha_generacion).toLocaleString("es-ES")} ·{" "}
                        {test.total_preguntas} preguntas · {test.contestadas} contestadas
                      </div>
                    </div>
                    <span
                      className={
                        test.estado === "FINALIZADO"
                          ? "status status-finished"
                          : "status status-pending"
                      }
                    >
                      {test.estado === "FINALIZADO" ? "Corregido" : "Pendiente"}
                    </span>
                    <div className="saved-actions">
                      <button
                        className="secondary"
                        disabled={ocupado}
                        onClick={() => abrirSimulacro(test)}
                      >
                        {test.estado === "FINALIZADO"
                          ? "Ver corrección"
                          : itemSoloLectura(test)
                            ? "Ver preguntas"
                            : "Continuar"}
                      </button>
                      {!itemSoloLectura(test) && (
                        <button
                          className="danger"
                          disabled={ocupado}
                          onClick={() => eliminarGuardado(test)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </>
      )}

      {simulacroId !== null && (
        <section className="card sticky-actions">
          <div className="simulacro-toolbar">
            <div>
              <strong>{tipoActivo === "TEST" ? "Test" : "Simulacro"} {simulacroId}</strong>
              <div className="muted">
                {resultado
                  ? "Prueba corregida. Puedes revisar el resultado, descargar los PDFs o volver a tu espacio de trabajo."
                  : vistaPrueba === "RESUMEN"
                    ? "Elige si quieres realizar la prueba en pantalla o trabajar con los documentos PDF."
                    : evaluarSeguridad
                      ? "Marca respuesta y seguridad en cada pregunta contestada."
                      : "Marca la respuesta de cada pregunta."}
              </div>
            </div>
            <div className="toolbar-actions">
              <button
                className="secondary"
                disabled={ocupado}
                onClick={() => salirDePrueba("INICIO")}
              >
                Inicio
              </button>
              <button
                className="secondary"
                disabled={ocupado}
                onClick={() => salirDePrueba("LISTA")}
              >
                {tipoActivo === "TEST" ? "Volver a mis tests" : "Volver a mis simulacros"}
              </button>
              {!resultado && vistaPrueba === "RESUMEN" && !modoSoloLecturaActivo && (
                <button
                  className="primary"
                  disabled={ocupado}
                  onClick={() => {
                    setVistaPrueba("PREGUNTAS");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Realizar en pantalla
                </button>
              )}
              {!resultado && !modoSoloLecturaActivo && vistaPrueba === "PREGUNTAS" && (
                <>
                  <button className="secondary" disabled={ocupado} onClick={guardar}>
                    {ocupado && accionEnCurso?.startsWith("Guardando respuestas")
                      ? "Guardando..."
                      : "Guardar respuestas"}
                  </button>
                  <button className="primary calificar-button" disabled={ocupado} onClick={calificar}>
                    {ocupado && accionEnCurso?.includes("calificando")
                      ? "Calificando..."
                      : `Calificar ${tipoActivo === "TEST" ? "test" : "simulacro"}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {simulacroId !== null && !resultado && vistaPrueba === "PREGUNTAS" && (
        <section className="card">
          {modoSoloLecturaActivo ? (
            <div className="working" style={{ marginBottom: 18 }}>
              Histórico en modo solo lectura. Las respuestas no pueden modificarse.
            </div>
          ) : (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={mostrarCronometro}
                  onChange={(event) => setMostrarCronometro(event.target.checked)}
                />
                <span>Mostrar cronómetro</span>
              </label>
              <p className="muted" style={{ marginTop: 0 }}>
                El tiempo se registra igualmente aunque el cronómetro permanezca oculto.
              </p>

              {mostrarCronometro && inicioCorreccionMs !== null && (
                <div className="floating-timer" role="status" aria-live="polite">
                  <CronometroCorreccion
                    inicioMs={inicioCorreccionMs}
                    tiempoPrevio={tiempoPrevioCorreccion}
                  />
                </div>
              )}

              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
                <input
                  type="checkbox"
                  checked={evaluarSeguridad}
                  onChange={(event) =>
                    cambiarEvaluacionSeguridad(event.target.checked)
                  }
                />
                <span>Evaluar seguridad en las respuestas</span>
              </label>
            </>
          )}

          {preguntas.map((pregunta) => {
            const local = respuestas[pregunta.simulacro_pregunta_id] ?? {
              respuesta: null,
              seguridad: null,
            };

            const opciones = [
              ["A", pregunta.opcion_a],
              ["B", pregunta.opcion_b],
              ["C", pregunta.opcion_c],
              ["D", pregunta.opcion_d],
            ];

            return (
              <article
                className="question"
                key={pregunta.simulacro_pregunta_id}
              >
                <strong>
                  {pregunta.orden}. {pregunta.parte_nombre ?? ""}
                </strong>
                <p>{pregunta.enunciado}</p>

                <div className="answer-options">
                  {opciones.map(([letra, texto]) => (
                    <label className="answer-line" key={letra}>
                      <input
                        type="radio"
                        name={`respuesta-${pregunta.simulacro_pregunta_id}`}
                        checked={local.respuesta === letra}
                        disabled={modoSoloLecturaActivo}
                        onChange={() =>
                          establecerRespuesta(
                            pregunta.simulacro_pregunta_id,
                            letra
                          )
                        }
                      />
                      <span>
                        <strong>{letra}.</strong> {texto}
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    className="link-button"
                    disabled={modoSoloLecturaActivo}
                    onClick={() =>
                      establecerRespuesta(
                        pregunta.simulacro_pregunta_id,
                        null
                      )
                    }
                  >
                    Dejar en blanco
                  </button>
                </div>

                {evaluarSeguridad && local.respuesta && (
                  <div className="security-box">
                    <span>Seguridad:</span>
                    {SEGURIDADES.map(([valor, etiqueta]) => (
                      <label key={valor}>
                        <input
                          type="radio"
                          name={`seguridad-${pregunta.simulacro_pregunta_id}`}
                          checked={local.seguridad === valor}
                          disabled={modoSoloLecturaActivo}
                          onChange={() =>
                            establecerSeguridad(
                              pregunta.simulacro_pregunta_id,
                              valor
                            )
                          }
                        />{" "}
                        {etiqueta}
                      </label>
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {!modoSoloLecturaActivo && (
            <div className="row final-actions">
              <button className="secondary" disabled={ocupado} onClick={guardar}>
                {ocupado && accionEnCurso?.startsWith("Guardando respuestas")
                  ? "Guardando..."
                  : "Guardar respuestas"}
              </button>
              <button className="primary calificar-button" disabled={ocupado} onClick={calificar}>
                {ocupado && accionEnCurso?.includes("calificando")
                  ? "Calificando..."
                  : `Calificar ${tipoActivo === "TEST" ? "test" : "simulacro"}`}
              </button>
            </div>
          )}
        </section>
      )}

      {resultado && mostrarCorreccionPantalla && (
        <section className="card">
          <div className="row space-between">
            <h2>Corrección en pantalla</h2>
            <button
              className="secondary"
              onClick={() => salirDePrueba("LISTA")}
            >
              {tipoActivo === "TEST" ? "Volver a mis tests" : "Volver a mis simulacros"}
            </button>
          </div>

          {correccion.map((pregunta) => (
            <article
              className={`question correction ${pregunta.resultado.toLowerCase()}`}
              key={pregunta.simulacro_pregunta_id}
            >
              <div className="row space-between">
                <strong>
                  {pregunta.orden}. {pregunta.parte_nombre ?? ""}
                </strong>
                <span className="result-label">
                  {pregunta.resultado === "ACIERTO"
                    ? "Acierto"
                    : pregunta.resultado === "FALLO"
                    ? "Fallo"
                    : "No contestada"}
                </span>
              </div>

              <p>{pregunta.enunciado}</p>
              <p className="option">A. {pregunta.opcion_a}</p>
              <p className="option">B. {pregunta.opcion_b}</p>
              <p className="option">C. {pregunta.opcion_c}</p>
              <p className="option">D. {pregunta.opcion_d}</p>

              <div className="correction-detail">
                <span>
                  Tu respuesta: <strong>{pregunta.respuesta_usuario ?? "—"}</strong>
                </span>
                <span>
                  Correcta: <strong>{pregunta.respuesta_correcta}</strong>
                </span>
                {pregunta.seguridad_usuario && (
                  <span>
                    Seguridad:{" "}
                    <strong>
                      {pregunta.seguridad_usuario.replaceAll("_", " ")}
                    </strong>
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
