import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oposiciones y empleo público en la Comunitat Valenciana | Tu Coach",
  description:
    "Consulta convocatorias de empleo público de la Generalitat Valenciana, diputaciones y ayuntamientos de Valencia, Alicante y Castellón.",
  alternates: { canonical: "/empleo" },
  openGraph: {
    title: "Oposiciones y empleo público en la Comunitat Valenciana | Tu Coach",
    description:
      "Convocatorias de empleo público de la Generalitat Valenciana, diputaciones y ayuntamientos de la Comunitat Valenciana.",
    url: "/empleo",
    type: "website",
  },
};

export default function EmpleoMetadataLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
