type Datos = { categoria_gva?: unknown; url_detalle?: unknown; documentos_pdf?: unknown; bolsas_relacionadas?: unknown; etapa_actual_gva?: unknown; etapa_actual?: unknown };
type Oportunidad = { tipo_proceso: string | null; datos_json: unknown; url_oficial?: string | null };
export function datosOportunidad(p: Oportunidad): Datos {
 return p.datos_json && typeof p.datos_json === "object" ? p.datos_json as Datos : {};
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
