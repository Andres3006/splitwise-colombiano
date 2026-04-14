import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import AuthShell from '../components/AuthShell';
import StatusBanner from '../components/StatusBanner';

export default function LoginPage({ onLogin, onNavigateToRegister, feedback, onClearFeedback }) {
  const [formState, setFormState] = useState({
    email: '',
    password: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  return (
    <AuthShell
      eyebrow="Splitwise Colombiano"
      title="Bienvenido de nuevo"
      subtitle="Ingresa para revisar grupos, liquidaciones e interacciones sociales con una experiencia mucho más cuidada."
      footer={
        <p>
          No tienes cuenta?{' '}
          <button type="button" className="font-semibold text-copper-700 transition hover:text-copper-600" onClick={onNavigateToRegister}>
            Registrarse
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
            onLogin(formState);
          }}
        >
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
                placeholder="Ingresa tu contrasena"
                required
              />
            </div>
          </label>

          <button type="submit" className="btn-primary mt-2 w-full">
            Iniciar sesion
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
