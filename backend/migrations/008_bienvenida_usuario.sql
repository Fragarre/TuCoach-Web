-- TuCoach-Web
-- Correo de bienvenida al usuario tras confirmar el registro.
-- El campo es exclusivamente una marca de idempotencia y no altera el acceso.

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bienvenida_enviada_at timestamptz;

COMMIT;
