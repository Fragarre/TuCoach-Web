import type { Metadata } from "next";
import Link from "next/link";
import ProcesoSessionSwitch from "./ProcesoSessionSwitch";

type Props={params:Promise<{id:string}>};
type Proceso={id:number;denominacion:string;organismo_nombre:string;plazas:number|null;sistema_selectivo:string|null;turno:string|null;estado:string|null;estado_inscripcion:string|null;fecha_convocatoria:string|null;fecha_examen:string|null;lugar_examen:string|null;ultima_publicacion_at:string|null;inscripcion:{fecha_apertura?:string|null;fecha_cierre?:string|null;literal?:string|null}|null};
type Publicacion={id:number;titulo:string;fecha_publicacion:string|null;url:string;tipo:string|null};

async function obtener<T>(ruta:string):Promise<T|null>{
 try{const r=await fetch(`https://tucoach-oposiciones.com/api/empleo/public/${ruta}`,{next:{revalidate:1800}});if(!r.ok)return null;return await r.json() as T}catch{return null}
}
function fecha(v?:string|null){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("es-ES").format(d)}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const{id}=await params;const p=await obtener<Proceso>(`procesos/${id}`);
 if(!p)return{title:"Convocatoria de empleo público | Tu Coach",robots:{index:false,follow:true}};
 const plazas=p.plazas!=null?` ${p.plazas} plaza${p.plazas===1?"":"s"}.`:"";
 return{title:`${p.denominacion} · ${p.organismo_nombre} | Tu Coach`,description:`Consulta la convocatoria de ${p.denominacion} de ${p.organismo_nombre}.${plazas} Plazos y publicaciones oficiales.`,alternates:{canonical:`/empleo/proceso/${id}`}};
}

export default async function Page({params}:Props){
 const{id}=await params;
 const [p,pubs]=await Promise.all([obtener<Proceso>(`procesos/${id}`),obtener<Publicacion[]>(`procesos/${id}/publicaciones?limite=100`)]);
 return <ProcesoSessionSwitch>
  <main style={s.main}>
   <Link href="/empleo">← Volver a Empleo público</Link>
   {!p?<section style={s.panel}><h1>Convocatoria</h1><p>Esta convocatoria no está disponible en el catálogo público.</p></section>:
   <section style={s.panel}>
    <p style={s.org}>{p.organismo_nombre}</p><h1 style={s.title}>{p.denominacion}</h1>
    <div style={s.grid}>
     <div><strong>Estado</strong><p>{p.estado||"—"}</p></div><div><strong>Plazas</strong><p>{p.plazas??"No definidas"}</p></div>
     <div><strong>Sistema selectivo</strong><p>{p.sistema_selectivo||"—"}</p></div><div><strong>Turno</strong><p>{p.turno||"—"}</p></div>
     <div><strong>Inscripción</strong><p>{p.estado_inscripcion==="ABIERTO"?"Abierta":p.estado_inscripcion==="PENDIENTE_BOE"?"Pendiente de publicación en BOE":p.estado_inscripcion||"Sin plazo confirmado"}</p></div>
     <div><strong>Cierre</strong><p>{fecha(p.inscripcion?.fecha_cierre)}</p></div><div><strong>Examen</strong><p>{fecha(p.fecha_examen)}</p></div><div><strong>Lugar</strong><p>{p.lugar_examen||"—"}</p></div>
    </div>
    {p.inscripcion?.literal&&<section style={s.block}><h2>Plazo de inscripción</h2><p>{p.inscripcion.literal}</p></section>}
    <section style={s.block}><h2>Publicaciones oficiales</h2>{pubs?.length?pubs.map(x=><article key={x.id} style={s.pub}><strong>{x.titulo}</strong><div>{fecha(x.fecha_publicacion)}{x.tipo?` · ${x.tipo}`:""}</div><a href={x.url} target="_blank" rel="noreferrer">Abrir publicación oficial</a></article>):<p>Sin publicaciones registradas.</p>}</section>
    <section style={s.follow}><h2>Seguimiento de la convocatoria</h2><p>El seguimiento de novedades está disponible para usuarios con suscripción activa.</p><Link href="/?acceso=login">Iniciar sesión →</Link></section>
   </section>}
  </main>
 </ProcesoSessionSwitch>
}
const s:Record<string,React.CSSProperties>={main:{maxWidth:1100,margin:"0 auto",padding:"36px 20px 64px",fontFamily:"system-ui,sans-serif",color:"#172033"},panel:{marginTop:18,border:"1px solid #d9e2ef",borderRadius:18,padding:28,background:"#fff"},org:{fontSize:13,fontWeight:800,color:"#1557c0",textTransform:"uppercase"},title:{fontSize:36,lineHeight:1.15,margin:"8px 0 24px"},grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:18,padding:"20px 0",borderTop:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb"},block:{marginTop:28},pub:{padding:"14px 0",borderTop:"1px solid #e5e7eb",display:"grid",gap:5},follow:{marginTop:28,padding:20,borderRadius:12,background:"#f4f8ff"}};
