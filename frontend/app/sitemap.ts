import type { MetadataRoute } from "next";

const BASE = "https://tucoach-oposiciones.com";

type ProcesoPublico = { id: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/empleo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/oposiciones/generalitat-valenciana`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/oposiciones/generalitat-valenciana/a1-01`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/oposiciones/generalitat-valenciana/a2-01`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/oposiciones/generalitat-valenciana/c1-01`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/oposiciones/generalitat-valenciana/c2-01`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/ayuda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/empleo/ayuda`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const response = await fetch(`${BASE}/api/empleo/public/procesos?limite=200`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return estaticas;
    const procesos = await response.json() as ProcesoPublico[];
    return [
      ...estaticas,
      ...procesos.map((p) => ({
        url: `${BASE}/empleo/proceso/${p.id}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return estaticas;
  }
}
