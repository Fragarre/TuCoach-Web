"""
Correos transaccionales dirigidos al usuario de Tu Coach.

Igual que las notificaciones administrativas, un fallo de correo nunca debe
interrumpir el registro, la autenticación ni los pagos: se registra en el log
y se libera la marca de idempotencia para permitir un reintento posterior.
"""

from __future__ import annotations

import html
import logging
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import httpx

from app.postgres import conectar_postgres

logger = logging.getLogger(__name__)

_REMITENTE = "Tu Coach <soporte@tucoach-oposiciones.com>"
_RESPONDER_A = "soporte@tucoach-oposiciones.com"
_RESEND_URL = "https://api.resend.com/emails"
_URL_POR_DEFECTO = "https://tucoach-oposiciones.com"


def _url_plataforma() -> str:
    return (os.getenv("FRONTEND_URL", "").strip() or _URL_POR_DEFECTO).rstrip("/")


def enviar_correo_usuario(
    *, destinatario: str, asunto: str, html_cuerpo: str, texto: str, idempotency_key: str
) -> bool:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY no configurada; correo al usuario omitido.")
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
                "to": [destinatario],
                "reply_to": _RESPONDER_A,
                "subject": asunto,
                "html": html_cuerpo,
                "text": texto,
            },
            timeout=10.0,
        )
        respuesta.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("No se pudo enviar el correo al usuario.")
        return False


# ---------------------------------------------------------------------------
# Bienvenida
# ---------------------------------------------------------------------------

def _componer_bienvenida() -> tuple[str, str, str]:
    """Devuelve (asunto, html, texto) del correo de bienvenida.

    Es deliberadamente impersonal: el registro no pide el nombre, así que no
    se personaliza para evitar saludos incorrectos o vacíos.
    """
    url = _url_plataforma()

    asunto = "Te damos la bienvenida a Tu Coach"

    texto = f"""Hola:

Gracias por registrarte en Tu Coach. Ya puedes empezar a preparar tu oposición con simulacros y tests adaptados a tu temario.

Para empezar:
1. Entra en tu panel: {url}
2. Elige simulacro de la convocatoria que desees o test adaptado a los temas o leyes que elijas.
3. Podrás comprobar que temas dominas y cuáles necesitan más repaso.

Tu opinión es muy importante para nosotros. Tu Coach es un proyecto joven y lo estamos mejorando cada semana a partir de lo que nos cuentan quienes lo usan. Cuando hayas hecho algunos tests, nos sería muy útil que respondieras a este correo con tus impresiones. Por ejemplo:

- ¿El nivel de las preguntas se parece al de tu examen real? ¿Te parecen demasiado fáciles, demasiado difíciles o adecuadas?
- ¿Hay algún tema que eches en falta?
- ¿Qué cambiarías o añadirías?

Lo leemos todo personalmente y tus comentarios tienen un efecto directo en las próximas mejoras.

Mucho ánimo con la preparación.

Un saludo,
El equipo de Tu Coach
soporte@tucoach-oposiciones.com
"""

    url_html = html.escape(url, quote=True)
    cuerpo_html = f"""<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2933;font-size:15px;line-height:1.6;">
        <tr><td>
          <p style="margin:0 0 16px;">Hola:</p>
          <p style="margin:0 0 16px;">Gracias por registrarte en <strong>Tu Coach</strong>. Ya puedes empezar a preparar tu oposición con simulacros y tests adaptados a tu temario.</p>

          <p style="margin:24px 0 8px;font-weight:bold;">Para empezar:</p>
          <ol style="margin:0 0 16px;padding-left:20px;">
            <li>Entra en tu panel.</li>
            <li>Elige simulacro de la convocatoria que desees o test adaptado a los temas o leyes que elijas.</li>
            <li>Podrás comprobar que temas dominas y cuáles necesitan más repaso.</li>
          </ol>
          <p style="margin:24px 0;text-align:center;">
            <a href="{url_html}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Ir a mi panel</a>
          </p>

          <p style="margin:24px 0 8px;font-weight:bold;">Tu opinión es muy importante para nosotros</p>
          <p style="margin:0 0 12px;">Tu Coach es un proyecto joven y lo estamos mejorando cada semana a partir de lo que nos cuentan quienes lo usan. Cuando hayas hecho algunos tests, nos sería muy útil que <strong>respondieras a este correo</strong> con tus impresiones. Por ejemplo:</p>
          <ul style="margin:0 0 16px;padding-left:20px;">
            <li>¿El nivel de las preguntas se parece al de tu examen real? ¿Te parecen demasiado fáciles, demasiado difíciles o adecuadas?</li>
            <li>¿Hay algún tema que eches en falta?</li>
            <li>¿Qué cambiarías o añadirías?</li>
          </ul>
          <p style="margin:0 0 16px;">Lo leemos todo personalmente y tus comentarios tienen un efecto directo en las próximas mejoras.</p>

          <p style="margin:0 0 16px;">Mucho ánimo con la preparación.</p>
          <p style="margin:0;">Un saludo,<br>El equipo de Tu Coach<br>
            <a href="mailto:soporte@tucoach-oposiciones.com" style="color:#1d4ed8;">soporte@tucoach-oposiciones.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return asunto, cuerpo_html, texto


def enviar_bienvenida(*, user_id, email: str) -> bool:
    """
    Reclama de forma atómica el envío de bienvenida y lo envía una sola vez.
    Si el envío falla, libera la marca para permitir un reintento posterior.
    """
    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.profiles
                SET bienvenida_enviada_at = now()
                WHERE id = %s
                  AND bienvenida_enviada_at IS NULL
                RETURNING id
                """,
                (user_id,),
            )
            fila = cur.fetchone()
        con.commit()

    if fila is None:
        return True  # ya enviada (o perfil inexistente)

    asunto, cuerpo_html, texto = _componer_bienvenida()
    enviado = enviar_correo_usuario(
        destinatario=email,
        asunto=asunto,
        html_cuerpo=cuerpo_html,
        texto=texto,
        idempotency_key=f"bienvenida-{user_id}",
    )
    if enviado:
        return True

    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                "UPDATE public.profiles SET bienvenida_enviada_at = NULL WHERE id = %s",
                (user_id,),
            )
        con.commit()
    return False


