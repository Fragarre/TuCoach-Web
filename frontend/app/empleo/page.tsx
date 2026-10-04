import Link from "next/link";
import EmploymentSessionSwitch from "./EmploymentSessionSwitch";

type Proceso = {
  id:number; organismo_nombre:string; denominacion:string; plazas:number|null;
  sistema_selectivo:string|null; turno:string|null; estado_inscripcion:string|null;
  inscripcion:{fecha_cierre?:string|null}|null;
};

async function procesosPublicos(): Promise<Proceso[]> {
  try {
    const response = await fetch("https://tucoach-oposiciones.com/api/empleo/public/procesos?limite=200", { next: { revalidate: 1800 } });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function fecha(valor?:string|null){
  if(!valor)return null;
  const d=new Date(valor);
  return Number.isNaN(d.getTime())?valor:new Intl.DateTimeFormat("es-ES").format(d);
}

export default async function EmpleoPage(){
 const procesos=await procesosPublicos();
 return <EmploymentSessionSwitch>
  <main style={styles.main}>
   <section style={styles.hero}>
    <div style={styles.eyebrow}>EMPLEO PÚBLICO · COMUNITAT VALENCIANA</div>
    <h1 style={styles.title}>Oposiciones y convocatorias de empleo público en la Comunitat Valenciana</h1>
    <p style={styles.lead}>Consulta convocatorias de la Generalitat Valenciana, diputaciones y ayuntamientos de Valencia, Alicante y Castellón. La consulta es pública; el seguimiento de novedades requiere una suscripción activa.</p>
    <div style={styles.actions}><a href="#convocatorias" style={styles.primary}>Ver convocatorias →</a><Link href="/?acceso=login" style={styles.secondary}>Iniciar sesión</Link></div>
   </section>
   <section id="convocatorias" style={styles.section}>
    <div style={styles.head}><div><span style={styles.eyebrow}>CONVOCATORIAS</span><h2 style={styles.h2}>Oportunidades de empleo público</h2></div><strong>{procesos.length} convocatorias</strong></div>
    <div style={styles.list}>{procesos.map(p=>{
      const cierre=fecha(p.inscripcion?.fecha_cierre);const abierta=p.estado_inscripcion==="ABIERTO";
      return <article key={p.id} style={styles.card}><div><span style={styles.org}>{p.organismo_nombre}</span><h3 style={styles.h3}><Link href={`/empleo/proceso/${p.id}`} style={styles.link}>{p.denominacion}</Link></h3><p style={styles.meta}>{[p.plazas!=null?`${p.plazas} plaza${p.plazas===1?"":"s"}`:null,p.sistema_selectivo,p.turno].filter(Boolean).join(" · ")}</p></div><div style={styles.status}><strong>{abierta?"Inscripción abierta":p.estado_inscripcion==="PENDIENTE_BOE"?"Pendiente de publicación en BOE":"Consultar plazo"}</strong>{cierre&&<span>Hasta {cierre}</span>}</div></article>
    })}</div>
    {!procesos.length&&<p>No hay convocatorias públicas disponibles en este momento.</p>}
    <p style={styles.note}>La información se obtiene de fuentes oficiales. Comprueba siempre la publicación oficial antes de presentar una solicitud.</p>
   </section>
  </main>
 </EmploymentSessionSwitch>
}

const styles:Record<string,React.CSSProperties>={
 main:{maxWidth:1120,margin:"0 auto",padding:"48px 20px 72px",fontFamily:"system-ui,sans-serif",color:"#172033"},
 hero:{padding:"46px 50px",border:"1px solid #c9daf3",borderRadius:24,background:"linear-gradient(135deg,#f7faff,#edf5ff)"},
 eyebrow:{fontSize:12,letterSpacing:1.4,fontWeight:800,color:"#1557c0"},
 title:{maxWidth:900,fontSize:"clamp(34px,5vw,56px)",lineHeight:1.05,letterSpacing:"-.03em",margin:"12px 0 0"},
 lead:{maxWidth:800,fontSize:18,lineHeight:1.65,color:"#53627a"},
 actions:{display:"flex",gap:10,flexWrap:"wrap",marginTop:24},
 primary:{padding:"11px 16px",borderRadius:9,background:"#1557c0",color:"#fff",fontWeight:800,textDecoration:"none"},
 secondary:{padding:"10px 16px",borderRadius:9,border:"1px solid #b9c6d8",color:"#172033",fontWeight:700,textDecoration:"none",background:"#fff"},
 section:{marginTop:22,padding:"28px 30px",border:"1px solid #d9dee8",borderRadius:18,background:"#fff"},
 head:{display:"flex",justifyContent:"space-between",alignItems:"end",gap:20,marginBottom:12},
 h2:{margin:"6px 0 0",fontSize:28},list:{display:"grid"},card:{display:"flex",justifyContent:"space-between",gap:24,padding:"18px 0",borderTop:"1px solid #e5e7eb"},
 org:{fontSize:12,fontWeight:800,color:"#5c6b80"},h3:{margin:"5px 0",fontSize:20},link:{color:"#172033",textDecoration:"none"},meta:{margin:0,color:"#5c6b80"},
 status:{minWidth:190,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,fontSize:14},note:{margin:"20px 0 0",fontSize:12,color:"#68768a"}
};
