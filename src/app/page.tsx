export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Peña Kamikazes · 2026</p>
      <h1>La vida de la peña, ordenada y compartida.</h1>
      <p className="intro">
        Un lugar común para cuidar cada edición: organizar, comprar, cuadrar cuentas y guardar lo
        que vivimos juntos.
      </p>
      <div className="homeActions">
        <a className="primaryAction" href="/login">
          Entrar en la peña
        </a>
        <span className="status">Primera edición digital en construcción</span>
      </div>
    </main>
  );
}
