from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_DESTINATARIO = "soporte@tucoach-oposiciones.com"
_REMITENTE = "Tu Coach <noreply@tucoach-oposiciones.com>"
_RESEND_URL = "https://api.resend.com/emails"


def enviar_notificacion_admin(*, asunto: str, texto: str, idempotency_key: str) -> bool:
    """
    Envía una notificación administrativa mediante Resend.

    Es deliberadamente independiente de la funcionalidad pública de Contacto.
    Un fallo de correo nunca debe interrumpir registro, autenticación o pagos.
    """
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY no configurada; notificación administrativa omitida.")
        return False

    try:
        respuesta = httpx.post(
            _RESEND_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
            },
            json={
                "from": _REMITENTE,
                "to": [_DESTINATARIO],
                "subject": asunto,
                "text": texto,
            },
            timeout=10.0,
        )
        respuesta.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("No se pudo enviar la notificación administrativa.")
        return False
