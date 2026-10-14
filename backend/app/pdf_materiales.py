"""
Tu Coach · PDF de materiales normativos (extracto y texto completo).

Interfaz pública sin cambios:
    generar_pdf_material(*, convocatoria_codigo, convocatoria_puesto,
                         norma_nombre, tipo_material, articulos, sufijo)
        -> (filename, bytes)

Diseño:
- portada con ficha de la convocatoria y del material;
- índice con número de página (si hay varios artículos) y marcadores PDF;
- cabecera con la norma y pie con "Página X de Y";
- cada artículo con encabezado propio ("Artículo 3 · Carácter informador y
  fines") sin repetir el número dentro del cuerpo;
- apartados (1., 2.…; Uno., Dos.…; 1.ª…) y letras (a), b)…) en párrafos
  separados con sangría francesa, reconstruidos aunque el corpus guarde el
  artículo en una sola línea;
- artículos derogados/suprimidos atenuados;
- encabezados estructurales (TÍTULO, CAPÍTULO…) que el corpus arrastra al
  final de un artículo se muestran como separadores de sección.

Solo usa fuentes estándar de PDF (sin dependencias nuevas).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

# ---------------------------------------------------------------------------
# Identidad visual
# ---------------------------------------------------------------------------
AZUL = colors.HexColor("#14325C")
AZUL_MEDIO = colors.HexColor("#2D5A94")
ACENTO = colors.HexColor("#C8963E")
GRIS_TEXTO = colors.HexColor("#1F2328")
GRIS_SUAVE = colors.HexColor("#6B7280")
GRIS_LINEA = colors.HexColor("#D9DEE5")
FONDO_FICHA = colors.HexColor("#F3F5F8")

SANS = "Helvetica"
SANS_B = "Helvetica-Bold"
SERIF = "Times-Roman"
SERIF_B = "Times-Bold"
SERIF_I = "Times-Italic"

ANCHO, ALTO = A4
MARGEN_IZQ = 22 * mm
MARGEN_DER = 22 * mm
MARGEN_SUP = 24 * mm
MARGEN_INF = 22 * mm

MIN_ARTICULOS_INDICE = 4


# ---------------------------------------------------------------------------
# Utilidades públicas conservadas
# ---------------------------------------------------------------------------
def _limpiar(texto) -> str:
    valor = str(texto or "").replace("\x00", "").strip()
    return escape(valor).replace("\n", "<br/>")


def _nombre_archivo(texto: str) -> str:
    valor = re.sub(r"[^A-Za-z0-9._-]+", "_", texto.strip())
    return re.sub(r"_+", "_", valor).strip("_") or "material"


def _x(texto: str) -> str:
    """Escapa para Paragraph (mini-HTML de ReportLab)."""
    return escape(str(texto or ""))


# ---------------------------------------------------------------------------
# Análisis del texto de un artículo
# ---------------------------------------------------------------------------
_UNIDAD = r"(?:uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)"
_DECENA = r"(?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)"
_ESPECIAL = r"(?:diez|once|doce|trece|catorce|quince|dieci[a-záéíóú]+|veinte|veinti[a-záéíóú]+)"
_ORDINAL = r"(?:primero|segundo|tercero|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno|d[eé]cimo|[uú]nico)"
_NUM_PALABRAS = (
    rf"(?:(?:cien|ciento)(?:\s+(?:{_DECENA}(?:\s+y\s+{_UNIDAD})?|{_ESPECIAL}|{_UNIDAD}))?"
    rf"|{_DECENA}(?:\s+y\s+{_UNIDAD})?|{_ESPECIAL}|{_UNIDAD}|{_ORDINAL})\b"
)
_SUFIJO = r"(?:\s+(?:bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies|decies))?"
_NUM_ARTICULO = rf"(?:\d+(?:\.\d+-\d+)?{_SUFIJO}|{_NUM_PALABRAS})"
_RE_CABECERA = re.compile(
    rf"^\s*(?:Art[ií]culo|ART[IÍ]CULO|Art\.)\s+({_NUM_ARTICULO})\s*(?:\.|-|–|:)?\s*",
    flags=re.I,
)
_RE_DEROGADO = re.compile(
    r"^\(?\s*(?:derogad[oa]s?|suprimid[oa]s?|sin\s+contenido|anulad[oa])\b",
    flags=re.I,
)
_RE_ESTRUCTURA_FINAL = re.compile(
    r"\s+((?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\s+"
    r"(?:[IVXLC]+|PRELIMINAR|[ÚU]NICO|PRIMER[OA]?|SEGUND[OA]|TERCER[OA]?|\d+\.?ª?)"
    r"\b.{0,200})$"
)
_ORDINALES = [
    "Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho",
    "Nueve", "Diez", "Once", "Doce", "Trece", "Catorce", "Quince",
]
_LETRAS = "abcdefghijklmnñopqrstuvwxyz"


@dataclass
class Bloque:
    nivel: int  # 0 párrafo, 1 apartado, 2 letra
    marca: str
    texto: str


@dataclass
class ArticuloFormateado:
    numero: str
    rubrica: str
    nota: str
    bloques: list[Bloque]
    derogado: bool
    estructura_siguiente: str = ""
    original: dict = field(default_factory=dict)


def _compactar(texto: str) -> str:
    return re.sub(r"[ \t\r\f\v]+", " ", texto).strip()


_RUIDO = [
    # Cabeceras/pies del Diario Oficial de la UE arrastrados desde el PDF.
    re.compile(r"\s*\bES\s+\d{1,2}\.\d{1,2}\.\d{4}\s+Diario Oficial de la Uni[oó]n Europea\s+[CL]\s*\d+(?:\s*[A-Z])?/\d+"),
    re.compile(r"\s*\b[CL]\s*\d+(?:\s*[A-Z])?/\d+\s+Diario Oficial de la Uni[oó]n Europea\s+\d{1,2}\.\d{1,2}\.\d{4}\s+ES\b"),
    re.compile(r"\s*\bDiario Oficial de la Uni[oó]n Europea\s+[CL]\s*\d+(?:\s*[A-Z])?/\d+\s+ES\s+\d{1,2}\.\d{1,2}\.\d{4}"),
    # Cabecera del DOGV: "Núm. 10055 / 26.02.2025 11 / 26 CVE: DOGV-C-2025-3226 https://dogv.gva.es/"
    re.compile(r"\s*\bN[uú]m\.\s*\d+\s*/\s*\d{2}\.\d{2}\.\d{4}(?:\s+\d+\s*/\s*\d+)?(?:\s+CVE:\s*\S+)?(?:\s+https?://\S+)?"),
    re.compile(r"\s*\bCVE:\s*DOGV-\S+(?:\s+https?://\S+)?"),
    re.compile(r"\s*\bBOLET[IÍ]N OFICIAL DEL ESTADO\s+LEGISLACI[OÓ]N CONSOLIDADA\b"),
    re.compile(r"\s*\bP[aá]gina\s+\d+\b(?=\s|$)"),
]


def _limpiar_ruido(texto: str) -> str:
    for patron in _RUIDO:
        texto = patron.sub("", texto)
    return _compactar(texto)


def _rubrica_desde_titulo(titulo: str, numero: str) -> str:
    m = _RE_CABECERA.match(titulo or "")
    if not m:
        return ""
    resto = titulo[m.end():].strip(" .")
    if not resto or resto[0].islower():
        return ""
    return resto


def _separar_rubrica(cuerpo: str, max_palabras: int = 30) -> tuple[str, str]:
    """'Objeto. La presente ley…' -> ('Objeto', 'La presente ley…')."""
    if not cuerpo or not cuerpo[0].isupper():
        return "", cuerpo
    if re.match(r"^(?:\d|Uno\.|Primero\.|\()", cuerpo):
        return "", cuerpo
    # Rúbrica terminada en punto: frase corta sin verbo de inicio de apartado.
    m = re.match(r"^([^.:;]{2,220}?)\.\s+(?=[A-ZÁÉÍÓÚÑ0-9«\"(¿])", cuerpo)
    if m and len(m.group(1).split()) <= max_palabras:
        rubrica = m.group(1).strip()
        resto = cuerpo[m.end():].strip()
        # "Rúbrica 1. Texto…": el número final es el primer apartado.
        mn = re.match(r"^(.*\D)\s+(\d{1,2})$", rubrica)
        if mn:
            return mn.group(1).strip(), f"{mn.group(2)}. {resto}"
        return rubrica, resto
    # Rúbrica sin punto (textos extraídos de PDF): "Ámbito de aplicación 1. El…"
    m = re.match(r"^([^.:;]{2,120}?)\s+(?=1\.\s+[A-ZÁÉÍÓÚÑ«])", cuerpo)
    if m:
        return m.group(1).strip(), cuerpo[m.end():].strip()
    return "", cuerpo


def _marcas_secuenciales(texto: str, patron: re.Pattern, esperado) -> list[tuple[int, int, str]]:
    """Posiciones de marcas que forman una secuencia 1,2,3… (o a,b,c…)."""
    encontrados: list[tuple[int, int, str]] = []
    indice = 0
    for m in patron.finditer(texto):
        marca = m.group("m")
        if indice < len(esperado) and esperado[indice](marca):
            encontrados.append((m.start("m"), m.end(), marca))
            indice += 1
    return encontrados if len(encontrados) >= 2 or (
        encontrados and encontrados[0][0] == 0
    ) else []


def _dividir(texto: str, marcas: list[tuple[int, int, str]]) -> tuple[str, list[tuple[str, str]]]:
    if not marcas:
        return texto.strip(), []
    previo = texto[: marcas[0][0]].strip()
    partes = []
    for i, (inicio, fin, marca) in enumerate(marcas):
        hasta = marcas[i + 1][0] if i + 1 < len(marcas) else len(texto)
        partes.append((marca, texto[fin:hasta].strip()))
    return previo, partes


_FRONTERA = r"(?:(?<=^)|(?<=[.:;])\s+|\n+\s*)"
_RE_APARTADO_NUM = re.compile(_FRONTERA + r"(?P<m>\d{1,2})\.(?!\d)(?:\s+|(?=[A-ZÁÉÍÓÚ]))(?=[A-ZÁÉÍÓÚÑ«\"(¿]|[a-z]\))")
_RE_APARTADO_ORD = re.compile(_FRONTERA + r"(?P<m>(?:" + "|".join(_ORDINALES) + r"))\.\s+(?=[A-ZÁÉÍÓÚÑ«\"(])")
_RE_APARTADO_ORDINAL_A = re.compile(_FRONTERA + r"(?P<m>\d{1,2}\.ª)\s+")
_RE_LETRA = re.compile(_FRONTERA + r"(?P<m>[a-zñ](?:\s?bis)?)\)\s+")


def _esperados_numeros():
    return [lambda m, n=n: m == str(n) for n in range(1, 60)]


def _esperados_ordinales():
    return [lambda m, o=o: m == o for o in _ORDINALES]


def _esperados_ordinal_a():
    return [lambda m, n=n: m == f"{n}.ª" for n in range(1, 40)]


def _esperados_letras():
    salida = []
    for letra in _LETRAS:
        salida.append(lambda m, l=letra: m.replace(" ", "") in {l, l + "bis"})
    return salida


def _letras_en(texto: str) -> tuple[str, list[Bloque]]:
    marcas = _marcas_secuenciales(texto, _RE_LETRA, _esperados_letras())
    # Admite "a bis)" intercalada sin romper la secuencia.
    previo, partes = _dividir(texto, marcas)
    return previo, [Bloque(2, f"{m})", t) for m, t in partes if t]


def _estructurar_cuerpo(cuerpo: str) -> list[Bloque]:
    bloques: list[Bloque] = []
    for patron, esperado in (
        (_RE_APARTADO_NUM, _esperados_numeros()),
        (_RE_APARTADO_ORD, _esperados_ordinales()),
        (_RE_APARTADO_ORDINAL_A, _esperados_ordinal_a()),
    ):
        marcas = _marcas_secuenciales(cuerpo, patron, esperado)
        if marcas:
            previo, partes = _dividir(cuerpo, marcas)
            if previo:
                p_prev, letras_prev = _letras_en(previo)
                if p_prev:
                    bloques.append(Bloque(0, "", p_prev))
                bloques.extend(letras_prev)
            for marca, texto in partes:
                cabeza, letras = _letras_en(texto)
                etiqueta = marca if marca.endswith("ª") else f"{marca}."
                bloques.append(Bloque(1, etiqueta, cabeza))
                bloques.extend(letras)
            return [b for b in bloques if b.texto or b.marca]
    cabeza, letras = _letras_en(cuerpo)
    if cabeza:
        bloques.append(Bloque(0, "", cabeza))
    bloques.extend(letras)
    return bloques


def formatear_articulo(articulo: dict, permitir_rubrica: bool = True) -> ArticuloFormateado:
    texto = str(articulo.get("texto") or "").replace("\x00", "")
    titulo = _compactar(str(articulo.get("titulo_bloque") or ""))
    numero = _compactar(str(articulo.get("articulo_boe") or "")) or ""

    # Párrafos reales (doble salto) se conservan; saltos simples son de maqueta.
    texto = re.sub(r"\n{2,}", "\n\n", texto.replace("\r", ""))
    parrafos = [_compactar(p.replace("\n", " ")) for p in texto.split("\n\n") if p.strip()]
    # Una marca suelta ("1.", "a)", "Uno.") pertenece al párrafo siguiente.
    unidos: list[str] = []
    for parrafo in parrafos:
        if unidos and re.fullmatch(r"(?:\d{1,2}\.ª?|[a-zñ]\)|[A-Z][a-z]{1,8}\.)", unidos[-1]):
            unidos[-1] = f"{unidos[-1]} {parrafo}"
        else:
            unidos.append(parrafo)
    texto = "\n\n".join(_limpiar_ruido(p) for p in unidos)

    estructura = ""
    m = _RE_ESTRUCTURA_FINAL.search(texto)
    if m and len(texto) - len(m.group(1)) > 40:
        estructura = m.group(1).strip()
        texto = texto[: m.start()].rstrip()

    cuerpo = texto
    cab = _RE_CABECERA.match(cuerpo)
    if cab:
        cuerpo = cuerpo[cab.end():].lstrip(" .\n")
    rubrica = _rubrica_desde_titulo(titulo, numero)
    if rubrica:
        if cuerpo.lower().startswith(rubrica.lower()):
            cuerpo = cuerpo[len(rubrica):].lstrip(" .\n")
    elif cab and permitir_rubrica:
        rubrica, cuerpo = _separar_rubrica(cuerpo)

    nota = ""
    mn = re.match(r"^\((antiguos?\s+art[ií]culos?[^)]*)\)\s*", cuerpo, flags=re.I)
    if mn:
        nota = mn.group(1)
        cuerpo = cuerpo[mn.end():].strip()

    rubrica = rubrica.strip(" .")
    derogado = bool(_RE_DEROGADO.match(cuerpo)) or bool(
        _RE_DEROGADO.search(rubrica or "") and len(cuerpo) < 40
    )
    if not numero and cab:
        numero = cab.group(1)
    if not numero:
        numero = _compactar(titulo) or str(articulo.get("id_bloque") or "")

    if derogado:
        bloques = [Bloque(0, "", cuerpo or rubrica)]
    else:
        bloques = _estructurar_cuerpo(cuerpo)
    return ArticuloFormateado(
        numero=numero,
        rubrica=rubrica,
        nota=nota,
        bloques=bloques,
        derogado=derogado,
        estructura_siguiente=estructura,
        original=articulo,
    )


# ---------------------------------------------------------------------------
# Maquetación
# ---------------------------------------------------------------------------
def _estilos() -> dict[str, ParagraphStyle]:
    base = dict(fontName=SERIF, fontSize=10.6, leading=14.6, textColor=GRIS_TEXTO)
    return {
        "marca": ParagraphStyle("marca", fontName=SANS_B, fontSize=9, leading=11,
                                textColor=AZUL, spaceAfter=0),
        "portada_tipo": ParagraphStyle("portada_tipo", fontName=SANS_B, fontSize=10,
                                       leading=13, textColor=ACENTO, spaceAfter=6),
        "portada_titulo": ParagraphStyle("portada_titulo", fontName=SERIF_B, fontSize=24,
                                         leading=29, textColor=AZUL, spaceAfter=10),
        "portada_sub": ParagraphStyle("portada_sub", fontName=SANS, fontSize=10.5,
                                      leading=14, textColor=GRIS_SUAVE),
        "ficha_k": ParagraphStyle("ficha_k", fontName=SANS_B, fontSize=8.2, leading=11,
                                  textColor=GRIS_SUAVE),
        "ficha_v": ParagraphStyle("ficha_v", fontName=SANS, fontSize=9.6, leading=12.5,
                                  textColor=GRIS_TEXTO),
        "aviso": ParagraphStyle("aviso", fontName=SANS, fontSize=8.6, leading=12,
                                textColor=GRIS_SUAVE),
        "indice_titulo": ParagraphStyle("indice_titulo", fontName=SANS_B, fontSize=15,
                                        leading=19, textColor=AZUL, spaceAfter=10),
        "toc": ParagraphStyle("toc", fontName=SANS, fontSize=9.4, leading=13,
                              leftIndent=0, firstLineIndent=0, textColor=GRIS_TEXTO),
        "seccion": ParagraphStyle("seccion", fontName=SANS_B, fontSize=10, leading=13,
                                  textColor=AZUL_MEDIO, spaceBefore=10, spaceAfter=4,
                                  alignment=TA_LEFT),
        "art_titulo": ParagraphStyle("art_titulo", fontName=SANS_B, fontSize=11.6,
                                     leading=15, textColor=AZUL, spaceBefore=0,
                                     spaceAfter=0),
        "art_nota": ParagraphStyle("art_nota", fontName=SERIF_I, fontSize=9.4,
                                   leading=12, textColor=GRIS_SUAVE, spaceAfter=3),
        "p0": ParagraphStyle("p0", alignment=TA_JUSTIFY, spaceAfter=5, **base),
        "p1": ParagraphStyle("p1", alignment=TA_JUSTIFY, spaceAfter=5,
                             leftIndent=8 * mm, bulletIndent=0, bulletFontName=SANS_B,
                             bulletFontSize=9.2, bulletColor=AZUL, **base),
        "p2": ParagraphStyle("p2", alignment=TA_JUSTIFY, spaceAfter=3.5,
                             leftIndent=14 * mm, bulletIndent=8 * mm, bulletFontName=SANS_B,
                             bulletFontSize=9.2, bulletColor=AZUL, **base),
        "derogado": ParagraphStyle("derogado", fontName=SERIF_I, fontSize=10.2,
                                   leading=13.5, textColor=GRIS_SUAVE, spaceAfter=5),
    }


class _CabeceraArticulo(Flowable):
    """Encabezado de artículo: filete de acento + título; registra índice y marcador."""

    def __init__(self, texto_html: str, entrada_indice: str, clave: str, estilo: ParagraphStyle):
        super().__init__()
        self.parrafo = Paragraph(texto_html, estilo)
        self.entrada_indice = entrada_indice
        self.clave = clave
        self._alto = 0.0

    def wrap(self, disponible_ancho, disponible_alto):
        _, alto = self.parrafo.wrap(disponible_ancho - 4 * mm, disponible_alto)
        self._alto = alto + 2.2 * mm
        self.ancho = disponible_ancho
        return disponible_ancho, self._alto

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(ACENTO)
        c.rect(0, 0.6 * mm, 1.1 * mm, self._alto - 1.2 * mm, stroke=0, fill=1)
        c.setStrokeColor(GRIS_LINEA)
        c.setLineWidth(0.4)
        c.line(4 * mm, 0.2 * mm, self.ancho, 0.2 * mm)
        c.restoreState()
        self.parrafo.drawOn(c, 4 * mm, 1.4 * mm)
        c.bookmarkPage(self.clave)
        c.addOutlineEntry(self.entrada_indice, self.clave, level=0, closed=True)


class _Documento(BaseDocTemplate):
    def __init__(self, *args, norma: str, tipo: str, codigo: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.norma = norma
        self.tipo = tipo
        self.codigo = codigo
        marco = Frame(MARGEN_IZQ, MARGEN_INF, ANCHO - MARGEN_IZQ - MARGEN_DER,
                      ALTO - MARGEN_SUP - MARGEN_INF, id="cuerpo",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="portada", frames=[marco], onPage=self._portada),
            PageTemplate(id="cuerpo", frames=[marco], onPage=self._pagina),
        ])

    def afterFlowable(self, flowable):
        if isinstance(flowable, _CabeceraArticulo):
            self.notify("TOCEntry", (0, flowable.entrada_indice, self.page, flowable.clave))

    def _portada(self, c, doc):
        c.saveState()
        c.setFillColor(AZUL)
        c.rect(0, ALTO - 58 * mm, ANCHO, 58 * mm, stroke=0, fill=1)
        c.setFillColor(ACENTO)
        c.rect(0, ALTO - 59.6 * mm, ANCHO, 1.6 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont(SANS_B, 22)
        c.drawString(MARGEN_IZQ, ALTO - 28 * mm, "TU COACH")
        c.setFont(SANS, 10)
        c.drawString(MARGEN_IZQ, ALTO - 36 * mm, "Material de estudio normativo")
        c.setFillColor(GRIS_SUAVE)
        c.setFont(SANS, 7.8)
        c.drawString(MARGEN_IZQ, 12 * mm,
                     "Texto normativo reproducido con fines de estudio. "
                     "Consulte la fuente oficial para su uso jurídico.")
        c.restoreState()

    def _pagina(self, c, doc):
        c.saveState()
        y = ALTO - 14 * mm
        c.setFont(SANS_B, 7.6)
        c.setFillColor(AZUL)
        c.drawString(MARGEN_IZQ, y, "TU COACH")
        c.setFont(SANS, 7.6)
        c.setFillColor(GRIS_SUAVE)
        c.drawRightString(ANCHO - MARGEN_DER, y, self.tipo)
        disponible = (ANCHO - MARGEN_DER - c.stringWidth(self.tipo, SANS, 7.6) - 6 * mm) - (MARGEN_IZQ + 19 * mm)
        norma = self.norma
        if c.stringWidth(norma, SANS, 7.6) > disponible:
            while norma and c.stringWidth(norma + "…", SANS, 7.6) > disponible:
                norma = norma[:-1]
            norma = norma.rstrip(" ,") + "…"
        c.drawString(MARGEN_IZQ + 19 * mm, y, norma)
        c.setStrokeColor(GRIS_LINEA)
        c.setLineWidth(0.5)
        c.line(MARGEN_IZQ, y - 2.6 * mm, ANCHO - MARGEN_DER, y - 2.6 * mm)
        c.line(MARGEN_IZQ, 15 * mm, ANCHO - MARGEN_DER, 15 * mm)
        c.drawString(MARGEN_IZQ, 10.5 * mm, f"Convocatoria {self.codigo}")
        c.restoreState()


class _LienzoNumerado(rl_canvas.Canvas):
    """Añade 'Página X de Y' cuando ya se conoce el total."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._paginas: list[dict] = []

    def showPage(self):
        self._paginas.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._paginas)
        for estado in self._paginas:
            self.__dict__.update(estado)
            if self._pageNumber > 1:
                self.saveState()
                self.setFont(SANS, 7.6)
                self.setFillColor(GRIS_SUAVE)
                self.drawRightString(ANCHO - MARGEN_DER, 10.5 * mm,
                                     f"Página {self._pageNumber} de {total}")
                self.restoreState()
            super().showPage()
        super().save()


