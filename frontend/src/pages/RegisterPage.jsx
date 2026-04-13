import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birth_date: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      setMessage('Usuario registrado correctamente.');
      setForm({
        name: '',
        email: '',
        password: '',
        birth_date: ''
      });
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
            <p className="eyebrow">Cuenta nueva</p>
            <h1>Crea tu cuenta y empieza a organizar gastos sin perder contexto.</h1>
            <p className="lead">
              La base nueva en React ya prepara una experiencia mas ordenada para registrar gastos,
              dividir cuentas y entender balances.
            </p>
          </div>

          <div className="auth-note-card">
            <span className="chip">Incluye</span>
            <p>Acceso al nuevo dashboard, formularios mas claros y una UI coherente con la referencia visual.</p>
          </div>
        </div>

        <form className="stack form-grid" onSubmit={handleSubmit}>
          <label className="field field-full">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>

          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>

          <label className="field">
            <span>Fecha de nacimiento</span>
            <input
              type="date"
              value={form.birth_date}
              onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
              required
            />
          </label>

          <label className="field field-full">
            <span>Contrasena</span>
            <input
              type="password"
              placeholder="Crea una contrasena segura"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>

          <button className="button button-block field-full" type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        {message ? <p className="feedback">{message}</p> : null}
      </article>
    </section>
  );
}
