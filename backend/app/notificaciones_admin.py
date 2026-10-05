from __future__ import annotations

import logging
import os

import httpx

from app.postgres import conectar_postgres

logger = logging.getLogger(__name__)

_DESTINATARIO = "soporte@tucoach-oposiciones.com"
_REMITENTE = "Tu Coach <soporte@tucoach-oposiciones.com>"
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


def notificar_registro_confirmado(*, user_id, email: str) -> bool:
    """
    Reclama de forma atómica la notificación de registro y la envía una sola vez.
    Si el envío falla, libera la marca para permitir un reintento posterior.
    """
    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.profiles
                SET registro_notificado_at = now()
                WHERE id = %s
                  AND registro_notificado_at IS NULL
                RETURNING registro_notificado_at
                """,
                (user_id,),
            )
            reclamado = cur.fetchone() is not None
        con.commit()

    if not reclamado:
        return True

    enviado = enviar_notificacion_admin(
        asunto="Tu Coach · Nuevo registro confirmado",
        texto=f"Se ha confirmado un nuevo registro en Tu Coach.\n\nUsuario: {email}",
        idempotency_key=f"registro-confirmado-{user_id}",
    )
    if enviado:
        return True

    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.profiles
                SET registro_notificado_at = NULL
                WHERE id = %s
                """,
                (user_id,),
            )
        con.commit()
    return False


def notificar_alta_suscripcion_pagada(
    *, subscription_id: str, user_id, email: str | None = None
) -> bool:
    """
    Envía una sola notificación por el alta pagada de una suscripción.
    No interviene en la concesión de acceso ni en el estado de Stripe.
    """
    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.subscriptions
                SET alta_pagada_notificada_at = now()
                WHERE subscription_id = %s
                  AND alta_pagada_notificada_at IS NULL
                RETURNING alta_pagada_notificada_at
                """,
                (subscription_id,),
            )
            reclamado = cur.fetchone() is not None
        con.commit()

    if not reclamado:
        return True

    identificacion = email or str(user_id)
    enviado = enviar_notificacion_admin(
        asunto="Tu Coach · Nueva suscripción pagada",
        texto=(
            "Se ha confirmado el primer pago de una nueva suscripción en Tu Coach."
            f"\n\nUsuario: {identificacion}"
            f"\nSuscripción Stripe: {subscription_id}"
        ),
        idempotency_key=f"alta-suscripcion-pagada-{subscription_id}",
    )
    if enviado:
        return True

    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.subscriptions
                SET alta_pagada_notificada_at = NULL
                WHERE subscription_id = %s
                """,
                (subscription_id,),
            )
        con.commit()
    return False
