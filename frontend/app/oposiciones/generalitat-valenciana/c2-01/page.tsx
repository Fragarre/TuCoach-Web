import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
 title: "Oposiciones C2-01 Generalitat Valenciana | Tu Coach",
 description: "Prepara las oposiciones C2-01 de la Generalitat Valenciana con tests, simulacros y materiales de estudio en Tu Coach.",
 alternates: { canonical: "/oposiciones/generalitat-valenciana/c2-01" },
};

export default function Page(){
 return <main style={{maxWidth:900,margin:"0 auto",padding:"56px 20px",fontFamily:"system-ui,sans-serif",color:"#172033"}}>
  <Link href="/oposiciones/generalitat-valenciana">← Oposiciones Generalitat Valenciana</Link>
  <p style={{marginTop:32,fontWeight:800,color:"#1557c0"}}>GENERALITAT VALENCIANA · GRUPO C2</p>
  <h1>Oposiciones C2-01 de la Generalitat Valenciana</h1>
  <p style={{fontSize:18,lineHeight:1.65}}>Página de preparación para el cuerpo C2-01, perfil auxiliar administrativo, de la Generalitat Valenciana. Tu Coach permite practicar con tests y simulacros y trabajar con materiales vinculados a la convocatoria seleccionada.</p>
  <h2>Preparación en Tu Coach</h2>
  <p style={{lineHeight:1.65}}>La plataforma concentra práctica, seguimiento del rendimiento y materiales de estudio para que puedas trabajar sobre la convocatoria que estés preparando.</p>
  <p><Link href="/?acceso=login">Entrar en Tu Coach →</Link></p>
  <h2 style={{marginTop:32}}>Convocatorias de empleo público</h2>
  <p>Consulta también las oportunidades de empleo público disponibles en la Comunitat Valenciana.</p>
  <Link href="/empleo">Ver convocatorias →</Link>
 </main>
}
