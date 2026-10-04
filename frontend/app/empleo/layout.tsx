import type { Metadata } from "next";
import type { ReactNode } from "react";
import EmpleoChrome from "./EmpleoChrome";

export const metadata: Metadata = {
  title: "Oposiciones y empleo público en la Comunitat Valenciana | Tu Coach",
  description: "Consulta convocatorias de empleo público de la Generalitat Valenciana, diputaciones y ayuntamientos de Valencia, Alicante y Castellón.",
  alternates: { canonical: "/empleo" },
};

export default function EmpleoLayout({ children }: { children: ReactNode }) {
  return <EmpleoChrome>{children}</EmpleoChrome>;
}
