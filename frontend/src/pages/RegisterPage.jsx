import { CalendarDays, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import AuthShell from '../components/AuthShell';
import StatusBanner from '../components/StatusBanner';
import { getTodayDateInputMax } from '../lib/formatters';

const initialState = {
  name: '',
  email: '',
  password: '',
  birth_date: ''
};

export default function RegisterPage({
  onRegister,
  onNavigateToLogin,
  feedback,
  onClearFeedback
}) {
  const [formState, setFormState] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  return (
    <AuthShell
      eyebrow="Nueva cuenta"
      title="Crea tu usuario"
      subtitle="Configura tu cuenta en minutos y entra a una experiencia más profesional para gastos compartidos."
      footer={
        <p>
          Ya tienes cuenta?{' '}
          <button type="button" className="font-semibold text-copper-700 transition hover:text-copper-600" onClick={onNavigateToLogin}>
            Iniciar sesion
          </button>
        </p>
      }
    >
      <div className="grid gap-5">
        <StatusBanner message={feedback?.message} tone={feedback?.tone} onClose={onClearFeedback} />

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onRegister(formState, () => setFormState(initialState));
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-600">Nombre</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input-base pl-11"
                type="text"
                name="name"
                value={formState.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-600">Correo</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input-base pl-11"
                type="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                required
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-600">Contrasena</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input-base pl-11"
                type="password"
                name="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Crea una contrasena segura"
                required
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-600">Fecha de nacimiento</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input-base pl-11"
                type="date"
                name="birth_date"
                value={formState.birth_date}
                onChange={handleChange}
                max={getTodayDateInputMax()}
                required
              />
            </div>
          </label>

          <button type="submit" className="btn-primary mt-2 w-full">
            Crear cuenta
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
