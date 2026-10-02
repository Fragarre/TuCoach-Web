type Datos = { categoria_gva?: unknown; url_detalle?: unknown; documentos_pdf?: unknown; bolsas_relacionadas?: unknown; etapa_actual_gva?: unknown; etapa_actual?: unknown; estado_plazo?: unknown; seguimiento_gva_directo?: unknown };
type Oportunidad = { tipo_proceso: string | null; datos_json: unknown; url_oficial?: string | null; estado_inscripcion?: string | null; inscripcion?: {codigo: string; fecha_cierre?: string | null; fecha_apertura?: string | null} | null };
export function datosOportunidad(p: Oportunidad): Datos {
 let datos = p.datos_json;
 if (typeof datos === "string") { try { datos = JSON.parse(datos); } catch { return {}; } }
 return datos && typeof datos === "object" ? datos as Datos : {};
}
export function esBolsa(p: Oportunidad) {
 const categoria = datosOportunidad(p).categoria_gva;
 return categoria === "ADC" ? false : categoria === "BOLSA" || p.tipo_proceso?.toLocaleLowerCase("es-ES") === "bolsa de trabajo";
}
export function enlaceOficial(p: Oportunidad) {
 const detalle = datosOportunidad(p).url_detalle;
 const valor = typeof detalle === "string" ? detalle : p.url_oficial;
 if (!valor) return null;
 try {
  const url = new URL(valor);
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  if (url.hostname === "sede.gva.es" && url.pathname === "/detall-ocupacio-publica") url.pathname = "/es/detall-ocupacio-publica";
  return url.toString();
 } catch { return null; }
}
export function documentosOportunidad(p: Oportunidad): Array<{url:string;texto:string}> {
 const documentos = datosOportunidad(p).documentos_pdf;
 if (!Array.isArray(documentos)) return [];
 return documentos.flatMap(x => {
  if (!x || typeof x !== "object" || typeof x.url !== "string") return [];
  try { const url = new URL(x.url); if (!['https:', 'http:'].includes(url.protocol)) return []; } catch { return []; }
  return [{url:x.url,texto:typeof x.texto === "string" && x.texto ? x.texto : "Documento oficial"}];
 });
}

export function esAdc(p: Oportunidad) {
 return datosOportunidad(p).categoria_gva === "ADC" || p.tipo_proceso?.toLocaleLowerCase("es-ES") === "anuncio difícil cobertura (adc)";
}
export function bolsasRelacionadas(p: Oportunidad): string[] {
 const bolsas = datosOportunidad(p).bolsas_relacionadas;
 return Array.isArray(bolsas) ? [...new Set(bolsas.filter((x): x is string => typeof x === "string" && x.trim().length > 0))] : [];
}
export function estadoSolicitud(p: Oportunidad) {
 const estadoGva = datosOportunidad(p).estado_plazo;
 if (esAdc(p) && typeof estadoGva === "string" && ["ABIERTO", "CERRADO", "PENDIENTE_APERTURA"].includes(estadoGva)) return estadoGva;
 return p.inscripcion?.codigo || p.estado_inscripcion || null;
}
export function textoSolicitud(p: Oportunidad): string | null {
 if (!esAdc(p) && !esBolsa(p)) return null;
 const estado = estadoSolicitud(p);
 const cierre = p.inscripcion?.fecha_cierre;
 const apertura = p.inscripcion?.fecha_apertura;
 const fecha = (valor: string) => { const d = new Date(valor); return Number.isNaN(d.getTime()) ? valor : d.toLocaleDateString("es-ES"); };
 if (estado === "CERRADO") return cierre ? `Plazo de solicitudes cerrado el ${fecha(cierre)}` : "Plazo de solicitudes cerrado";
 if (estado === "ABIERTO") return cierre ? `Plazo de solicitudes abierto hasta ${fecha(cierre)}` : "Plazo de solicitudes abierto · consulta el cierre en la ficha oficial";
 if (estado === "PENDIENTE_APERTURA") return apertura ? `Solicitudes a partir del ${fecha(apertura)}` : "Plazo de solicitudes pendiente de apertura";
 if (p.inscripcion?.codigo === "PLAZO_LITERAL" || p.inscripcion?.codigo === "PENDIENTE_BOE") return null;
 return esAdc(p) ? "Consulta el plazo de solicitudes en el anuncio oficial" : "Consulta las condiciones de incorporación en la ficha oficial";
}

export function enlaceGestionBolsa(p: Oportunidad): string | null {
 if (!esBolsa(p)) return null;
 const seguimiento = datosOportunidad(p).seguimiento_gva_directo;
 if (!seguimiento || typeof seguimiento !== "object") return null;
 const fase = (seguimiento as Record<string, unknown>).fase_gva;
 return typeof fase === "string" && fase.includes("https://gvborses.gva.es/gvborses") ? "https://gvborses.gva.es/gvborses" : null;
}
