-- TuCoach-Web
-- Notificaciones administrativas de altas confirmadas y nuevas suscripciones pagadas.
-- Los campos son exclusivamente marcas de idempotencia y no alteran el acceso.

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS registro_notificado_at timestamptz;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS alta_pagada_notificada_at timestamptz;

COMMIT;
