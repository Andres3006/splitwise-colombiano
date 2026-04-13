import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      if (data.token) {
        localStorage.setItem('splitwise_token', data.token);
      }

      setMessage('Inicio de sesion correcto. El token quedo guardado en localStorage.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-wrapper">
      <article className="auth-card">
        <div className="auth-intro">
          <div>
            <p className="eyebrow">Acceso</p>
            <h1>Entra y retoma tus gastos compartidos con una vista mas clara.</h1>
            <p className="lead">
              Revisa balances, grupos y pagos pendientes desde una interfaz mas limpia y moderna.
            </p>
          </div>

          <div className="auth-note-card">
            <span className="chip">Acceso rapido</span>
            <p>Una vez inicies sesion, el dashboard te muestra de inmediato deudas, grupos y actividad.</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>

          <label className="field">
            <span>Contrasena</span>
            <input
              type="password"
              placeholder="Ingresa tu contrasena"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>

          <button className="button button-block" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesion'}
          </button>
        </form>

        {message ? <p className="feedback">{message}</p> : null}
      </article>
    </section>
  );
}
