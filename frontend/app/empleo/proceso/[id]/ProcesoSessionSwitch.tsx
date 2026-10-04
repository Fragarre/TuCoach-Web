"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProcesoClient from "./ProcesoClient";

export default function ProcesoSessionSwitch({ children }: { children: React.ReactNode }) {
  const supabase=useMemo(()=>createClient(),[]);
  const [autenticado,setAutenticado]=useState(false);
  const [comprobado,setComprobado]=useState(false);
  useEffect(()=>{
    let activo=true;
    void supabase.auth.getSession().then(({data})=>{if(activo){setAutenticado(Boolean(data.session));setComprobado(true)}});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{if(activo){setAutenticado(Boolean(session));setComprobado(true)}});
    return()=>{activo=false;listener.subscription.unsubscribe()};
  },[supabase]);
  if(comprobado&&autenticado)return <ProcesoClient/>;
  return <>{children}</>;
}
