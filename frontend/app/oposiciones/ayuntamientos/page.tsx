import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tests y simulacros de oposiciones de Ayuntamientos | Tu Coach",
  description:
    "Practica oposiciones administrativas de Ayuntamientos con tests, simulacros y materiales basados en modelos y exámenes de procesos selectivos reales.",
  alternates: { canonical: "/oposiciones/ayuntamientos" },
};

const perfiles = [
  ["A1", "Técnico/a de Administración General"],
  ["A2", "Gestión de Administración General"],
  ["C1", "Administrativo/a"],
  ["C2", "Auxiliar administrativo/a"],
];

export default function Page() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "56px 20px", fontFamily: "system-ui,sans-serif", color: "#172033" }}>
      <Link href="/">← Tu Coach</Link>
      <p style={{ marginTop: 32, fontWeight: 800, color: "#1557c0" }}>OPOSICIONES · ADMINISTRACIÓN LOCAL</p>
      <h1>Tests y simulacros para oposiciones administrativas de Ayuntamientos</h1>
      <p style={{ fontSize: 18, lineHeight: 1.65 }}>
        Tu Coach ofrece modelos de preparación para puestos administrativos de Ayuntamientos. Los tests, simulacros y materiales toman como referencia oposiciones y exámenes reales históricos de distintas entidades locales para practicar contenidos y formatos habituales.
      </p>

      <section>
        <h2>Modelos de preparación por grupo</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {perfiles.map(([grupo, puesto]) => (
            <article key={grupo} style={{ border: "1px solid #d9e2ef", borderRadius: 14, padding: 20 }}>
              <strong>Grupo {grupo}</strong>
              <h3>{puesto}</h3>
              <p>Practica con tests y simulacros del modelo municipal disponible para este perfil.</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Preparación basada en procesos reales</h2>
        <p style={{ lineHeight: 1.65 }}>
          Los modelos se construyen a partir de referencias de procesos selectivos reales históricos de distintos Ayuntamientos. Sirven como herramienta de entrenamiento general y no reproducen necesariamente las bases de una convocatoria municipal concreta.
        </p>
        <p><Link href="/?acceso=login">Entrar en Tu Coach →</Link></p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Convocatorias de empleo público</h2>
        <p>Consulta también oportunidades públicas de Ayuntamientos, diputaciones y Generalitat Valenciana.</p>
        <Link href="/empleo">Ver oportunidades de empleo público →</Link>
      </section>
    </main>
  );
}