# ---------------------------------------------------------------------------
# Confirmación de suscripción pagada
# ---------------------------------------------------------------------------

try:
    _ZONA_ES = ZoneInfo("Europe/Madrid")
except Exception:  # Windows sin el paquete tzdata
    _ZONA_ES = timezone.utc
_PERIODOS = {"month": "mensual", "year": "anual", "week": "semanal", "day": "diaria"}


def _campo(objeto, nombre: str):
    """Lee un campo de un objeto Stripe (o dict) sin fallar si no existe."""
    if objeto is None:
        return None
    if hasattr(objeto, "get"):
        try:
            valor = objeto.get(nombre)
        except Exception:
            valor = None
        if valor is not None:
            return valor
    return getattr(objeto, nombre, None)


def _formatear_importe(centimos, moneda) -> str | None:
    if centimos is None:
        return None
    euros = int(centimos) / 100
    cifra = f"{euros:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    moneda = str(moneda or "").lower()
    return f"{cifra} €" if moneda == "eur" else f"{cifra} {moneda.upper()}".strip()


def _formatear_fecha(timestamp) -> str | None:
    if timestamp is None:
        return None
    if isinstance(timestamp, datetime):
        fecha = timestamp
    else:
        fecha = datetime.fromtimestamp(int(timestamp), tz=timezone.utc)
    return fecha.astimezone(_ZONA_ES).strftime("%d/%m/%Y")


def _periodicidad(invoice) -> str | None:
    lineas = _campo(_campo(invoice, "lines"), "data") or []
    for linea in lineas:
        precio = _campo(linea, "price")
        if precio is None:
            precio = _campo(_campo(_campo(linea, "pricing"), "price_details"), "price")
        intervalo = _campo(_campo(precio, "recurring"), "interval")
        if intervalo:
            return _PERIODOS.get(str(intervalo))
    return None


