import Link from "next/link";
import EmploymentSessionSwitch from "./EmploymentSessionSwitch";

type Proceso = {
  id:number; organismo_nombre:string; denominacion:string; plazas:number|null;
  sistema_selectivo:string|null; turno:string|null; estado_inscripcion:string|null;
  inscripcion:{fecha_cierre?:string|null}|null;
};

const MUESTRA = 5;

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
 const abiertas=procesos.filter(p=>p.estado_inscripcion==="ABIERTO");
 const muestra=(abiertas.length?abiertas:procesos).slice(0,MUESTRA);
 return <EmploymentSessionSwitch>
  <main style={styles.main}>
   <section style={styles.hero}>
    <div style={styles.eyebrow}>EMPLEO PÚBLICO · COMUNITAT VALENCIANA</div>
    <h1 style={styles.title}>Descubre oportunidades. Sigue sus novedades. Prepárate para tu plaza.</h1>
    <p style={styles.lead}>Tu Coach reúne las convocatorias de empleo público de la Generalitat Valenciana, las diputaciones y los ayuntamientos de Valencia, Alicante y Castellón, con la información oficial y sus novedades en un mismo lugar.</p>
    <div style={styles.actions}><Link href="/?acceso=registro" style={styles.primary}>Probar gratis 48 horas →</Link><Link href="/?acceso=login" style={styles.secondary}>Iniciar sesión</Link></div>
   </section>

   <section style={styles.grid} aria-label="Qué puedes hacer">
    <article style={styles.feature}><span style={styles.number}>01</span><span style={styles.kicker}>DESCUBRE</span><h2 style={styles.featureTitle}>Encuentra oportunidades que encajan contigo</h2><p style={styles.featureText}>Explora {procesos.length?`${procesos.length} convocatorias`:"convocatorias"} de la Generalitat y de la administración local de Valencia, Alicante y Castellón, con filtros por organismo y plazo.</p></article>
    <article style={styles.feature}><span style={styles.number}>02</span><span style={styles.kicker}>SIGUE</span><h2 style={styles.featureTitle}>No pierdas de vista sus novedades oficiales</h2><p style={styles.featureText}>Sigue una convocatoria y consulta desde Mi seguimiento sus publicaciones y cambios relevantes.</p></article>
    <article style={styles.feature}><span style={styles.number}>03</span><span style={styles.kicker}>PREPÁRATE</span><h2 style={styles.featureTitle}>Conecta la oportunidad con tu preparación</h2><p style={styles.featureText}>Cuando una convocatoria encaja contigo, Tu Coach te acompaña con tests, simulacros y materiales.</p></article>
   </section>

   <section id="convocatorias" style={styles.section}>
    <div style={styles.head}><div><span style={styles.eyebrow}>{abiertas.length?"INSCRIPCIÓN ABIERTA":"CONVOCATORIAS"}</span><h2 style={styles.h2}>Algunas oportunidades ahora mismo</h2></div></div>
    <div style={styles.list}>{muestra.map(p=>{
      const cierre=fecha(p.inscripcion?.fecha_cierre);const abierta=p.estado_inscripcion==="ABIERTO";
      return <article key={p.id} style={styles.card}><div><span style={styles.org}>{p.organismo_nombre}</span><h3 style={styles.h3}><Link href={`/empleo/proceso/${p.id}`} style={styles.link}>{p.denominacion}</Link></h3><p style={styles.meta}>{[p.plazas!=null?`${p.plazas} plaza${p.plazas===1?"":"s"}`:null,p.sistema_selectivo,p.turno].filter(Boolean).join(" · ")}</p></div><div style={styles.status}><strong>{abierta?"Inscripción abierta":p.estado_inscripcion==="PENDIENTE_BOE"?"Pendiente de publicación en BOE":"Consultar plazo"}</strong>{cierre&&<span>Hasta {cierre}</span>}</div></article>
    })}</div>
    {!muestra.length&&<p>No hay convocatorias públicas disponibles en este momento.</p>}
    <div style={styles.more}><div><strong>{procesos.length>muestra.length?`Y ${procesos.length-muestra.length} convocatorias más`:"Consulta todas las convocatorias"}</strong><p style={styles.moreText}>Regístrate para ver el listado completo, filtrar por organismo y plazo, y seguir sus novedades.</p></div><Link href="/?acceso=registro" style={styles.primary}>Probar gratis 48 horas →</Link></div>
    <p style={styles.note}>La información se obtiene de fuentes oficiales. Comprueba siempre la publicación oficial antes de presentar una solicitud.</p>
   </section>
  </main>
 </EmploymentSessionSwitch>
}

