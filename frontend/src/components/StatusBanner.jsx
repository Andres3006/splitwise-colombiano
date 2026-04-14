import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const tones = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  error: {
    icon: AlertCircle,
    classes: 'border-rose-200 bg-rose-50 text-rose-800'
  },
  info: {
    icon: AlertCircle,
    classes: 'border-copper-200 bg-copper-300/10 text-copper-700'
  }
};

export default function StatusBanner({ message, tone = 'info', onClose }) {
  if (!message) return null;

  const config = tones[tone] || tones.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start justify-between gap-4 rounded-3xl border px-4 py-3 shadow-soft ${config.classes}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium leading-6">{message}</p>
      </div>
      <button type="button" className="rounded-full p-1 transition hover:bg-black/5" onClick={onClose}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
