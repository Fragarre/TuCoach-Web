import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contacto | Tu Coach",
  description: "Contacto y soporte de Tu Coach.",
};

export default function ContactoPage() {
  return (
    <main className="public-site marketing-site">
      <header className="public-header">
        <Link className="brand public-brand" href="/" aria-label="Tu Coach, inicio">
          <span className="brand-mark" aria-hidden="true">TC</span>
          <span className="brand-copy">
            <span className="brand-name">Tu Coach</span>
          </span>
        </Link>

        <div className="public-header-actions">
          <Link className="secondary compact-button marketing-link" href="/">
            Volver a inicio
          </Link>
        </div>
      </header>

      <section className="marketing-section contact-page">
        <div className="marketing-heading">
          <span className="eyebrow">Contacto</span>
          <h1>¿Necesitas ayuda con Tu Coach?</h1>
          <p>
            Para consultas sobre el acceso, la cuenta, la suscripción o el
            funcionamiento de la plataforma, puedes escribirnos por correo
            electrónico.
          </p>
        </div>

        <article className="marketing-card contact-card">
          <span className="marketing-tag">Soporte</span>
          <h2>soporte@tucoach-oposiciones.com</h2>
          <p>
            Indica brevemente el motivo de tu consulta y, si se trata de una
            incidencia, describe qué estabas intentando hacer cuando se produjo.
          </p>
          <a
            className="primary public-cta marketing-link"
            href="mailto:soporte@tucoach-oposiciones.com"
          >
            Escribir a soporte
          </a>
        </article>
      </section>

      <footer className="public-footer">
        <strong>Tu Coach</strong>
        <span>
          Preparación administrativa y oportunidades de empleo público en la
          Comunitat Valenciana
        </span>
      </footer>
    </main>
  );
}
