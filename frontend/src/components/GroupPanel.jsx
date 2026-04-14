import { MessageSquareMore, Search, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import CreateGroupModal from './CreateGroupModal';
import SectionCard from './SectionCard';
import { formatDate } from '../lib/formatters';

export default function GroupPanel({
  myGroups,
  publicGroups,
  invitations,
  selectedGroup,
  groupMessages,
  onReload,
  onCreateGroup,
  onJoinGroup,
  onOpenGroup,
  onRespondInvitation,
  onSendMessage
}) {
  const [search, setSearch] = useState('');
  const [openCreateModal, setOpenCreateModal] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredMyGroups = myGroups.filter(
    (group) =>
      group.name?.toLowerCase().includes(normalizedSearch) ||
      group.description?.toLowerCase().includes(normalizedSearch)
  );
  const filteredPublicGroups = publicGroups.filter(
    (group) =>
      group.name?.toLowerCase().includes(normalizedSearch) ||
      group.description?.toLowerCase().includes(normalizedSearch)
  );

  return (
    <>
      <CreateGroupModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onSubmit={onCreateGroup}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Espacios compartidos"
          subtitle="Administra grupos públicos y privados con una vista más clara, buscador integrado y acceso inmediato al detalle."
          actions={
            <>
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  className="input-base pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar grupos"
                />
              </div>
              <button type="button" className="btn-secondary" onClick={onReload}>
                Recargar
              </button>
              <button type="button" className="btn-primary" onClick={() => setOpenCreateModal(true)}>
                Nuevo grupo
              </button>
            </>
          }
          className="xl:col-span-2"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-forest-950 p-5 text-white">
              <Users className="h-5 w-5 text-copper-300" />
              <p className="mt-4 text-sm text-cream-100/70">Tus grupos</p>
              <strong className="mt-2 block font-display text-4xl">{myGroups.length}</strong>
            </div>
            <div className="rounded-[24px] bg-copper-500 p-5 text-white">
              <Sparkles className="h-5 w-5 text-white/80" />
              <p className="mt-4 text-sm text-white/80">Publicos disponibles</p>
              <strong className="mt-2 block font-display text-4xl">{publicGroups.length}</strong>
            </div>
            <div className="rounded-[24px] bg-white p-5 ring-1 ring-stone-200">
              <MessageSquareMore className="h-5 w-5 text-forest-800" />
              <p className="mt-4 text-sm text-stone-500">Invitaciones pendientes</p>
              <strong className="mt-2 block font-display text-4xl text-forest-950">
                {invitations.filter((invitation) => invitation.status === 'pending').length}
              </strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tus grupos" subtitle="Entra rápido a cada espacio y revisa su capacidad actual.">
          <div className="space-y-3">
            {filteredMyGroups.length ? (
              filteredMyGroups.map((group) => (
                <article
                  key={group.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <strong className="block text-lg font-semibold text-forest-950">{group.name}</strong>
                    <p className="mt-1 text-sm leading-6 text-stone-500">{group.description}</p>
                    <span className="mt-3 inline-flex rounded-full bg-copper-100 px-3 py-1 text-xs font-medium text-copper-700">
                      {group.total_members}/{group.max_members} integrantes
                    </span>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => onOpenGroup(group.id)}>
                    Ver detalle
                  </button>
                </article>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                No encontramos grupos con ese criterio.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Explorar grupos publicos" subtitle="Unete a comunidades abiertas con un solo clic.">
          <div className="space-y-3">
            {filteredPublicGroups.length ? (
              filteredPublicGroups.map((group) => (
                <article
                  key={group.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-gradient-to-br from-white to-cream-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <strong className="block text-lg font-semibold text-forest-950">{group.name}</strong>
                    <p className="mt-1 text-sm leading-6 text-stone-500">{group.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-medium text-forest-800">
                        {group.total_members}/{group.max_members}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        Publico
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={group.joined ? 'btn-secondary opacity-70' : 'btn-primary'}
                    disabled={group.joined}
                    onClick={() => onJoinGroup(group.id)}
                  >
                    {group.joined ? 'Ya estas dentro' : 'Unirme'}
                  </button>
                </article>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                No hay grupos publicos que coincidan con la busqueda.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Invitaciones" subtitle="Responde rápidamente las invitaciones que recibes.">
          <div className="space-y-3">
            {invitations.length ? (
              invitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <strong className="block text-lg text-forest-950">{invitation.group_name}</strong>
                    <p className="mt-1 text-sm text-stone-500">Te invito {invitation.invited_by_name}</p>
                    <small className="mt-2 block text-xs text-stone-400">{formatDate(invitation.created_at)}</small>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => onRespondInvitation(invitation.id, 'accept')}>
                      Aceptar
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => onRespondInvitation(invitation.id, 'reject')}>
                      Rechazar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                No tienes invitaciones pendientes.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedGroup ? selectedGroup.group.name : 'Conversacion y detalle'}
          subtitle={
            selectedGroup
              ? selectedGroup.group.description
              : 'Selecciona uno de tus grupos para ver miembros y conversar.'
          }
          className="xl:col-span-2"
        >
          {selectedGroup ? (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] bg-gradient-to-br from-forest-950 to-forest-800 p-5 text-white">
                <p className="text-sm text-cream-100/70">Capacidad actual</p>
                <strong className="mt-2 block font-display text-5xl">
                  {selectedGroup.members.length}
                  <span className="text-2xl text-cream-100/70">/{selectedGroup.group.max_members}</span>
                </strong>
                <div className="mt-6 space-y-2">
                  {selectedGroup.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-white">{member.name}</span>
                      <span className="rounded-full bg-copper-300/20 px-3 py-1 text-xs text-copper-100">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <p className="text-sm text-cream-100/70">Historial de entradas y salidas</p>
                  <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                    {selectedGroup.member_history?.length ? (
                      selectedGroup.member_history.map((memberEvent) => (
                        <div
                          key={memberEvent.id}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <p className="text-sm font-medium text-white">{memberEvent.name}</p>
                          <p className="mt-1 text-xs text-cream-100/70">
                            Entro: {formatDate(memberEvent.joined_at)}
                          </p>
                          <p className="mt-1 text-xs text-cream-100/70">
                            Salio: {memberEvent.left_at ? formatDate(memberEvent.left_at) : 'Sigue activo'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-cream-100/70">Aun no hay historial de miembros.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {groupMessages.length ? (
                    groupMessages.map((message) => (
                      <article key={message.id} className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm text-forest-950">{message.sender_name}</strong>
                          <span className="text-xs text-stone-400">{formatDate(message.created_at)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-stone-600">{message.message}</p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                      Todavia no hay mensajes en este grupo.
                    </p>
                  )}
                </div>

                <form
                  className="grid gap-3 rounded-[24px] border border-stone-200 bg-white p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const message = String(formData.get('message') || '').trim();
                    if (!message) return;
                    onSendMessage(message);
                    event.currentTarget.reset();
                  }}
                >
                  <textarea
                    name="message"
                    className="input-base min-h-[120px]"
                    placeholder="Escribe un mensaje para el grupo"
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary">
                      Enviar mensaje
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
              Todavia no has abierto un grupo.
            </p>
          )}
        </SectionCard>
      </div>
    </>
  );
}