def _trozos(texto: str, maximo: int = 1600) -> list[str]:
    """
    Divide párrafos muy largos en frases agrupadas: ReportLab parte un párrafo
    entre páginas con coste cuadrático y textos de decenas de miles de
    caracteres (anexos, tablas aplanadas) bloquean la generación.
    """
    salida: list[str] = []
    for parrafo in [t.strip() for t in texto.split("\n\n") if t.strip()]:
        while len(parrafo) > maximo:
            corte = parrafo.rfind(". ", 0, maximo)
            if corte < maximo // 3:
                corte = parrafo.rfind(" ", 0, maximo)
            if corte <= 0:
                corte = maximo
            salida.append(parrafo[: corte + 1].strip())
            parrafo = parrafo[corte + 1:].strip()
        if parrafo:
            salida.append(parrafo)
    return salida or [""]


def _ficha(filas: list[tuple[str, str]], est: dict) -> Table:
    datos = [[Paragraph(_x(k).upper(), est["ficha_k"]), Paragraph(_x(v), est["ficha_v"])]
             for k, v in filas if v]
    tabla = Table(datos, colWidths=[38 * mm, ANCHO - MARGEN_IZQ - MARGEN_DER - 38 * mm])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FONDO_FICHA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4 * mm),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, GRIS_LINEA),
        ("LINEBEFORE", (0, 0), (0, -1), 1.6, ACENTO),
    ]))
    return tabla


