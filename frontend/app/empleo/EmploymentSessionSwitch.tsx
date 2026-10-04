"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmpleoAppClient from "./EmpleoAppClient";

export default function EmploymentSessionSwitch({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [autenticado, setAutenticado] = useState(false);
  const [comprobado, setComprobado] = useState(false);

  useEffect(() => {
    let activo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setAutenticado(Boolean(data.session));
      setComprobado(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return;
      setAutenticado(Boolean(session));
      setComprobado(true);
    });
    return () => { activo = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  if (comprobado && autenticado) return <EmpleoAppClient />;
  return <>{children}</>;
}
