import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="auth-wrapper">
      <article className="auth-card">
        <p className="eyebrow">404</p>
        <h1>Esta ruta no esta disponible en la nueva interfaz.</h1>
        <p className="lead">
          Es posible que la pantalla siga en el frontend legacy o que el enlace ya no exista.
          Vuelve al inicio o entra al dashboard para seguir.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/">
            Volver al inicio
          </Link>
          <Link className="button button-ghost" to="/dashboard">
            Ir al dashboard
          </Link>
        </div>
      </article>
    </section>
  );
}