def _titulo_articulo(a: ArticuloFormateado) -> tuple[str, str]:
    numero = a.numero
    etiqueta = numero if re.match(r"(?i)^(art|disp|anexo|pre[aá]mbulo)", numero) else f"Artículo {numero}"
    html = _x(etiqueta)
    plano = etiqueta
    if a.rubrica:
        html += f'<font color="#C8963E">  ·  </font><font color="#1F2328">{_x(a.rubrica)}</font>'
        plano += f". {a.rubrica}"
    if a.derogado:
        html += ' <font name="Helvetica" size="8.5" color="#6B7280">(sin contenido vigente)</font>'
    return html, plano


def _norma_con_rubricas(articulos: list[dict]) -> bool:
    """
    Algunas normas titulan cada artículo ("Artículo 1. Objeto.") y otras no
    (Constitución). Solo se separa la rúbrica del cuerpo si la mayoría de los
    artículos empieza con una frase breve de rúbrica.
    """
    candidatos = 0
    evaluados = 0
    for articulo in articulos:
        if _rubrica_desde_titulo(_compactar(str(articulo.get("titulo_bloque") or "")), ""):
            candidatos += 1
            evaluados += 1
            continue
        texto = _compactar(str(articulo.get("texto") or "").replace("\n", " "))
        cab = _RE_CABECERA.match(texto)
        if not cab:
            continue
        cuerpo = texto[cab.end():].lstrip(" .")
        if _RE_DEROGADO.match(cuerpo):
            continue
        evaluados += 1
        rubrica = _separar_rubrica(cuerpo, max_palabras=12)[0]
        # Una frase que empieza por artículo/pronombre suele ser cuerpo, no rúbrica.
        if rubrica and not re.match(
            r"(?i)^(?:el|la|los|las|un|una|se|son|es|todo|toda|cuando|si|en|para|"
            r"con|por|contra|no|ningún|ninguna|corresponde|podrán|serán)\b",
            rubrica,
        ):
            candidatos += 1
    return evaluados > 0 and candidatos / evaluados >= 0.6


