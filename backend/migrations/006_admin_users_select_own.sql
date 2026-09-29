-- TuCoach-Web
-- Permite que el servicio de Empleo compruebe, con el JWT del propio usuario,
-- si esa cuenta dispone de acceso total interno. Solo se expone la fila propia.

BEGIN;

DROP POLICY IF EXISTS admin_users_select_own ON public.admin_users;
CREATE POLICY admin_users_select_own ON public.admin_users
FOR SELECT USING (auth.uid() = user_id);

COMMIT;
