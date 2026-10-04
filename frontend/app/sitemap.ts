import type { MetadataRoute } from "next";

const BASE = "https://tucoach-oposiciones.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/empleo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/ayuda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/empleo/ayuda`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
