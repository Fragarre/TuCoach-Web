import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Oposiciones Generalitat Valenciana | Tu Coach",
  description: "Preparación de oposiciones administrativas de la Generalitat Valenciana: A1-01, A2-01, C1-01 y C2-01 con tests y simulacros.",
  alternates: { canonical: "/oposiciones/generalitat-valenciana" },
};

const cuerpos = [
  ["A1-01","A1","/oposiciones/generalitat-valenciana/a1-01"],
  ["A2-01","A2","/oposiciones/generalitat-valenciana/a2-01"],
  ["C1-01","C1","/oposiciones/generalitat-valenciana/c1-01"],
  ["C2-01","C2","/oposiciones/generalitat-valenciana/c2-01"],
];

export default function Page(){
 return <main style={{maxWidth:1000,margin:"0 auto",padding:"56px 20px",fontFamily:"system-ui,sans-serif",color:"#172033"}}>
  <Link href="/">← Tu Coach</Link>
  <h1>Oposiciones de la Generalitat Valenciana</h1>
  <p style={{fontSize:18,lineHeight:1.65}}>Tu Coach está orientado a la preparación de los cuerpos administrativos A1-01, A2-01, C1-01 y C2-01 de la Generalitat Valenciana mediante tests, simulacros y materiales de estudio.</p>
  <section><h2>Elige tu cuerpo</h2>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
    {cuerpos.map(([codigo,grupo,url])=><article key={codigo} style={{border:"1px solid #d9e2ef",borderRadius:14,padding:20}}>
      <h3>{codigo} · Grupo {grupo}</h3><Link href={url}>Ver preparación →</Link>
    </article>)}
   </div>
  </section>
  <section style={{marginTop:32}}><h2>Convocatorias y empleo público</h2><p>También puedes consultar las convocatorias públicas que Tu Coach recopila de fuentes oficiales.</p><Link href="/empleo">Consultar empleo público →</Link></section>
 </main>
}
