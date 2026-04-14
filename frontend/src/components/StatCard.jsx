export default function StatCard({ label, value, hint, accent = 'from-copper-400 to-copper-600' }) {
  return (
    <article className="panel relative overflow-hidden p-5">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-3 text-sm text-stone-500">{label}</p>
      <strong className="mt-2 block font-display text-3xl text-forest-950">{value}</strong>
      {hint ? <span className="mt-3 inline-block text-xs text-stone-400">{hint}</span> : null}
    </article>
  );
}
