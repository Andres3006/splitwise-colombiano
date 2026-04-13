import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Resumen financiero visible',
    description: 'La interfaz pone primero el balance general, deudas activas y siguientes acciones.'
  },
  {
    title: 'Flujos mas cortos',
    description: 'Registrar gastos, dividir cuentas y entrar al dashboard se siente mas directo.'
  },
  {
    title: 'Base React mas clara',
    description: 'La migracion desde legacy ya tiene una capa visual coherente y lista para crecer.'
  }
];

const flowSteps = [
  'Crear un gasto con monto, descripcion y participantes.',
  'Entrar al dashboard para ver cuanto debes y cuanto te deben.',
  'Revisar grupos, pagos y actividad reciente desde una sola vista.',
  'Continuar la migracion de modulos sin perder consistencia visual.'
];

export default function HomePage() {
  return (
    <section className="page-grid landing-grid">
      <article className="hero-card hero-card-wide">
        <div className="hero-copy">
          <p className="eyebrow">Nueva experiencia web</p>
          <h1>Controla gastos compartidos con una interfaz mas limpia y mucho mas clara.</h1>
          <p className="lead">
            Esta mejora toma la referencia visual teal de Splitwise y la adapta a tu proyecto:
            una web luminosa, ordenada y enfocada en balances, grupos y pagos.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/dashboard">
              Ir al dashboard
            </Link>
            <Link className="button button-ghost" to="/register">
              Crear cuenta
            </Link>
          </div>
        </div>

        <div className="hero-preview">
          <article className="preview-card">
            <span className="preview-badge">Balance general</span>
            <strong>$ 248.500</strong>
            <p>Te deben 312.000 COP y tus pagos pendientes bajaron a 63.500 COP.</p>
          </article>

          <article className="preview-card muted-card">
            <div className="mini-stat-row">
              <span>Viaje a Medellin</span>
              <strong>$ 86.000</strong>
            </div>
            <div className="mini-stat-row">
              <span>Apartamento</span>
              <strong>$ 42.500</strong>
            </div>
            <div className="mini-stat-row">
              <span>Accion sugerida</span>
              <strong className="accent-text">Registrar pago</strong>
            </div>
          </article>
        </div>
      </article>

      <article className="panel panel-soft">
        <div className="section-heading">
          <p className="eyebrow">Que mejora esta base</p>
          <h2>Una interfaz mas cercana al producto que realmente quieres construir</h2>
        </div>

        <div className="feature-grid">
          {highlights.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <p className="eyebrow">Flujo principal</p>
          <h2>Lo que el usuario deberia entender en segundos</h2>
        </div>

        <ol className="ordered-list">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>

      <article className="panel">
        <div className="section-heading">
          <p className="eyebrow">Base disponible</p>
          <h2>Pantallas renovadas en esta etapa</h2>
        </div>

        <div className="tag-list">
          <span className="tag">Home</span>
          <span className="tag">Dashboard</span>
          <span className="tag">Login</span>
          <span className="tag">Registro</span>
          <span className="tag">404</span>
        </div>
      </article>
    </section>
  );
}