const styles:Record<string,React.CSSProperties>={
 main:{maxWidth:1120,margin:"0 auto",padding:"48px 20px 72px",fontFamily:"system-ui,sans-serif",color:"#172033"},
 hero:{padding:"clamp(26px,5vw,46px) clamp(20px,5vw,50px)",border:"1px solid #c9daf3",borderRadius:24,background:"linear-gradient(135deg,#f7faff,#edf5ff)"},
 eyebrow:{fontSize:12,letterSpacing:1.4,fontWeight:800,color:"#1557c0"},
 title:{maxWidth:900,fontSize:"clamp(32px,5vw,52px)",lineHeight:1.08,letterSpacing:"-.03em",margin:"12px 0 0"},
 lead:{maxWidth:800,fontSize:18,lineHeight:1.65,color:"#53627a"},
 actions:{display:"flex",gap:10,flexWrap:"wrap",marginTop:24},
 primary:{padding:"11px 16px",borderRadius:9,background:"#1557c0",color:"#fff",fontWeight:800,textDecoration:"none",whiteSpace:"nowrap"},
 secondary:{padding:"10px 16px",borderRadius:9,border:"1px solid #b9c6d8",color:"#172033",fontWeight:700,textDecoration:"none",background:"#fff"},
 grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,marginTop:22},
 feature:{padding:"26px 24px",border:"1px solid #d9dee8",borderRadius:18,background:"#fff"},
 number:{display:"grid",placeItems:"center",width:46,height:46,marginBottom:18,borderRadius:14,background:"#e7f0ff",color:"#1557c0",fontWeight:900},
 kicker:{display:"block",fontSize:12,letterSpacing:1.4,fontWeight:800,color:"#5c6b80",marginBottom:8},
 featureTitle:{margin:0,fontSize:21,lineHeight:1.25},
 featureText:{margin:"10px 0 0",color:"#5c6b80",fontSize:15,lineHeight:1.55},
 section:{marginTop:22,padding:"clamp(20px,4vw,28px) clamp(18px,4vw,30px)",border:"1px solid #d9dee8",borderRadius:18,background:"#fff"},
 head:{display:"flex",justifyContent:"space-between",alignItems:"end",gap:20,marginBottom:12},
 h2:{margin:"6px 0 0",fontSize:28},list:{display:"grid"},card:{display:"flex",flexWrap:"wrap",justifyContent:"space-between",gap:"8px 24px",padding:"18px 0",borderTop:"1px solid #e5e7eb"},
 org:{fontSize:12,fontWeight:800,color:"#5c6b80"},h3:{margin:"5px 0",fontSize:20},link:{color:"#172033",textDecoration:"none"},meta:{margin:0,color:"#5c6b80"},
 status:{minWidth:190,display:"flex",flexDirection:"column",gap:4,fontSize:14},
 more:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:16,marginTop:8,padding:"20px 22px",borderRadius:14,background:"#f4f8ff",border:"1px solid #c9daf3"},
 moreText:{margin:"4px 0 0",color:"#53627a",fontSize:15},
 note:{margin:"20px 0 0",fontSize:12,color:"#68768a"}
};
