"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmploymentPublicGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [comprobando, setComprobando] = useState(pathname === "/empleo");
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    if (pathname !== "/empleo") {
      setComprobando(false);
      return;
    }

    let activo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setAutenticado(Boolean(data.session));
      setComprobando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo || pathname !== "/empleo") return;
      setAutenticado(Boolean(session));
      setComprobando(false);
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, supabase]);

  if (pathname !== "/empleo") return <>{children}</>;
  if (comprobando) return <EmploymentLoading />;
  if (autenticado) return <div className="employment-app">{children}</div>;

  return <EmploymentMiniLanding />;
}

function EmploymentLoading() {
  return (
    <main style={styles.loading}>
      <div style={styles.loadingBox}>Cargando Empleo público…</div>
    </main>
  );
}

function EmploymentMiniLanding() {
  const [procesos, setProcesos] = useState<Array<{
    id:number; organismo_nombre:string; denominacion:string; plazas:number|null;
    sistema_selectivo:string|null; turno:string|null; estado_inscripcion:string|null;
    inscripcion:{fecha_cierre?:string|null}|null;
  }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    fetch("/api/empleo/public/procesos?limite=200", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => { if (activo) setProcesos(Array.isArray(data) ? data : []); })
      .catch(() => { if (activo) setError("No se han podido cargar las convocatorias."); });
    return () => { activo = false; };
  }, []);

  const fecha = (valor?:string|null) => {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? valor : d.toLocaleDateString("es-ES");
  };

  return (
    <main style={styles.main}>
      <section style={styles.hero}>
        <div style={styles.eyebrow}>EMPLEO PÚBLICO · COMUNITAT VALENCIANA</div>
        <h1 style={styles.title}>Oposiciones y convocatorias de empleo público en la Comunitat Valenciana</h1>
        <p style={styles.lead}>
          Consulta convocatorias de la Generalitat Valenciana, diputaciones y ayuntamientos de Valencia,
          Alicante y Castellón. La consulta es pública; el seguimiento de novedades requiere una suscripción activa.
        </p>
        <div style={styles.actions}>
          <a href="#convocatorias" style={styles.primary}>Ver convocatorias →</a>
          <Link href="/" style={styles.secondary}>Entrar en Tu Coach</Link>
        </div>
      </section>

      <section id="convocatorias" style={styles.publicSection}>
        <div style={styles.sectionHead}>
          <div>
            <span style={styles.kicker}>CONVOCATORIAS</span>
            <h2 style={styles.footerTitle}>Oportunidades de empleo público</h2>
          </div>
          <strong>{procesos.length} convocatorias</strong>
        </div>
        {error && <p>{error}</p>}
        <div style={styles.list}>
          {procesos.map((p) => {
            const cierre=fecha(p.inscripcion?.fecha_cierre);
            const abierta=p.estado_inscripcion==="ABIERTO";
            return <article key={p.id} style={styles.processCard}>
              <div>
                <span style={styles.kicker}>{p.organismo_nombre}</span>
                <h3 style={styles.processTitle}><Link href={`/empleo/proceso/${p.id}`} style={styles.processLink}>{p.denominacion}</Link></h3>
                <p style={styles.cardText}>
                  {[p.plazas!=null?`${p.plazas} plaza${p.plazas===1?"":"s"}`:null,p.sistema_selectivo,p.turno].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div style={styles.status}>
                <strong>{abierta?"Inscripción abierta":p.estado_inscripcion==="PENDIENTE_BOE"?"Pendiente de publicación en BOE":"Consultar plazo"}</strong>
                {cierre&&<span>Hasta {cierre}</span>}
              </div>
            </article>;
          })}
        </div>
        <p style={styles.publicNote}>La información se obtiene de fuentes oficiales. Consulta siempre la publicación oficial antes de presentar una solicitud.</p>
      </section>

      <section style={styles.footerBlock}>
        <div>
          <span style={styles.kicker}>SEGUIMIENTO</span>
          <h2 style={styles.footerTitle}>Sigue las convocatorias que te interesan y consulta sus novedades.</h2>
        </div>
        <Link href="/" style={styles.primary}>Iniciar sesión o registrarse →</Link>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1120, margin: "0 auto", padding: "48px 20px 72px", fontFamily: "system-ui, sans-serif", color: "#172033" },
  loading: { minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif", color: "#172033", background: "#f5f7fb" },
  loadingBox: { padding: "14px 18px", border: "1px solid #d9dee8", borderRadius: 10, background: "#fff", boxShadow: "0 8px 28px rgba(23,32,51,.08)", fontWeight: 600 },
  hero: { padding: "52px 56px", border: "1px solid #c9daf3", borderRadius: 24, background: "linear-gradient(135deg,#f7faff,#edf5ff)", boxShadow: "0 18px 45px rgba(31,55,94,.08)" },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: 800, color: "#1557c0", marginBottom: 12 },
  title: { maxWidth: 850, margin: 0, fontSize: "clamp(34px,5vw,58px)", lineHeight: 1.05, letterSpacing: "-.03em" },
  lead: { maxWidth: 760, margin: "22px 0 0", fontSize: 18, lineHeight: 1.65, color: "#53627a" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 16px", borderRadius: 9, background: "#1557c0", color: "#fff", textDecoration: "none", fontWeight: 800 },
  secondary: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 16px", borderRadius: 9, border: "1px solid #b9c6d8", background: "#fff", color: "#172033", textDecoration: "none", fontWeight: 700 },
  note: { margin: "14px 0 0", fontSize: 12, color: "#68768a" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0, marginTop: 22, border: "1px solid #d9dee8", borderRadius: 18, overflow: "hidden", background: "#fff" },
  card: { padding: "30px 28px 32px", borderRight: "1px solid #d9dee8" },
  number: { display: "grid", placeItems: "center", width: 50, height: 50, marginBottom: 24, borderRadius: 14, background: "#e7f0ff", color: "#1557c0", fontWeight: 900 },
  kicker: { display: "block", fontSize: 12, letterSpacing: 1.4, fontWeight: 800, color: "#5c6b80", marginBottom: 8 },
  cardTitle: { margin: 0, fontSize: 22, lineHeight: 1.25 },
  cardText: { margin: "10px 0 0", color: "#5c6b80", fontSize: 15, lineHeight: 1.55 },
  publicSection: { marginTop: 22, padding: "30px", border: "1px solid #d9dee8", borderRadius: 18, background: "#fff" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, marginBottom: 18 },
  list: { display: "grid", gap: 10 },
  processCard: { display: "flex", justifyContent: "space-between", gap: 24, padding: "18px 0", borderTop: "1px solid #e5e7eb" },
  processTitle: { margin: 0, fontSize: 20, lineHeight: 1.3 },
  processLink: { color: "#172033", textDecoration: "none" },
  status: { minWidth: 190, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, fontSize: 14 },
  publicNote: { margin: "20px 0 0", fontSize: 12, color: "#68768a" },
  footerBlock: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginTop: 22, padding: "28px 30px", borderRadius: 18, background: "#172033", color: "#fff" },
  footerTitle: { margin: 0, fontSize: 24, lineHeight: 1.25 },
};
