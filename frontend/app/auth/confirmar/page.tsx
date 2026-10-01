"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function ConfirmarCuenta() {
  const token = useRef("");
  const inicializado = useRef(false);
  const enCurso = useRef(false);
  const [estado, setEstado] = useState<"CARGANDO" | "PENDIENTE" | "VALIDANDO" | "CONFIRMADA" | "ERROR">("CARGANDO");

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;
    token.current = new URLSearchParams(window.location.search).get("token_hash") ?? "";
    // El enlace no se consume al abrirlo: requiere una acción del usuario.
    setEstado(token.current ? "PENDIENTE" : "ERROR");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function confirmar() {
    if (enCurso.current || !token.current) return;
    enCurso.current = true;
    setEstado("VALIDANDO");

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Configuración de autenticación incompleta");

      // Cliente independiente: no escribe cookies ni reutiliza la sesión de la web.
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token.current,
        type: "email",
      });
      if (error || !data.user?.email_confirmed_at) {
        setEstado("ERROR");
        return;
      }

      token.current = "";
      setEstado("CONFIRMADA");
    } catch {
      setEstado("ERROR");
    } finally {
      enCurso.current = false;
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: 560, margin: "60px auto" }}>
        <span className="eyebrow">Tu Coach · Registro</span>
        <div aria-live="polite">
          {estado === "CONFIRMADA" ? (
            <>
              <h1>Tu cuenta ha sido confirmada</h1>
              <p>El registro se ha completado. Ya puedes iniciar sesión en Tu Coach.</p>
              <p>Tu prueba de 24 horas comenzará cuando accedas por primera vez.</p>
              <Link className="primary auth-submit" href="/?acceso=login">Iniciar sesión</Link>
            </>
          ) : estado === "ERROR" ? (
            <>
              <h1>No hemos podido confirmar tu cuenta</h1>
              <p>El enlace puede haber caducado, haberse utilizado o estar incompleto. También puede haber un problema de conexión.</p>
              <p>Si ya confirmaste tu correo, inicia sesión. Si sigue pendiente, solicita un nuevo correo de confirmación.</p>
              <Link href="/?acceso=login">Ir al acceso</Link>
            </>
          ) : (
            <>
              <h1>Confirma tu cuenta de Tu Coach</h1>
              <p>Pulsa el botón para confirmar tu correo y completar el registro.</p>
              <button className="primary auth-submit" disabled={estado !== "PENDIENTE"} onClick={() => void confirmar()}>
                {estado === "VALIDANDO" ? "Confirmando…" : estado === "CARGANDO" ? "Cargando…" : "Confirmar mi cuenta"}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
