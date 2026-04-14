import { X } from 'lucide-react';
import { useState } from 'react';

const initialState = {
  name: '',
  description: '',
  max_members: 15,
  is_private: false
};

export default function CreateGroupModal({ open, onClose, onSubmit }) {
  const [formState, setFormState] = useState(initialState);

  if (!open) return null;

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(
      {
        ...formState,
        max_members: Number(formState.max_members)
      },
      () => {
        setFormState(initialState);
        onClose();
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 px-4 backdrop-blur-sm">
      <div className="panel w-full max-w-2xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-copper-700">Nuevo grupo</p>
            <h3 className="mt-2 font-display text-3xl text-forest-950">Crea un espacio impecable para tus gastos</h3>
          </div>
          <button type="button" className="btn-secondary rounded-full p-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input
            className="input-base"
            name="name"
            value={formState.name}
            onChange={updateField}
            placeholder="Nombre del grupo"
            required
          />
          <textarea
            className="input-base min-h-32"
            name="description"
            value={formState.description}
            onChange={updateField}
            placeholder="Describe el objetivo del grupo y el tipo de gastos que manejaran"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="input-base"
              type="number"
              min="3"
              max="15"
              name="max_members"
              value={formState.max_members}
              onChange={updateField}
              required
            />
            <label className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              Grupo privado
              <input
                type="checkbox"
                name="is_private"
                checked={formState.is_private}
                onChange={updateField}
                className="h-4 w-4 accent-[#173c31]"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
