export default function AuthShell({ title, subtitle, eyebrow, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.18),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(16,44,36,0.16),transparent_24%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex items-center px-6 py-14 lg:px-16">
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow text-copper-700">{eyebrow}</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] text-forest-950 sm:text-6xl">
              Administra tus cuentas compartidas con una experiencia elegante.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="panel-soft p-4">
                <p className="text-sm text-stone-500">Seguimiento</p>
                <strong className="mt-2 block text-2xl text-forest-950">Grupos</strong>
              </div>
              <div className="panel-soft p-4">
                <p className="text-sm text-stone-500">Liquidacion</p>
                <strong className="mt-2 block text-2xl text-forest-950">Pagos</strong>
              </div>
              <div className="panel-soft p-4">
                <p className="text-sm text-stone-500">Relacion</p>
                <strong className="mt-2 block text-2xl text-forest-950">Amigos</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="panel w-full max-w-xl p-6 sm:p-8">
            <div className="mb-6">
              <p className="eyebrow text-forest-700">{eyebrow}</p>
              <h2 className="mt-3 font-display text-4xl text-forest-950">{title}</h2>
            </div>
            {children}
            {footer ? <div className="mt-6 border-t border-stone-200 pt-5 text-sm text-stone-600">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
