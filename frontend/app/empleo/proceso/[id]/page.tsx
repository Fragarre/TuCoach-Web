import type { Metadata } from "next";
import ProcesoClient from "./ProcesoClient";

type Props = { params: Promise<{ id: string }> };

async function obtenerProceso(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tucoach-oposiciones.com";
    const response = await fetch(`${base}/api/empleo/public/procesos/${id}`, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return await response.json() as { denominacion?: string; organismo_nombre?: string; plazas?: number|null };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const proceso = await obtenerProceso(id);
  if (!proceso) return { title: "Convocatoria de empleo público | Tu Coach", robots: { index: false, follow: true } };
  const titulo = `${proceso.denominacion || "Convocatoria"} · ${proceso.organismo_nombre || "Empleo público"} | Tu Coach`;
  const plazas = proceso.plazas != null ? ` ${proceso.plazas} plaza${proceso.plazas === 1 ? "" : "s"}.` : "";
  return {
    title: titulo,
    description: `Consulta la convocatoria de ${proceso.denominacion || "empleo público"} de ${proceso.organismo_nombre || "la Comunitat Valenciana"}.${plazas} Plazos y publicaciones oficiales.`,
    alternates: { canonical: `/empleo/proceso/${id}` },
  };
}

export default function Page() {
  return <ProcesoClient />;
}