def _componer_confirmacion_suscripcion(
    *, importe: str | None, fecha_pago: str | None, renovacion: str | None,
    periodicidad: str | None, url_factura: str | None,
) -> tuple[str, str, str]:
    url = _url_plataforma()
    asunto = "Tu suscripción a Tu Coach está activa"

    filas: list[tuple[str, str]] = [
        ("Suscripción", f"Tu Coach ({periodicidad})" if periodicidad else "Tu Coach"),
    ]
    if importe:
        filas.append(("Importe", importe))
    if fecha_pago:
        filas.append(("Fecha del pago", fecha_pago))
    if renovacion:
        filas.append(("Próxima renovación", renovacion))

    resumen_txt = "\n".join(f"- {etiqueta}: {valor}" for etiqueta, valor in filas)
    factura_txt = f"\nPuedes ver y descargar tu factura aquí: {url_factura}\n" if url_factura else ""

    texto = f"""Hola:

Hemos recibido tu pago y tu suscripción a Tu Coach ya está activa. Gracias por confiar en nosotros.

Resumen:
{resumen_txt}
{factura_txt}
Desde ahora tienes acceso completo a la plataforma: {url}

La suscripción se renueva automáticamente. Puedes consultar tus facturas, cambiar el método de pago o cancelarla cuando quieras desde tu panel, en «Gestionar suscripción».

Si tienes cualquier duda o sugerencia, responde a este correo y te atenderemos.

Un saludo,
El equipo de Tu Coach
soporte@tucoach-oposiciones.com
"""

    filas_html = "".join(
        f'<tr><td style="padding:6px 0;color:#52606d;">{html.escape(e)}</td>'
        f'<td style="padding:6px 0;text-align:right;font-weight:bold;">{html.escape(v)}</td></tr>'
        for e, v in filas
    )
    factura_html = (
        f'<p style="margin:0 0 16px;"><a href="{html.escape(url_factura, quote=True)}" '
        f'style="color:#1d4ed8;">Ver y descargar la factura</a></p>'
        if url_factura else ""
    )
    url_html = html.escape(url, quote=True)

    cuerpo_html = f"""<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2933;font-size:15px;line-height:1.6;">
        <tr><td>
          <p style="margin:0 0 16px;">Hola:</p>
          <p style="margin:0 0 16px;">Hemos recibido tu pago y tu suscripción a <strong>Tu Coach</strong> ya está activa. Gracias por confiar en nosotros.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e4e7eb;border-bottom:1px solid #e4e7eb;padding:8px 0;">
            {filas_html}
          </table>
          {factura_html}

          <p style="margin:24px 0;text-align:center;">
            <a href="{url_html}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Ir a mi panel</a>
          </p>

          <p style="margin:0 0 16px;">La suscripción se renueva automáticamente. Puedes consultar tus facturas, cambiar el método de pago o cancelarla cuando quieras desde tu panel, en <strong>«Gestionar suscripción»</strong>.</p>
          <p style="margin:0 0 16px;">Si tienes cualquier duda o sugerencia, responde a este correo y te atenderemos.</p>

          <p style="margin:0;">Un saludo,<br>El equipo de Tu Coach<br>
            <a href="mailto:soporte@tucoach-oposiciones.com" style="color:#1d4ed8;">soporte@tucoach-oposiciones.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return asunto, cuerpo_html, texto


def enviar_confirmacion_suscripcion(
    *, subscription_id: str, user_id, invoice, suscripcion=None
) -> bool:
    """
    Envía al usuario, una sola vez, la confirmación del primer pago de su
    suscripción. Se llama desde el webhook invoice.paid (subscription_create),
    es decir, solo cuando Stripe ha confirmado el cobro.
    """
    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.subscriptions
                SET confirmacion_usuario_enviada_at = now()
                WHERE subscription_id = %s
                  AND confirmacion_usuario_enviada_at IS NULL
                RETURNING subscription_id
                """,
                (subscription_id,),
            )
            reclamado = cur.fetchone() is not None
        con.commit()

    if not reclamado:
        return True

    email = str(_campo(invoice, "customer_email") or "").strip()
    if not email:
        with conectar_postgres() as con:
            with con.cursor() as cur:
                cur.execute(
                    "SELECT email FROM public.profiles WHERE id = %s LIMIT 1",
                    (user_id,),
                )
                fila = cur.fetchone()
        email = str(fila[0]).strip() if fila and fila[0] else ""

    enviado = False
    if email:
        renovacion = None
        if suscripcion is not None:
            renovacion = _campo(suscripcion, "current_period_end")
            if renovacion is None:
                items = _campo(_campo(suscripcion, "items"), "data") or []
                if items:
                    renovacion = _campo(items[0], "current_period_end")

        asunto, cuerpo_html, texto = _componer_confirmacion_suscripcion(
            importe=_formatear_importe(_campo(invoice, "amount_paid"), _campo(invoice, "currency")),
            fecha_pago=_formatear_fecha(
                _campo(_campo(invoice, "status_transitions"), "paid_at") or _campo(invoice, "created")
            ),
            renovacion=_formatear_fecha(renovacion),
            periodicidad=_periodicidad(invoice),
            url_factura=_campo(invoice, "hosted_invoice_url"),
        )
        enviado = enviar_correo_usuario(
            destinatario=email,
            asunto=asunto,
            html_cuerpo=cuerpo_html,
            texto=texto,
            idempotency_key=f"confirmacion-suscripcion-{subscription_id}",
        )
    else:
        logger.warning("Suscripción %s pagada sin email de usuario; confirmación omitida.", subscription_id)

    if enviado:
        return True

    with conectar_postgres() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                UPDATE public.subscriptions
                SET confirmacion_usuario_enviada_at = NULL
                WHERE subscription_id = %s
                """,
                (subscription_id,),
            )
        con.commit()
    return False
