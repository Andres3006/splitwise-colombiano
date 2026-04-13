const summaryCards = [
  {
    title: 'Debes',
    amount: '$ 84.500',
    detail: 'Dos pagos necesitan atencion esta semana.',
    tone: 'danger'
  },
  {
    title: 'Te deben',
    amount: '$ 216.000',
    detail: 'Tres personas tienen saldo pendiente contigo.',
    tone: 'success'
  },
  {
    title: 'Balance total',
    amount: '$ 131.500',
    detail: 'Tu balance actual esta a favor.',
    tone: 'neutral'
  },
  {
    title: 'Grupos activos',
    amount: '4',
    detail: 'Viajes, casa, trabajo y salidas.',
    tone: 'neutral'
  }
];

const debts = [
  { person: 'Laura Torres', context: 'Cena del sabado', amount: '$ 28.000', status: 'Pagar hoy' },
  { person: 'Mateo Ruiz', context: 'Taxi aeropuerto', amount: '$ 18.500', status: 'Pendiente' },
  { person: 'Camila Diaz', context: 'Mercado compartido', amount: '$ 38.000', status: 'Esta semana' }
];

const groups = [
  { name: 'Viaje a Medellin', members: '6 personas', balance: 'Tu saldo: +$ 72.000' },
  { name: 'Apartamento', members: '3 personas', balance: 'Tu saldo: -$ 41.500' },
  { name: 'Oficina', members: '8 personas', balance: 'Tu saldo: +$ 19.000' }
];

const activity = [
  'Andrea registro un gasto de almuerzo por 96.000 COP.',
  'Carlos te pago 32.000 COP del grupo Apartamento.',
  'Se creo el grupo Paseo de mitad de ano.'
];

export default function DashboardPage() {
  return (
    <section className="page-grid">
      <article className="hero-card dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">Dashboard</p>
          <h1>Un resumen financiero pensado para entender y actuar rapido.</h1>
          <p className="lead">
            Esta version deja atras la pantalla tecnica inicial y se acerca mas a una app real:
            balances visibles, acciones rapidas, grupos activos y actividad reciente.
          </p>
        </div>

        <div className="hero-actions">
          <button className="button" type="button">
            Agregar gasto
          </button>
          <button className="button button-ghost" type="button">
            Registrar pago
          </button>
        </div>
      </article>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <article key={card.title} className={`stat-card stat-card-${card.tone}`}>
            <span>{card.title}</span>
            <strong>{card.amount}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <article className="panel">
        <div className="section-heading">
          <p className="eyebrow">Acciones rapidas</p>
          <h2>Empieza por lo mas importante</h2>
        </div>

        <div className="quick-actions">
          <button className="action-tile" type="button">
            <span className="action-icon">+</span>
            <strong>Nuevo gasto</strong>
            <p>Crea gastos y asigna participantes sin ruido visual.</p>
          </button>
          <button className="action-tile" type="button">
            <span className="action-icon">$</span>
            <strong>Registrar pago</strong>
            <p>Actualiza saldos y marca movimientos de forma inmediata.</p>
          </button>
          <button className="action-tile" type="button">
            <span className="action-icon">G</span>
            <strong>Crear grupo</strong>
            <p>Organiza viajes, casa u oficina desde una sola vista.</p>
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <p className="eyebrow">Pendientes</p>
          <h2>Pagos que requieren seguimiento</h2>
        </div>

        <div className="stack-list">
          {debts.map((item) => (
            <article key={`${item.person}-${item.context}`} className="list-row">
              <div>
                <strong>{item.person}</strong>
                <p>{item.context}</p>
              </div>
              <div className="list-row-meta">
                <strong>{item.amount}</strong>
                <span className="chip chip-alert">{item.status}</span>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <p className="eyebrow">Tus grupos</p>
          <h2>Contexto rapido por grupo</h2>
        </div>

        <div className="stack-list">
          {groups.map((group) => (
            <article key={group.name} className="list-row">
              <div>
                <strong>{group.name}</strong>
                <p>{group.members}</p>
              </div>
              <div className="list-row-meta">
                <span className="chip">{group.balance}</span>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="panel panel-wide">
        <div className="section-heading">
          <p className="eyebrow">Actividad reciente</p>
          <h2>Ultimos movimientos relevantes</h2>
        </div>

        <div className="activity-feed">
          {activity.map((entry) => (
            <article key={entry} className="activity-item">
              <span className="activity-dot" />
              <p>{entry}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
