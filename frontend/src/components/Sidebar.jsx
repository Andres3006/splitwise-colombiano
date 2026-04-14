import { CircleDollarSign, LayoutDashboard, LogOut, UsersRound } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'groups', label: 'Grupos', icon: CircleDollarSign },
  { id: 'social', label: 'Social', icon: UsersRound }
];

export default function Sidebar({ user, activeTab, onTabChange, onLogout }) {
  return (
    <aside className="flex h-full min-h-[calc(100vh-2rem)] flex-col rounded-[32px] bg-forest-950 px-4 py-5 text-white shadow-panel">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
        <p className="eyebrow text-cream-100/70">Splitwise Colombiano</p>
        <h2 className="mt-3 font-display text-3xl text-cream-50">Workspace</h2>
        <p className="mt-4 text-sm font-medium text-cream-50">{user?.name || 'Usuario'}</p>
        <p className="mt-1 text-xs text-cream-100/70">{user?.email || 'Sin sesion'}</p>
      </div>

      <nav className="mt-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                active
                  ? 'bg-cream-50 text-forest-950 shadow-soft'
                  : 'text-cream-100/80 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-4 text-sm text-cream-100/80">
        <p className="font-medium text-white">Tu panel está listo para crecer</p>
        <p className="mt-2 leading-6">
          Mantén grupos, pagos y relaciones desde una misma interfaz con mejor jerarquía visual.
        </p>
      </div>

      <button
        type="button"
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesion
      </button>
    </aside>
  );
}
