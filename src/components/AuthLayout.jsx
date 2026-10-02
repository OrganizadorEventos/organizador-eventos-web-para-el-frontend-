import mascot from '../assets/mivo-cats.png';

export default function AuthLayout({ children }) {
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-label="Acceso a MIVO">
        <div className="auth-form-panel">{children}</div>
        <aside className="auth-visual" aria-label="MIVO, organiza hoy y logra mañana">
          <img src={mascot} alt="Cuatro gatos organizando un evento alrededor de un portátil" />
          <div className="auth-brand">MIVO</div>
        </aside>
      </section>
    </main>
  );
}
