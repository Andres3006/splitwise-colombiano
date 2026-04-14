export default function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel p-5 sm:p-6 ${className}`.trim()}>
      <header className="mb-5 flex flex-col gap-4 border-b border-stone-200/80 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-display text-2xl text-forest-950">{title}</h3>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
