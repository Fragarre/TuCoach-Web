type Datos = { categoria_gva?: unknown; fase_gva?: unknown; url_detalle?: unknown; documentos_pdf?: unknown; bolsas_relacionadas?: unknown; etapa_actual_gva?: unknown; etapa_actual?: unknown; estado_plazo?: unknown; seguimiento_gva_directo?: unknown };
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

export function bolsaEnFuncionamiento(p: Oportunidad): boolean {
 if (!esBolsa(p)) return false;
 const datos = datosOportunidad(p);
 const seguimiento = datos.seguimiento_gva_directo && typeof datos.seguimiento_gva_directo === "object" ? datos.seguimiento_gva_directo as Record<string,unknown> : {};
 const normalizar = (valor: unknown) => typeof valor === "string" ? valor.trim().toLocaleLowerCase("es-ES").replace(/\s+/g, " ") : "";
 const fase = normalizar(datos.fase_gva);
 const faseDirecta = normalizar(seguimiento.fase_gva);
 // La fase literal publicada prevalece sobre el indicador derivado del importador.
 if (fase) return fase === "bolsa en funcionamiento" || fase === "borsa en funcionament";
 if (faseDirecta) return /^(?:bolsa en funcionamiento|borsa en funcionament)(?:\b|$)/.test(faseDirecta);
 return seguimiento.bolsa_en_funcionamiento === true;
}
export function visibleEnCatalogo(p: Oportunidad): boolean {
 return !esBolsa(p) || bolsaEnFuncionamiento(p);
}

// --- Relación bolsa ↔ ADC ---------------------------------------------------
// Las bolsas llevan su referencia en la denominación ("790-B", "835-L") y los
// ADC listan las referencias de las bolsas a las que se dirigen (a veces solo
// el número). Dos referencias coinciden si el número es igual y, cuando ambas
// traen letra, la letra también. Referencias con "/" (p. ej. 500/22) no se cruzan.
type ClaveBolsa = { numero: string; letra: string | null };
function claveBolsa(ref: string): ClaveBolsa | null {
 const texto = ref.toUpperCase().trim();
 if (/\d\s*\/\s*\d/.test(texto)) return null;
 const m = texto.match(/(\d{2,4})(?:\s*-?\s*([BL]))?\b/);
 return m ? { numero: m[1], letra: m[2] ?? null } : null;
}
export function referenciaBolsa(p: { denominacion: string | null }): string | null {
 const m = (p.denominacion || "").match(/\b(\d{2,4})\s*-\s*([BL])\b/i);
 return m ? `${m[1]}-${m[2].toUpperCase()}` : null;
}
export function mismaBolsa(a: string, b: string): boolean {
 const ka = claveBolsa(a), kb = claveBolsa(b);
 return !!ka && !!kb && ka.numero === kb.numero && (!ka.letra || !kb.letra || ka.letra === kb.letra);
}
export function adcDeBolsa<T extends Oportunidad>(bolsa: { denominacion: string | null }, adcs: T[]): T[] {
 const ref = referenciaBolsa(bolsa);
 if (!ref) return [];
 return adcs.filter(a => esAdc(a) && bolsasRelacionadas(a).some(r => mismaBolsa(r, ref)));
}
