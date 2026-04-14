import { ArrowUpRight, CircleDollarSign, RefreshCcw, Users } from 'lucide-react';
import { useState } from 'react';
import GroupPanel from '../components/GroupPanel';
import SectionCard from '../components/SectionCard';
import Sidebar from '../components/Sidebar';
import SocialPanel from '../components/SocialPanel';
import StatCard from '../components/StatCard';
import StatusBanner from '../components/StatusBanner';
import { formatDate, formatMoney } from '../lib/formatters';

function BalanceVisual({ pay, receive }) {
  const total = Math.max(pay + receive, 1);
  const owe = Math.round((pay / total) * 360);

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-40 w-40 rounded-full"
        style={{
          background: `conic-gradient(#d97706 0deg ${owe}deg, #f3d0a4 ${owe}deg 360deg)`
        }}
      >
        <div className="absolute inset-[14px] flex items-center justify-center rounded-full bg-white">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Balance</p>
            <strong className="mt-2 block font-display text-3xl text-forest-950">
              {formatMoney(receive - pay)}
            </strong>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-copper-500" />
          <div>
            <p className="text-stone-500">Tu debes</p>
            <strong className="text-base text-forest-950">{formatMoney(pay)}</strong>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-copper-300" />
          <div>
            <p className="text-stone-500">Te deben</p>
            <strong className="text-base text-forest-950">{formatMoney(receive)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({
  user,
  dashboard,
  relationships,
  optimizedPayments,
  groups,
  publicGroups,
  invitations,
  selectedGroup,
  groupMessages,
  users,
  friends,
  friendRequests,
  feedback,
  onClearFeedback,
  onLogout,
  onReloadOverview,
  onReloadGroups,
  onReloadSocial,
  onCreateGroup,
  onJoinGroup,
  onOpenGroup,
  onRespondInvitation,
  onSendGroupMessage,
  onSendFriendRequest,
  onCancelFriendRequest,
  onRespondFriendRequest,
  onRemoveFriend
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const quickInsights = [
    {
      label: 'Debo',
      value: formatMoney(dashboard.total_to_pay),
      hint: 'Tus pendientes actuales',
      accent: 'from-copper-400 to-copper-600'
    },
    {
      label: 'Me deben',
      value: formatMoney(dashboard.total_to_receive),
      hint: 'Cobros por recuperar',
      accent: 'from-forest-700 to-forest-900'
    },
    {
      label: 'Saldo disponible',
      value: formatMoney(dashboard.available_balance),
      hint: 'Balance de billetera',
      accent: 'from-emerald-400 to-emerald-600'
    },
    {
      label: 'Mis grupos',
      value: dashboard.groups_count || 0,
      hint: 'Espacios activos',
      accent: 'from-stone-400 to-stone-600'
    },
    {
      label: 'Relaciones',
      value: dashboard.relationships_count || 0,
      hint: 'Usuarios con saldo activo',
      accent: 'from-sky-400 to-sky-600'
    }
  ];

  return (
    <div className="min-h-screen p-4 lg:p-5">
      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={onLogout} />

        <main className="space-y-5">
          <section className="panel overflow-hidden p-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="eyebrow text-copper-700">Dashboard</p>
                <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">
                  Hola, {user?.name?.split(' ')[0] || 'usuario'}.
                </h1>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary" onClick={onReloadOverview}>
                    <RefreshCcw className="h-4 w-4" />
                    Actualizar panel
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setActiveTab('groups')}>
                    <CircleDollarSign className="h-4 w-4" />
                    Ver grupos
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setActiveTab('social')}>
                    <Users className="h-4 w-4" />
                    Ir a social
                  </button>
                </div>
              </div>

              <div className="rounded-[30px] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 p-6 text-white">
                <p className="text-sm text-cream-100/70">Panorama actual</p>
                <strong className="mt-3 block font-display text-4xl">{groups.length} grupos activos</strong>
                <p className="mt-3 max-w-sm text-sm leading-6 text-cream-100/75">
                  {invitations.filter((invitation) => invitation.status === 'pending').length} invitaciones pendientes y {friends.length} amigos ya conectados.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cream-100/65">Publicos</p>
                    <strong className="mt-2 block text-2xl">{publicGroups.length}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cream-100/65">Usuarios</p>
                    <strong className="mt-2 block text-2xl">{users.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <StatusBanner message={feedback?.message} tone={feedback?.tone} onClose={onClearFeedback} />

          {activeTab === 'overview' ? (
            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
                {quickInsights.map((item) => (
                  <StatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    hint={item.hint}
                    accent={item.accent}
                  />
                ))}
              </section>

              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <SectionCard
                  title="Balance financiero"
                  subtitle="Una lectura mas visual del equilibrio entre lo que debes y lo que te deben."
                >
                  <BalanceVisual
                    pay={Number(dashboard.total_to_pay || 0)}
                    receive={Number(dashboard.total_to_receive || 0)}
                  />
                </SectionCard>

                <SectionCard
                  title="Actividad reciente"
                  subtitle="Atajos directos para continuar desde lo que mas importa hoy."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groups.slice(0, 4).map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        className="flex items-center justify-between rounded-[24px] border border-stone-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft"
                        onClick={() => {
                          onOpenGroup(group.id);
                          setActiveTab('groups');
                        }}
                      >
                        <div>
                          <strong className="block text-base text-forest-950">{group.name}</strong>
                          <p className="mt-1 text-sm text-stone-500">{group.total_members} integrantes</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-copper-600" />
                      </button>
                    ))}
                    {!groups.length ? (
                      <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-sm text-stone-500 sm:col-span-2">
                        Aun no tienes grupos creados o unidos.
                      </p>
                    ) : null}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard
                  title="Lo que me deben vs lo que debo"
                  subtitle="Resumen consolidado por usuario con saldos activos e historial de pagos parciales."
                >
                  <div className="space-y-3">
                    {relationships.length ? (
                      relationships.map((relationship) => (
                        <article
                          key={relationship.counterpart_id}
                          className="rounded-[24px] border border-stone-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <strong className="block text-lg text-forest-950">
                                {relationship.counterpart_name}
                              </strong>
                              <p className="mt-1 text-sm text-stone-500">
                                Balance neto: {formatMoney(relationship.net_balance)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-copper-100 px-3 py-1 font-medium text-copper-700">
                                  Debo: {formatMoney(relationship.total_to_pay)}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                                  Me deben: {formatMoney(relationship.total_to_receive)}
                                </span>
                                <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-600">
                                  Gastos pendientes: {formatMoney(relationship.pending_balance_amount)}
                                </span>
                                <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
                                  Prestamos pendientes: {formatMoney(relationship.pending_loan_amount)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-stone-500 lg:text-right">
                              <p>Ultimo pago</p>
                              <strong className="mt-1 block text-forest-950">
                                {relationship.last_payment_at ? formatDate(relationship.last_payment_at) : 'Sin pagos'}
                              </strong>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[20px] bg-stone-50 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Historial parcial</p>
                              <div className="mt-3 space-y-2">
                                {relationship.payment_history.length ? (
                                  relationship.payment_history.slice(0, 3).map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-sm text-forest-950">
                                          {payment.direction === 'out' ? 'Pagaste' : 'Recibiste'} {formatMoney(payment.amount)}
                                        </p>
                                        <p className="text-xs text-stone-500">{formatDate(payment.created_at)}</p>
                                      </div>
                                      <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600">
                                        {payment.settlement_type}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-stone-500">Todavia no hay pagos registrados con esta persona.</p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-[20px] bg-forest-950 p-4 text-white">
                              <p className="text-xs uppercase tracking-[0.18em] text-cream-100/70">Relacion activa</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white/10 p-3">
                                  <p className="text-xs text-cream-100/70">Pagos enviados</p>
                                  <strong className="mt-1 block text-lg">{formatMoney(relationship.total_paid_out)}</strong>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3">
                                  <p className="text-xs text-cream-100/70">Pagos recibidos</p>
                                  <strong className="mt-1 block text-lg">{formatMoney(relationship.total_paid_in)}</strong>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3">
                                  <p className="text-xs text-cream-100/70">Balances abiertos</p>
                                  <strong className="mt-1 block text-lg">{relationship.open_balances_count}</strong>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3">
                                  <p className="text-xs text-cream-100/70">Prestamos abiertos</p>
                                  <strong className="mt-1 block text-lg">{relationship.open_loans_count}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-sm text-stone-500">
                        No hay relaciones con saldos pendientes en este momento.
                      </p>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Liquidacion optimizada"
                  subtitle="Transferencias minimas sugeridas para saldar las deudas activas con menos movimientos."
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">Transferencias actuales</p>
                      <strong className="mt-2 block font-display text-3xl text-forest-950">
                        {optimizedPayments.original_transfers || 0}
                      </strong>
                    </div>
                    <div className="rounded-[22px] bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">Optimizadas</p>
                      <strong className="mt-2 block font-display text-3xl text-forest-950">
                        {optimizedPayments.optimized_transfers || 0}
                      </strong>
                    </div>
                    <div className="rounded-[22px] bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">Reduccion</p>
                      <strong className="mt-2 block font-display text-3xl text-forest-950">
                        {optimizedPayments.reduction || 0}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {optimizedPayments.payments?.length ? (
                      optimizedPayments.payments.map((payment, index) => (
                        <article
                          key={`${payment.from_user}-${payment.to_user}-${index}`}
                          className="flex items-center justify-between rounded-[22px] border border-stone-200 bg-white px-4 py-3"
                        >
                          <div>
                            <strong className="block text-forest-950">
                              {payment.from_user_name} paga a {payment.to_user_name}
                            </strong>
                            <p className="mt-1 text-sm text-stone-500">Movimiento optimizado #{index + 1}</p>
                          </div>
                          <span className="rounded-full bg-copper-100 px-3 py-1 text-sm font-semibold text-copper-700">
                            {formatMoney(payment.amount)}
                          </span>
                        </article>
                      ))
                    ) : (
                      <p className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-sm text-stone-500">
                        No hay transferencias pendientes para optimizar.
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === 'groups' ? (
            <GroupPanel
              myGroups={groups}
              publicGroups={publicGroups}
              invitations={invitations}
              selectedGroup={selectedGroup}
              groupMessages={groupMessages}
              onReload={onReloadGroups}
              onCreateGroup={onCreateGroup}
              onJoinGroup={onJoinGroup}
              onOpenGroup={onOpenGroup}
              onRespondInvitation={onRespondInvitation}
              onSendMessage={onSendGroupMessage}
            />
          ) : null}

          {activeTab === 'social' ? (
            <SocialPanel
              users={users}
              friends={friends}
              requests={friendRequests}
              onReload={onReloadSocial}
              onSendFriendRequest={onSendFriendRequest}
              onCancelRequest={onCancelFriendRequest}
              onRespondRequest={onRespondFriendRequest}
              onRemoveFriend={onRemoveFriend}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
