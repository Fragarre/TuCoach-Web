"""Filtro de dificultad para la selección de preguntas de simulacros y test.

Calcula la dificultad de cada pregunta a partir de los datos que ya trae la
consulta de candidatas (tipo de fuente, enunciado y opciones). No consulta ni
modifica ninguna base de datos.

Se activa con la variable de entorno OPOCOACH_FILTRO_DIFICULTAD=1.
Si no está definida o vale otra cosa, la selección funciona exactamente igual que antes.

Nivel (1 = más difícil):
  1  pregunta no generada por IA y con pocas pistas (puntuación < 40)
  2  no IA con muchas pistas, o IA con muy pocas pistas (< 20)
  3  IA con pistas entre 20 y 39
  4  IA con muchas pistas (>= 40)
Solo se puntúan las preguntas JURIDICAS. El resto (informática, temas no
jurídicos) cuenta siempre como nivel 1, así que no se ve afectado.
"""
from __future__ import annotations

import os
import re

MULTIPLICADOR_MINIMO = 8

_ABS = re.compile(
    r"\b(siempre|nunca|en ningún caso|en todo caso|exclusivamente|únicamente|solo|sólo|"
    r"cualquier|todos? los|jamás|sin excepción|con independencia)\b",
    re.I,
)
_TODAS = re.compile(
    r"todas (las )?(anteriores|opciones|respuestas)? ?(son )?correctas|todas las anteriores",
    re.I,
)


def filtro_activo() -> bool:
    return os.getenv("OPOCOACH_FILTRO_DIFICULTAD", "").strip() == "1"


def _palabras(texto: str) -> set[str]:
    return {p for p in re.findall(r"\w+", (texto or "").lower()) if len(p) > 5}


def puntuacion_pistas(enunciado: str, opciones: dict[str, str], correcta: str) -> int:
    if correcta not in opciones:
        return 0
    s = 0
    largos = {k: len(v or "") for k, v in opciones.items()}
    orden = sorted(largos.values(), reverse=True)
    if largos[correcta] == orden[0] and orden[0] > orden[1]:
        s += 25
        if largos[correcta] >= 1.3 * orden[1]:
            s += 10
    if not _ABS.search(opciones[correcta] or ""):
        n = sum(1 for k, v in opciones.items() if k != correcta and _ABS.search(v or ""))
        if n:
            s += min(30, 12 * n)
    if _TODAS.search(opciones[correcta] or ""):
        s += 15
    e = _palabras(enunciado)
    coinc = {k: len(e & _palabras(v)) for k, v in opciones.items()}
    if coinc[correcta] > 0 and coinc[correcta] == max(coinc.values()) and list(coinc.values()).count(coinc[correcta]) == 1:
        s += 15
    if len(enunciado or "") < 90:
        s += 10
    return min(s, 100)


_CACHE_NIVELES: dict[int, int] = {}


def nivel_dificultad(pregunta) -> int:
    try:
        clave = int(pregunta["pregunta_id"])
    except (KeyError, IndexError, TypeError, ValueError):
        return _calcular_nivel(pregunta)
    if clave not in _CACHE_NIVELES:
        _CACHE_NIVELES[clave] = _calcular_nivel(pregunta)
    return _CACHE_NIVELES[clave]


def _calcular_nivel(pregunta) -> int:
    if str(pregunta["tipo_clasificacion"] or "").strip().upper() != "JURIDICA":
        return 1
    correcta = str(pregunta["respuesta_correcta"] or "").strip().upper()
    opciones = {
        "A": pregunta["opcion_a"], "B": pregunta["opcion_b"],
        "C": pregunta["opcion_c"], "D": pregunta["opcion_d"],
    }
    p = puntuacion_pistas(pregunta["enunciado"], opciones, correcta)
    ia = str(pregunta["tipo_fuente"] or "").strip().lower() == "ia_generada"
    if not ia and p < 40:
        return 1
    if (not ia and p >= 40) or (ia and p < 20):
        return 2
    if ia and p < 40:
        return 3
    return 4


def filtrar_por_dificultad(candidatas: list, cantidad: int) -> list:
    """Devuelve el subconjunto más difícil que conserve al menos 8 veces lo necesario.

    Si el filtro está desactivado, o ni sumando niveles se llega al mínimo,
    devuelve las candidatas sin cambios.
    """
    if not filtro_activo() or cantidad <= 0 or not candidatas:
        return candidatas
    objetivo = MULTIPLICADOR_MINIMO * cantidad
    niveles = [(p, nivel_dificultad(p)) for p in candidatas]
    for tope in (1, 2, 3):
        pool = [p for p, n in niveles if n <= tope]
        if len(pool) >= objetivo:
            return pool
    return candidatas