_ORDEN_SUFIJOS = ["", "bis", "ter", "quater", "quinquies", "sexies", "septies",
                  "octies", "nonies", "decies"]


def _clave_orden(articulo: dict) -> tuple:
    """1 < 1 bis < 1 ter < 1 quáter < 2; 1.3-2 < 1.3-10; resto al final."""
    texto = _compactar(str(articulo.get("articulo_boe") or "")).lower()
    texto = texto.replace("á", "a")
    m = re.match(r"^(\d+)(?:\.(\d+)-(\d+))?\s*([a-z]*)", texto)
    if not m:
        return (1, 0, 0, 0, 0, texto)
    sufijo = m.group(4)
    orden_sufijo = _ORDEN_SUFIJOS.index(sufijo) if sufijo in _ORDEN_SUFIJOS else 99
    return (0, int(m.group(1)), int(m.group(2) or 0), int(m.group(3) or 0),
            orden_sufijo, texto)


def generar_pdf_material(
    *,
    convocatoria_codigo: str,
    convocatoria_puesto: str,
    norma_nombre: str,
    tipo_material: str,
    articulos: list[dict],
    sufijo: str,
) -> tuple[str, bytes]:
    if not articulos:
        raise ValueError("No hay artículos disponibles para generar el PDF.")

    est = _estilos()
    articulos = sorted(articulos, key=_clave_orden)
    con_rubrica = _norma_con_rubricas(articulos)
    formateados = [formatear_articulo(a, con_rubrica) for a in articulos]
    es_extracto = "extracto" in (sufijo or "").lower() or "extracto" in tipo_material.lower()
    vigentes = sum(1 for a in formateados if not a.derogado)

    buffer = BytesIO()
    doc = _Documento(
        buffer,
        pagesize=A4,
        leftMargin=MARGEN_IZQ, rightMargin=MARGEN_DER,
        topMargin=MARGEN_SUP, bottomMargin=MARGEN_INF,
        title=f"Tu Coach - {norma_nombre}",
        author="Tu Coach",
        subject=tipo_material,
        norma=str(norma_nombre or ""),
        tipo=str(tipo_material or ""),
        codigo=str(convocatoria_codigo or ""),
    )

    historia: list = [
        Spacer(1, 46 * mm),
        Paragraph(_x(tipo_material).upper(), est["portada_tipo"]),
        Paragraph(_x(norma_nombre), est["portada_titulo"]),
        Spacer(1, 6 * mm),
        _ficha([
            ("Convocatoria", convocatoria_codigo),
            ("Puesto", _compactar(str(convocatoria_puesto or ""))),
            ("Contenido", (
                f"{len(formateados)} artículos del temario de esta convocatoria"
                if es_extracto else
                f"{len(formateados)} artículos ({vigentes} con contenido vigente)"
            )),
            ("Fuente", str(articulos[0].get("id_boe") or "")),
            ("Generado", date.today().strftime("%d/%m/%Y")),
        ], est),
        Spacer(1, 8 * mm),
        Paragraph(
            "Incluye exclusivamente los artículos vinculados al temario oficial de "
            "esta convocatoria, ordenados por número." if es_extracto else
            "Texto íntegro de la norma según el corpus consolidado de Tu Coach, "
            "ordenado por artículos.",
            est["aviso"],
        ),
        NextPageTemplate("cuerpo"),
        PageBreak(),
    ]

    if len(formateados) >= MIN_ARTICULOS_INDICE:
        indice = TableOfContents()
        indice.levelStyles = [est["toc"]]
        indice.dotsMinLevel = 0
        historia += [Paragraph("Índice", est["indice_titulo"]), indice, PageBreak()]

    for i, a in enumerate(formateados):
        html, plano = _titulo_articulo(a)
        entrada = plano
        if not a.rubrica and a.bloques and not a.derogado:
            inicio = a.bloques[0].texto
            if len(inicio) > 46:
                inicio = inicio[:46].rsplit(" ", 1)[0].rstrip(",;:.") + "…"
            entrada = f"{plano} — {inicio}" if inicio else plano
        elif a.derogado:
            entrada = f"{plano} (sin contenido vigente)"
        cabecera = _CabeceraArticulo(html, entrada, f"art{i}", est["art_titulo"])
        primeros: list = [CondPageBreak(30 * mm), cabecera, Spacer(1, 2.4 * mm)]
        if a.nota:
            primeros.append(Paragraph(_x(f"({a.nota})"), est["art_nota"]))
        cuerpo: list = []
        for b in a.bloques:
            if a.derogado:
                cuerpo.extend(Paragraph(_x(t), est["derogado"]) for t in _trozos(b.texto) if t)
            elif b.nivel == 0:
                cuerpo.extend(Paragraph(_x(t), est["p0"]) for t in _trozos(b.texto) if t)
            else:
                estilo = est["p1"] if b.nivel == 1 else est["p2"]
                trozos = _trozos(b.texto)
                cuerpo.append(Paragraph(_x(trozos[0]), estilo, bulletText=b.marca))
                cuerpo.extend(Paragraph(_x(t), estilo) for t in trozos[1:])
        # El título nunca queda huérfano al pie de página.
        historia.append(KeepTogether(primeros + cuerpo[:1]))
        historia.extend(cuerpo[1:])
        historia.append(Spacer(1, 5 * mm))
        if a.estructura_siguiente and i + 1 < len(formateados):
            partes = re.split(r"\s+(?=(?:T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N|Secci[oó]n)\s)",
                              a.estructura_siguiente)
            historia.append(Paragraph("<br/>".join(_x(t) for t in partes if t), est["seccion"]))

    doc.multiBuild(historia, canvasmaker=_LienzoNumerado)
    pdf = buffer.getvalue()
    buffer.close()

    filename = (
        f"{_nombre_archivo(convocatoria_codigo)}_"
        f"{_nombre_archivo(norma_nombre)}_{sufijo}.pdf"
    )
    return filename, pdf
