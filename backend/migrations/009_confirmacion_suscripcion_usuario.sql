-- TuCoach-Web
-- Confirmación al usuario del primer pago de su suscripción.
-- El campo es exclusivamente una marca de idempotencia y no altera el acceso.

BEGIN;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS confirmacion_usuario_enviada_at timestamptz;

COMMIT;
