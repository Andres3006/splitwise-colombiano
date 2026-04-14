import { Search, UserPlus2, Users2 } from 'lucide-react';
import { useState } from 'react';
import SectionCard from './SectionCard';
import { formatDate } from '../lib/formatters';

export default function SocialPanel({
  users,
  friends,
  requests,
  onReload,
  onSendFriendRequest,
  onCancelRequest,
  onRespondRequest,
  onRemoveFriend
}) {
  const [search, setSearch] = useState('');

  const normalized = search.trim().toLowerCase();
  const filteredUsers = !normalized
    ? users
    : users.filter(
        (user) =>
          user.name?.toLowerCase().includes(normalized) || user.email?.toLowerCase().includes(normalized)
      );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard
        title="Usuarios"
        subtitle="Encuentra personas, revisa el estado de tu conexión y envía solicitudes sin perder contexto."
        actions={
          <>
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input-base pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuarios"
              />
            </div>
            <button type="button" className="btn-secondary" onClick={onReload}>
              Recargar
            </button>
          </>
        }
        className="xl:col-span-2"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] bg-forest-950 p-5 text-white">
            <Users2 className="h-5 w-5 text-copper-300" />
            <p className="mt-4 text-sm text-cream-100/70">Amigos activos</p>
            <strong className="mt-2 block font-display text-4xl">{friends.length}</strong>
          </div>
          <div className="rounded-[24px] bg-copper-500 p-5 text-white">
            <UserPlus2 className="h-5 w-5 text-white/90" />
            <p className="mt-4 text-sm text-white/80">Solicitudes recibidas</p>
            <strong className="mt-2 block font-display text-4xl">{requests.received.length}</strong>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">Pendientes enviadas</p>
            <strong className="mt-2 block font-display text-4xl text-forest-950">
              {requests.sent.filter((request) => request.status === 'pending').length}
            </strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Directorio social" subtitle="La búsqueda y el contexto ahora están en el mismo flujo.">
        <div className="space-y-3">
          {filteredUsers.length ? (
            filteredUsers.map((user) => {
              const isPendingSent = user.pending_request_direction === 'sent';
              const isPendingReceived = user.pending_request_direction === 'received';

              return (
                <article
                  key={user.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <strong className="block text-lg text-forest-950">{user.name}</strong>
                    <p className="mt-1 text-sm text-stone-500">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.is_friend ? (
                      <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-medium text-forest-800">
                        Amigo
                      </span>
                    ) : null}
                    {!user.is_friend && !user.pending_request_id ? (
                      <button type="button" className="btn-secondary" onClick={() => onSendFriendRequest(user.id)}>
                        Agregar
                      </button>
                    ) : null}
                    {isPendingSent ? (
                      <span className="rounded-full bg-copper-100 px-3 py-1 text-xs font-medium text-copper-700">
                        Solicitud enviada
                      </span>
                    ) : null}
                    {isPendingReceived ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Te envio solicitud
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
              No hay usuarios para mostrar.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Amigos" subtitle="Tu red activa dentro de la plataforma.">
        <div className="space-y-3">
          {friends.length ? (
            friends.map((friend) => (
              <article
                key={friend.friend_id}
                className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <strong className="block text-lg text-forest-950">{friend.friend_name}</strong>
                  <p className="mt-1 text-sm text-stone-500">{friend.friend_email}</p>
                  <small className="mt-2 block text-xs text-stone-400">Desde {formatDate(friend.created_at)}</small>
                </div>
                <button type="button" className="btn-secondary" onClick={() => onRemoveFriend(friend.friend_id)}>
                  Eliminar amistad
                </button>
              </article>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
              Todavia no tienes amigos registrados.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Solicitudes recibidas" subtitle="Decide rápido qué conexiones quieres aceptar.">
        <div className="space-y-3">
          {requests.received.length ? (
            requests.received.map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <strong className="block text-lg text-forest-950">{request.sender_name}</strong>
                  <p className="mt-1 text-sm text-stone-500">{request.sender_email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status === 'pending' ? (
                    <>
                      <button type="button" className="btn-primary" onClick={() => onRespondRequest(request.id, 'accept')}>
                        Aceptar
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => onRespondRequest(request.id, 'reject')}>
                        Rechazar
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{request.status}</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
              No tienes solicitudes recibidas.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Solicitudes enviadas" subtitle="Haz seguimiento a tus invitaciones salientes.">
        <div className="space-y-3">
          {requests.sent.length ? (
            requests.sent.map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <strong className="block text-lg text-forest-950">{request.receiver_name}</strong>
                  <p className="mt-1 text-sm text-stone-500">{request.receiver_email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status === 'pending' ? (
                    <button type="button" className="btn-secondary" onClick={() => onCancelRequest(request.id)}>
                      Cancelar
                    </button>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{request.status}</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
              No has enviado solicitudes.
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
