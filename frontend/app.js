const state = {
    token: localStorage.getItem('splitwise_token') || '',
    user: null,
    users: [],
    groups: [],
    publicGroups: [],
    selectedGroup: null,
    balances: [],
    expenses: [],
    payments: [],
    loans: [],
    groupMessages: [],
    dashboard: {},
    optimize: [],
    groupInvitations: [],
    socialUsers: [],
    friends: [],
    friendRequests: { received: [], sent: [] },
    activeView: 'inicio',
    showGroupMembers: false
};

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });
const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const $ = (id) => document.getElementById(id);

const els = {
    authScreen: $('auth-screen'),
    appShell: $('app-shell'),
    messageBox: $('message-box'),
    sessionStatus: $('session-status'),
    currentDate: $('current-date'),
    viewTitle: $('view-title'),
    loginForm: $('login-form'),
    logoutBtn: $('logout-btn'),
    navLinks: [...document.querySelectorAll('.nav-link')],
    shortcuts: [...document.querySelectorAll('.nav-shortcut')],
    userSearchForm: $('user-search-form'),
    userSearch: $('user-search'),
    groupForm: $('group-form'),
    groupDetailCard: $('group-detail-card'),
    groupDetailContent: $('group-detail-content'),
    hideGroupDetailBtn: $('hide-group-detail-btn'),
    toggleGroupMembersBtn: $('toggle-group-members-btn'),
    expenseForm: $('expense-form'),
    depositForm: $('deposit-form'),
    paymentForm: $('payment-form'),
    groupLoanForm: $('group-loan-form'),
    groupLoanFormCard: $('group-loan-form-card'),
    showGroupLoanFormBtn: $('show-group-loan-form-btn'),
    groupLoanTargetName: $('group-loan-target-name'),
    groupLoanTargetId: $('group-loan-target-id'),
    groupLoanAmount: $('group-loan-amount'),
    groupLoanDueDate: $('group-loan-due-date'),
    groupLoanMembers: $('group-loan-members'),
    hideGroupLoanFormBtn: $('hide-group-loan-form-btn'),
    increaseGroupLoanAmountBtn: $('increase-group-loan-amount'),
    decreaseGroupLoanAmountBtn: $('decrease-group-loan-amount'),
    groupMessageForm: $('group-message-form'),
    sidebarGroupsList: $('sidebar-groups-list'),
    publicGroupsCard: $('public-groups-card'),
    publicGroupsList: $('public-groups-list'),
    groupsList: $('groups-list'),
    usersList: $('users-list'),
    friendsList: $('friends-list'),
    loansSummaryList: $('loans-summary-list'),
    groupLoansList: $('group-loans-list'),
    groupMessagesList: $('group-messages-list'),
    friendRequestsReceived: $('friend-requests-received'),
    friendRequestsSent: $('friend-requests-sent'),
    groupInvitationsList: $('group-invitations-list'),
    balancesList: $('balances-list'),
    expenseBalancesList: $('expense-balances-list'),
    optimizeList: $('optimize-list'),
    expensesList: $('expenses-list'),
    paymentsList: $('payments-list'),
    expenseParticipantsOptions: $('expense-participants-options'),
    customSplitContainer: $('custom-split-container'),
    expenseSplitType: $('expense-split-type'),
    expensePaidBy: $('expense-paid-by'),
    expenseGroup: $('expense-group'),
    paymentGroup: $('payment-group'),
    paymentToUser: $('payment-to-user'),
    toggleCustomSplitBtn: $('toggle-custom-split-btn')
};

const viewTitles = {
    inicio: 'Inicio',
    grupos: 'Grupos',
    usuarios: 'Usuarios',
    amigos: 'Amigos'
};

const roleLabels = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };
const splitTypeLabels = { equal: 'Division equitativa', custom: 'Division personalizada' };
const invitationStatusLabels = { pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada' };
const MIN_GROUP_LOAN_AMOUNT = 1000;
const GROUP_LOAN_STEP = 50;
const MAX_GROUP_LOAN_TERM_DAYS = 15;

function setMessage(value, visible = true) {
    const content = typeof value === 'string'
        ? value
        : value?.message
            ? value.message
            : value?.error
                ? value.error
                : 'Operacion completada correctamente.';
    const normalizedContent = String(content || '').toLowerCase();
    const looksLikeError = [
        'error',
        'incorrect',
        'obligatorio',
        'obligatoria',
        'inval',
        'no ',
        'debes',
        'fall',
        'null',
        'cannot',
        'ya ',
        'banead',
        '403',
        '404',
        '409',
        '500'
    ].some((fragment) => normalizedContent.includes(fragment));

    if (!els.messageBox) return;

    els.messageBox.textContent = content;
    els.messageBox.classList.toggle('hidden', !visible || !content || !looksLikeError);
}

function setErrorMessage(value) {
    setMessage(value, true);
}

function clearMessage() {
    setMessage('', false);
}

function setCurrentDate() {
    els.currentDate.textContent = new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(new Date());
}

function setSessionStatus() {
    els.sessionStatus.textContent = state.user
        ? `${state.user.name || 'Usuario'} - ${state.user.email}`
        : 'Sin sesion';
}

function setViewMode(isAuthenticated) {
    els.authScreen.classList.toggle('hidden', isAuthenticated);
    els.appShell.classList.toggle('hidden', !isAuthenticated);
}

function setActiveView(view) {
    state.activeView = view;
    els.viewTitle.textContent = viewTitles[view] || 'Inicio';
    document.querySelectorAll('.dashboard-view').forEach((section) => {
        section.classList.toggle('active-view', section.id === `view-${view}`);
    });
    els.navLinks.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
    });
}

async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(typeof data === 'string' ? data : data.error || 'Ocurrio un error');
    return data;
}

const selectedValues = (container) => [...container.querySelectorAll('input:checked')].map((input) => input.value);
const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : 'Sin fecha');
const formatMoneyInput = (value) => Number(value || 0).toLocaleString('es-CO');
const parseMoneyInput = (value) => Number(String(value || '').replace(/\./g, '').replace(/[^\d]/g, '')) || 0;
const renderList = (target, items, renderer, emptyText) => {
    if (!target) return;
    target.innerHTML = items.length ? items.map(renderer).join('') : `<p class="empty-state">${emptyText}</p>`;
};

function renderMetrics() {
    $('metric-pay').textContent = money.format(Number(state.dashboard.total_to_pay || 0));
    $('metric-receive').textContent = money.format(Number(state.dashboard.total_to_receive || 0));
    $('metric-wallet').textContent = money.format(Number(state.dashboard.available_balance || 0));
    $('metric-groups').textContent = Number(state.dashboard.groups_count || state.groups.length || 0);
    const availableBalanceHint = $('available-balance-hint');
    if (availableBalanceHint) {
        availableBalanceHint.textContent = money.format(Number(state.dashboard.available_balance || 0));
    }
}

function updateGroupSelectors() {
    if (!els.expenseGroup || !els.paymentGroup) return;
    const options = ['<option value="">Sin grupo</option>']
        .concat(state.groups.map((group) => `<option value="${group.id}">${group.name}</option>`))
        .join('');
    els.expenseGroup.innerHTML = options;
    els.paymentGroup.innerHTML = options;
}

function updateCustomSplitInputs() {
    if (!els.customSplitContainer || !els.expenseParticipantsOptions) return;
    const selected = selectedValues(els.expenseParticipantsOptions);
    els.customSplitContainer.innerHTML = selected.map((id) => {
        const user = state.users.find((item) => item.id === id);
        return `<div class="custom-share-row"><input value="${user?.name || id}" readonly><input type="number" min="0" step="0.01" data-share-user-id="${id}" placeholder="Monto"></div>`;
    }).join('');
}

function renderSelectors() {
    if (!els.expenseParticipantsOptions || !els.expensePaidBy || !els.paymentToUser) return;
    const myId = state.user?.id;
    const otherUsers = state.users.filter((user) => user.id !== myId);

    els.expenseParticipantsOptions.innerHTML = state.users.length
        ? state.users.map((user) => `<label class="checkbox-item"><input type="checkbox" value="${user.id}" ${user.id === myId ? 'checked' : ''}><span>${user.name}</span></label>`).join('')
        : '<p class="empty-state">No hay usuarios para dividir el gasto.</p>';

    els.expensePaidBy.innerHTML = state.users.length
        ? state.users.map((user) => `<option value="${user.id}" ${user.id === myId ? 'selected' : ''}>${user.name}</option>`).join('')
        : '<option value="">Sin usuarios</option>';

    els.paymentToUser.innerHTML = otherUsers.length
        ? otherUsers.map((user) => `<option value="${user.id}">${user.name}</option>`).join('')
        : '<option value="">Sin usuarios</option>';

    updateGroupSelectors();
    updateCustomSplitInputs();
}

function renderGroups() {
    if (!els.groupsList) return;
    renderList(els.groupsList, state.groups, (group) => `
        <div class="row-card">
            <div>
                <strong>${group.name}</strong>
            </div>
            <div class="card-actions">
                <button type="button" data-action="open-group-detail" data-group-id="${group.id}">Entrar</button>
            </div>
        </div>
    `, 'Aun no perteneces a ningun grupo.');
}

function renderSidebarGroups() {
    const groupsToShow = state.selectedGroup?.group
        ? state.groups.filter((group) => group.id === state.selectedGroup.group.id)
        : state.groups.slice(0, 5);

    renderList(els.sidebarGroupsList, groupsToShow, (group) => `
        <button
            type="button"
            class="mini-group-item"
            data-action="open-group-detail"
            data-group-id="${group.id}"
        >
            <span>${group.name}</span>
            <small>${group.total_members}/${group.max_members}</small>
        </button>
    `, 'Aun no tienes grupos.');
}

function renderGroupDetail() {
    if (!els.groupDetailCard || !els.groupDetailContent) return;
    if (!state.selectedGroup) {
        els.groupDetailCard.classList.add('hidden');
        els.publicGroupsCard?.classList.remove('hidden');
        els.groupDetailContent.innerHTML = '';
        if (els.toggleGroupMembersBtn) {
            els.toggleGroupMembersBtn.textContent = 'Ver miembros';
        }
        return;
    }

    const { group, members } = state.selectedGroup;
    els.groupDetailCard.classList.remove('hidden');
    els.publicGroupsCard?.classList.add('hidden');
    if (els.toggleGroupMembersBtn) {
        els.toggleGroupMembersBtn.textContent = state.showGroupMembers ? 'Ocultar miembros' : 'Ver miembros';
    }
    els.groupDetailContent.innerHTML = `
        <div class="detail-block">
            <strong>${group.name}</strong>
            <p>${group.is_private ? 'Grupo privado' : 'Grupo publico'}</p>
            <p>Cupo: ${members.length}/${group.max_members} personas</p>
            <p>Creado: ${formatDate(group.created_at)}</p>
            <div class="card-actions detail-actions">
                <button type="button" class="ghost" data-action="leave-group" data-group-id="${group.id}">Salir del grupo</button>
            </div>
        </div>
        <div class="detail-summary-row">
            <div class="summary-pill">
                <span>Miembros</span>
                <strong>${members.length}</strong>
            </div>
            <div class="summary-pill">
                <span>Cupo disponible</span>
                <strong>${Math.max(Number(group.max_members) - members.length, 0)}</strong>
            </div>
        </div>
        <div class="detail-members ${state.showGroupMembers ? '' : 'hidden'}">
            ${members.map((member) => `
                <div class="info-card">
                    <strong>${member.name}</strong>
                    <p>${member.email}</p>
                    <p>${roleLabels[member.role] || member.role}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPublicGroups() {
    renderList(els.publicGroupsList, state.publicGroups, (group) => `
        <div class="info-card">
            <div>
                <strong>${group.name}</strong>
                <p>Creado por ${group.created_by_name}</p>
                <p>${group.total_members}/${group.max_members} personas</p>
            </div>
            <div class="card-actions">
                <span class="chip">${group.joined ? 'Ya estas dentro' : 'Disponible'}</span>
                ${group.joined ? '' : `<button type="button" data-action="join-group" data-group-id="${group.id}">Unirme</button>`}
            </div>
        </div>
    `, 'No hay grupos publicos disponibles.');
}

function renderBalances(target = els.balancesList) {
    renderList(target, state.balances, (balance) => `
        <div class="info-card">
            <strong>${money.format(Number(balance.amount))}</strong>
            <p>${balance.debtor_name} le debe a ${balance.creditor_name}</p>
        </div>
    `, 'No hay balances pendientes.');
}

function renderOptimize() {
    renderList(els.optimizeList, state.optimize, (payment) => {
        const from = state.users.find((user) => user.id === payment.from_user)?.name || payment.from_user;
        const to = state.users.find((user) => user.id === payment.to_user)?.name || payment.to_user;
        return `<div class="info-card"><strong>${money.format(Number(payment.amount))}</strong><p>${from} deberia pagar a ${to}</p></div>`;
    }, 'Todavia no hay optimizacion disponible.');
}

function renderExpenses() {
    renderList(els.expensesList, state.expenses, (expense) => `
        <div class="row-card">
            <div>
                <strong>${expense.description}</strong>
                <p>${splitTypeLabels[expense.split_type] || expense.split_type}</p>
                <p>Pago realizado por ${expense.paid_by_name}</p>
            </div>
            <div class="row-meta">
                <span>${money.format(Number(expense.total_amount))}</span>
                <span>${formatDate(expense.created_at)}</span>
            </div>
        </div>
    `, 'Aun no hay gastos registrados.');
}

function renderPayments() {
    renderList(els.paymentsList, state.payments, (payment) => `
        <div class="row-card">
            <div>
                <strong>${money.format(Number(payment.amount))}</strong>
                <p>${payment.from_user_name} pago a ${payment.to_user_name}</p>
            </div>
            <div class="row-meta">
                <span>${formatDate(payment.created_at)}</span>
            </div>
        </div>
    `, 'Aun no hay pagos registrados.');
}

function renderGroupInvitations() {
    renderList(els.groupInvitationsList, state.groupInvitations, (invitation) => `
        <div class="info-card">
            <div>
                <strong>${invitation.group_name}</strong>
                <p>Invita ${invitation.invited_by_name}</p>
                <p>Estado: ${invitationStatusLabels[invitation.status] || invitation.status}</p>
            </div>
            ${invitation.status === 'pending' ? `
                <div class="card-actions">
                    <button type="button" data-action="respond-group-invitation" data-invitation-id="${invitation.id}" data-response="accept">Aceptar</button>
                    <button type="button" class="ghost" data-action="respond-group-invitation" data-invitation-id="${invitation.id}" data-response="reject">Rechazar</button>
                </div>
            ` : ''}
        </div>
    `, 'No tienes invitaciones de grupo.');
}

function renderSocialUsers() {
    const pendingSentMap = new Map(
        state.friendRequests.sent
            .filter((request) => request.status === 'pending')
            .map((request) => [request.receiver_id, request.id])
    );

    renderList(els.usersList, state.socialUsers, (user) => `
        <div class="row-card">
            <div>
                <strong>${user.name}</strong>
                <p>${user.email}</p>
            </div>
            <div class="card-actions">
                ${user.is_friend
                    ? '<span class="chip">Amigo</span>'
                    : pendingSentMap.has(user.id)
                        ? `<button type="button" class="ghost" data-action="cancel-friend-request" data-request-id="${pendingSentMap.get(user.id)}">Cancelar solicitud</button>`
                        : `<button type="button" data-action="send-friend-request" data-user-id="${user.id}">Agregar amigo</button>`
                }
            </div>
        </div>
    `, 'No se encontraron usuarios.');
}

function renderFriends() {
    renderList(els.friendsList, state.friends, (friend) => `
        <div class="row-card">
            <div>
                <strong>${friend.friend_name}</strong>
                <p>${friend.friend_email}</p>
            </div>
            <div class="row-meta">
                <span>Amigos desde ${formatDate(friend.created_at)}</span>
            </div>
        </div>
    `, 'Todavia no tienes amigos agregados.');
}

function renderFriendRequests() {
    renderList(els.friendRequestsReceived, state.friendRequests.received, (request) => `
        <div class="info-card">
            <div>
                <strong>${request.sender_name}</strong>
                <p>${request.sender_email}</p>
                <p>Estado: ${invitationStatusLabels[request.status] || request.status}</p>
            </div>
            ${request.status === 'pending' ? `
                <div class="card-actions">
                    <button type="button" data-action="respond-friend-request" data-request-id="${request.id}" data-response="accept">Aceptar</button>
                    <button type="button" class="ghost" data-action="respond-friend-request" data-request-id="${request.id}" data-response="reject">Rechazar</button>
                </div>
            ` : ''}
        </div>
    `, 'No tienes solicitudes recibidas.');

    renderList(els.friendRequestsSent, state.friendRequests.sent, (request) => `
        <div class="info-card">
            <div>
                <strong>${request.receiver_name}</strong>
                <p>${request.receiver_email}</p>
                <p>Estado: ${invitationStatusLabels[request.status] || request.status}</p>
            </div>
            ${request.status === 'pending' ? `<div class="card-actions"><button type="button" class="ghost" data-action="cancel-friend-request" data-request-id="${request.id}">Cancelar solicitud</button></div>` : ''}
        </div>
    `, 'No has enviado solicitudes.');
}

function renderLoans() {
    const renderLoan = (loan) => `
        <div class="row-card">
            <div>
                <strong>${money.format(Number(loan.amount))}</strong>
                <p>${loan.borrower_id === state.user?.id ? `Le pediste a ${loan.lender_name}` : `${loan.borrower_name} te pidio prestado`}</p>
                <p>Total con interes: ${money.format(Number(loan.total_amount))}</p>
                <p>${loan.description || 'Sin mensaje adicional'}</p>
            </div>
            <div class="row-meta">
                <span>${loan.status}</span>
                <span>Vence ${formatDate(loan.due_date)}</span>
            </div>
        </div>
    `;

    renderList(els.loansSummaryList, state.loans.slice(0, 4), renderLoan, 'Aun no hay prestamos recientes.');
}

function renderGroupLoans() {
    if (!els.groupLoansList) return;
    const selectedGroupId = state.selectedGroup?.group?.id;
    const loans = state.loans.filter((loan) => loan.group_id === selectedGroupId);

    renderList(els.groupLoansList, loans, (loan) => `
        <div class="row-card">
            <div>
                <strong>${money.format(Number(loan.amount))}</strong>
                <p>${loan.borrower_name} solicito a ${loan.lender_name}</p>
                <p>Pago maximo: ${formatDate(loan.due_date)}</p>
                <p>${loan.description || 'Sin mensaje adicional'}</p>
            </div>
            <div class="card-actions">
                <span class="chip">${loan.status}</span>
                ${loan.status === 'pending' && loan.lender_id === state.user?.id ? `
                    <button type="button" data-action="respond-loan" data-loan-id="${loan.id}" data-response="accept">Aceptar</button>
                    <button type="button" class="ghost" data-action="respond-loan" data-loan-id="${loan.id}" data-response="reject">Rechazar</button>
                ` : ''}
                ${loan.status === 'pending' && loan.borrower_id === state.user?.id ? `
                    <button type="button" class="ghost" data-action="cancel-loan" data-loan-id="${loan.id}">Cancelar</button>
                ` : ''}
            </div>
        </div>
    `, 'Aun no hay prestamos en este grupo.');
}

function syncGroupLoanMembers() {
    if (!els.groupLoanMembers) return;
    const members = state.selectedGroup?.members || [];
    const availableMembers = members.filter((member) => member.user_id !== state.user?.id);

    if (els.groupLoanMembers) {
        els.groupLoanMembers.innerHTML = availableMembers
            .map((member) => `<option value="${member.name} - ${member.email}"></option>`)
            .join('');
    }
}

function renderGroupMessages() {
    if (!els.groupMessagesList) return;
    renderList(els.groupMessagesList, state.groupMessages, (message) => `
        <div class="chat-message ${message.sender_id === state.user?.id ? 'chat-message-own' : ''}">
            <strong>${message.sender_name}</strong>
            <p>${message.message}</p>
            <span>${formatDate(message.created_at)}</span>
        </div>
    `, 'Todavia no hay mensajes en este grupo.');
}

function renderAll() {
    renderMetrics();
    renderSelectors();
    renderGroups();
    renderSidebarGroups();
    renderGroupDetail();
    renderPublicGroups();
    renderBalances();
    renderBalances(els.expenseBalancesList);
    renderOptimize();
    renderExpenses();
    renderPayments();
    renderGroupInvitations();
    renderSocialUsers();
    renderFriends();
    renderFriendRequests();
    renderLoans();
    renderGroupLoans();
    renderGroupMessages();
    syncGroupLoanMembers();
}

async function fetchSession() {
    if (!state.token) {
        state.user = null;
        setSessionStatus();
        setViewMode(false);
        return;
    }

    const data = await api('/private');
    state.user = data.user;
    setSessionStatus();
    setViewMode(true);
}

const loadUsers = async () => { state.users = (await api('/api/users')).users; };
const loadGroups = async () => { state.groups = (await api('/api/groups/me')).groups; };
const loadPublicGroups = async () => { state.publicGroups = (await api('/api/groups/public')).groups; };
const loadGroupDetails = async (groupId) => { state.selectedGroup = await api(`/api/groups/${groupId}`); };
const loadBalances = async () => { state.balances = (await api('/api/balances/me')).balances; };
const loadExpenses = async () => { state.expenses = (await api('/api/expenses')).expenses; };
const loadPayments = async () => { state.payments = (await api('/api/payments/me')).payments; };
const loadLoans = async () => { state.loans = (await api('/api/loans/me')).loans; };
const loadGroupMessages = async (groupId) => { state.groupMessages = (await api(`/api/groups/${groupId}/messages`)).messages; };
const loadDashboard = async () => { state.dashboard = await api('/api/dashboard/me'); };
const loadOptimize = async () => { state.optimize = (await api('/api/balances/optimize')).payments; };
const loadGroupInvitations = async () => { state.groupInvitations = (await api('/api/groups/invitations/me')).invitations; };
const loadFriends = async () => { state.friends = (await api('/api/social/friends')).friends; };
const loadFriendRequests = async () => { state.friendRequests = await api('/api/social/friend-requests'); };
const loadSocialUsers = async (search = '') => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    state.socialUsers = (await api(`/api/social/users${query}`)).users;
};

async function loadAll(searchUsers = '') {
    await fetchSession();
    if (!state.user) return;

    await Promise.all([
        loadUsers(),
        loadGroups(),
        loadPublicGroups(),
        loadBalances(),
        loadExpenses(),
        loadPayments(),
        loadLoans(),
        loadDashboard(),
        loadOptimize(),
        loadGroupInvitations(),
        loadSocialUsers(searchUsers),
        loadFriends(),
        loadFriendRequests()
    ]);

    if (state.selectedGroup?.group?.id) {
        try {
            await loadGroupDetails(state.selectedGroup.group.id);
            await loadGroupMessages(state.selectedGroup.group.id);
        } catch {
            state.selectedGroup = null;
            state.groupMessages = [];
        }
    }

    renderAll();
}

async function refreshSocialData() {
    await Promise.all([
        loadSocialUsers(els.userSearch.value || ''),
        loadFriends(),
        loadFriendRequests()
    ]);
    renderSocialUsers();
    renderFriends();
    renderFriendRequests();
}

function showCreateGroupCard() {
    els.createGroupCard.classList.remove('hidden');
    els.createGroupCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCreateGroupCard() {
    els.createGroupCard.classList.add('hidden');
    els.groupForm.reset();
    els.groupMaxMembers.value = 10;
}

function openGroupLoanForm(userId = '', userName = '') {
    els.groupLoanFormCard.classList.remove('hidden');
    els.groupLoanTargetId.value = userId;
    els.groupLoanTargetName.value = userName;
    configureGroupLoanDueDate();
    els.groupLoanFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideGroupLoanForm() {
    els.groupLoanFormCard.classList.add('hidden');
    els.groupLoanForm.reset();
    els.groupLoanTargetId.value = '';
    els.groupLoanTargetName.value = '';
    if (els.groupLoanAmount) {
        els.groupLoanAmount.value = '';
    }
    configureGroupLoanDueDate();
}

function setGroupLoanAmountValue(value) {
    if (!els.groupLoanAmount) return;
    const normalized = Math.max(MIN_GROUP_LOAN_AMOUNT, Math.round(Number(value || 0)));
    els.groupLoanAmount.value = formatMoneyInput(normalized);
}

function adjustGroupLoanAmount(delta) {
    const current = parseMoneyInput(els.groupLoanAmount?.value || 0);
    const next = Math.max(MIN_GROUP_LOAN_AMOUNT, current + delta);
    setGroupLoanAmountValue(next);
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function configureGroupLoanDueDate() {
    if (!els.groupLoanDueDate) return;

    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + MAX_GROUP_LOAN_TERM_DAYS);

    els.groupLoanDueDate.min = formatDateTimeLocal(now);
    els.groupLoanDueDate.max = formatDateTimeLocal(maxDate);
}

async function handleLogin(event) {
    event.preventDefault();
    try {
        const data = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: $('login-email').value,
                password: $('login-password').value
            })
        });
        state.token = data.token;
        localStorage.setItem('splitwise_token', data.token);
        await loadAll();
        setActiveView('inicio');
        setMessage('Sesion iniciada correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleCreateGroup(event) {
    event.preventDefault();
    try {
        await api('/api/groups', {
            method: 'POST',
            body: JSON.stringify({
                name: els.groupName.value,
                is_private: els.groupPrivate.checked,
                max_members: Number(els.groupMaxMembers.value)
            })
        });
        hideCreateGroupCard();
        await Promise.all([loadGroups(), loadPublicGroups(), loadDashboard()]);
        renderGroups();
        renderPublicGroups();
        renderMetrics();
        updateGroupSelectors();
        setMessage('Grupo creado correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleCreateExpense(event) {
    event.preventDefault();
    try {
        const splitType = els.expenseSplitType.value;
        const participants = splitType === 'custom'
            ? [...els.customSplitContainer.querySelectorAll('[data-share-user-id]')].map((input) => ({ user_id: input.dataset.shareUserId, share_amount: Number(input.value || 0) }))
            : selectedValues(els.expenseParticipantsOptions);
        await api('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({
                description: $('expense-description').value,
                amount: Number($('expense-amount').value),
                group_id: els.expenseGroup.value || null,
                paid_by: els.expensePaidBy.value,
                split_type: splitType,
                participants,
                currency: 'COP'
            })
        });
        els.expenseForm.reset();
        els.customSplitContainer.classList.add('hidden');
        await Promise.all([loadExpenses(), loadBalances(), loadDashboard(), loadOptimize()]);
        renderExpenses();
        renderBalances();
        renderBalances(els.expenseBalancesList);
        renderMetrics();
        renderOptimize();
        setMessage('Gasto registrado correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleCreatePayment(event) {
    event.preventDefault();
    try {
        await api('/api/payments', {
            method: 'POST',
            body: JSON.stringify({
                group_id: els.paymentGroup.value || null,
                to_user: els.paymentToUser.value,
                amount: Number($('payment-amount').value)
            })
        });
        els.paymentForm.reset();
        await Promise.all([loadPayments(), loadBalances(), loadDashboard(), loadOptimize()]);
        renderPayments();
        renderBalances();
        renderBalances(els.expenseBalancesList);
        renderMetrics();
        renderOptimize();
        setMessage('Pago registrado correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleDeposit(event) {
    event.preventDefault();
    try {
        await api('/api/users/me/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify({
                amount: Number($('deposit-amount').value)
            })
        });
        els.depositForm.reset();
        await loadDashboard();
        renderMetrics();
        setMessage('Saldo consignado correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleCreateLoan(event) {
    event.preventDefault();
    try {
        const typedName = els.groupLoanTargetName.value.trim().toLowerCase();
        const normalizedAmount = parseMoneyInput(els.groupLoanAmount.value);
        const availableMembers = (state.selectedGroup?.members || []).filter((member) => member.user_id !== state.user?.id);
        const exactLabelMatch = availableMembers.find((member) => (
            `${member.name} - ${member.email}`.trim().toLowerCase() === typedName
        ));
        const exactNameMatch = availableMembers.find((member) => (
            member.name.trim().toLowerCase() === typedName
        ));
        const startsWithNameMatch = availableMembers.find((member) => (
            member.name.trim().toLowerCase().startsWith(typedName)
        ));
        const targetMember = exactLabelMatch || exactNameMatch || startsWithNameMatch;

        if (!targetMember) {
            throw new Error('Debes elegir una persona valida del grupo');
        }

        els.groupLoanTargetName.value = targetMember.name;
        els.groupLoanTargetId.value = targetMember.user_id;

        await api('/api/loans', {
            method: 'POST',
            body: JSON.stringify({
                group_id: state.selectedGroup?.group?.id,
                lender_id: els.groupLoanTargetId.value,
                amount: normalizedAmount,
                due_date: $('group-loan-due-date').value,
                description: $('group-loan-description').value
            })
        });
        hideGroupLoanForm();
        await loadAll();
        setMessage('Solicitud de prestamo registrada correctamente.');
    } catch (error) {
        setMessage(error.message);
    }
}

async function handleJoinPublicGroup(groupId) {
    await api(`/api/groups/${groupId}/join`, { method: 'POST' });
    await Promise.all([loadGroups(), loadPublicGroups(), loadDashboard()]);
    renderGroups();
    renderPublicGroups();
    renderMetrics();
    updateGroupSelectors();
    setMessage('Te uniste al grupo correctamente.');
}

async function handleOpenGroupDetail(groupId) {
    await loadGroupDetails(groupId);
    await loadGroupMessages(groupId);
    state.showGroupMembers = false;
    setActiveView('grupos');
    renderSidebarGroups();
    renderGroupDetail();
    renderGroupLoans();
    renderGroupMessages();
    els.groupDetailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleLeaveGroup(groupId) {
    await api(`/api/groups/${groupId}/leave`, { method: 'DELETE' });
    state.selectedGroup = null;
    state.groupMessages = [];
    state.showGroupMembers = false;
    await Promise.all([loadGroups(), loadPublicGroups(), loadDashboard()]);
    renderGroups();
    renderSidebarGroups();
    renderGroupDetail();
    renderPublicGroups();
    renderMetrics();
    updateGroupSelectors();
    setMessage('Saliste del grupo correctamente.');
}

async function handleSendFriendRequest(userId) {
    await api('/api/social/friend-requests', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: userId })
    });
    await refreshSocialData();
    setMessage('Solicitud de amistad enviada.');
}

async function handleCancelFriendRequest(requestId) {
    await api(`/api/social/friend-requests/${requestId}`, { method: 'DELETE' });
    await refreshSocialData();
    setMessage('Solicitud cancelada.');
}

async function handleRespondFriendRequest(requestId, action) {
    await api(`/api/social/friend-requests/${requestId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
    });
    await refreshSocialData();
    setMessage(action === 'accept' ? 'Solicitud aceptada.' : 'Solicitud rechazada.');
}

async function handleRespondGroupInvitation(invitationId, action) {
    await api(`/api/groups/invitations/${invitationId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
    });
    await Promise.all([loadGroupInvitations(), loadGroups(), loadPublicGroups(), loadDashboard()]);
    renderGroupInvitations();
    renderGroups();
    renderPublicGroups();
    renderMetrics();
    updateGroupSelectors();
    setMessage(action === 'accept' ? 'Invitacion aceptada.' : 'Invitacion rechazada.');
}

async function handleRespondLoan(loanId, action) {
    await api(`/api/loans/${loanId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
    });
    await loadAll();
    setMessage(action === 'accept' ? 'Prestamo aceptado.' : 'Prestamo rechazado.');
}

async function handleCancelLoan(loanId) {
    await api(`/api/loans/${loanId}/cancel`, { method: 'DELETE' });
    await loadAll();
    setMessage('Solicitud de prestamo cancelada.');
}

async function handleSendGroupMessage(event) {
    event.preventDefault();

    try {
        const groupId = state.selectedGroup?.group?.id;
        const text = $('group-message-text').value;

        await api(`/api/groups/${groupId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message: text })
        });

        $('group-message-text').value = '';
        await loadGroupMessages(groupId);
        renderGroupMessages();
        setMessage('Mensaje enviado.');
    } catch (error) {
        setMessage(error.message);
    }
}

    function bindEvents() {
        els.loginForm?.addEventListener('submit', handleLogin);
        els.groupForm?.addEventListener('submit', handleCreateGroup);
        els.expenseForm?.addEventListener('submit', handleCreateExpense);
        els.depositForm?.addEventListener('submit', handleDeposit);
        els.paymentForm?.addEventListener('submit', handleCreatePayment);
        els.groupLoanForm?.addEventListener('submit', handleCreateLoan);
    els.groupMessageForm?.addEventListener('submit', handleSendGroupMessage);

    els.logoutBtn?.addEventListener('click', () => {
        state.token = '';
        state.user = null;
        state.selectedGroup = null;
        localStorage.removeItem('splitwise_token');
        setViewMode(false);
        setSessionStatus();
        setMessage('Sesion cerrada.');
    });

    els.navLinks.forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.view)));
    els.shortcuts.forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.targetView)));
    els.showCreateGroupBtn?.addEventListener('click', showCreateGroupCard);
    els.hideCreateGroupBtn?.addEventListener('click', hideCreateGroupCard);
    els.showGroupLoanFormBtn?.addEventListener('click', () => openGroupLoanForm());
    els.hideGroupDetailBtn?.addEventListener('click', () => {
        state.selectedGroup = null;
        state.showGroupMembers = false;
        renderSidebarGroups();
        renderGroupDetail();
    });
    els.toggleGroupMembersBtn?.addEventListener('click', () => {
        state.showGroupMembers = !state.showGroupMembers;
        renderGroupDetail();
    });
    els.hideGroupLoanFormBtn?.addEventListener('click', hideGroupLoanForm);
    els.increaseGroupLoanAmountBtn?.addEventListener('click', () => adjustGroupLoanAmount(GROUP_LOAN_STEP));
    els.decreaseGroupLoanAmountBtn?.addEventListener('click', () => adjustGroupLoanAmount(-GROUP_LOAN_STEP));
    els.groupLoanAmount?.addEventListener('input', (event) => {
        const parsed = parseMoneyInput(event.target.value);
        event.target.value = parsed ? formatMoneyInput(parsed) : '';
    });
    els.groupLoanAmount?.addEventListener('blur', () => {
        const parsed = parseMoneyInput(els.groupLoanAmount.value);
        if (!parsed) return;
        setGroupLoanAmountValue(parsed);
    });
    els.groupLoanAmount?.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            adjustGroupLoanAmount(GROUP_LOAN_STEP);
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            adjustGroupLoanAmount(-GROUP_LOAN_STEP);
        }
    });

    els.userSearchForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await loadSocialUsers(els.userSearch.value || '');
            renderSocialUsers();
            setActiveView('usuarios');
            setMessage(`Busqueda actualizada para "${els.userSearch.value || 'todos'}".`);
        } catch (error) {
            setMessage(error.message);
        }
    });

    els.expenseParticipantsOptions?.addEventListener('change', updateCustomSplitInputs);
    els.expenseSplitType?.addEventListener('change', () => {
        const isCustom = els.expenseSplitType.value === 'custom';
        els.customSplitContainer.classList.toggle('hidden', !isCustom);
        updateCustomSplitInputs();
    });
    els.toggleCustomSplitBtn?.addEventListener('click', () => {
        els.expenseSplitType.value = els.expenseSplitType.value === 'equal' ? 'custom' : 'equal';
        const isCustom = els.expenseSplitType.value === 'custom';
        els.customSplitContainer.classList.toggle('hidden', !isCustom);
        updateCustomSplitInputs();
    });

    [
        ['reload-groups-btn', () => loadGroups().then(() => { renderGroups(); updateGroupSelectors(); setMessage('Mis grupos recargados.'); })],
        ['reload-public-groups-btn', () => loadPublicGroups().then(() => { renderPublicGroups(); setMessage('Grupos publicos recargados.'); })],
        ['reload-balances-btn', () => loadBalances().then(() => { renderBalances(); renderBalances(els.expenseBalancesList); setMessage('Balances recargados.'); })],
        ['reload-expense-balances-btn', () => loadBalances().then(() => { renderBalances(); renderBalances(els.expenseBalancesList); setMessage('Balances recargados.'); })],
        ['reload-optimize-btn', () => loadOptimize().then(() => { renderOptimize(); setMessage('Optimizacion recalculada.'); })],
        ['reload-expenses-btn', () => loadExpenses().then(() => { renderExpenses(); setMessage('Gastos recargados.'); })],
        ['reload-payments-btn', () => loadPayments().then(() => { renderPayments(); setMessage('Pagos recargados.'); })],
        ['reload-group-invitations-btn', () => loadGroupInvitations().then(() => { renderGroupInvitations(); setMessage('Invitaciones de grupo recargadas.'); })],
        ['reload-payment-users-btn', () => loadUsers().then(() => { renderSelectors(); setMessage('Usuarios para pagos recargados.'); })],
        ['reload-friends-btn', () => loadFriends().then(() => { renderFriends(); setMessage('Amigos recargados.'); })],
        ['reload-friend-requests-btn', () => loadFriendRequests().then(() => { renderFriendRequests(); setMessage('Solicitudes recargadas.'); })],
        ['reload-loans-btn', () => loadLoans().then(() => { renderLoans(); renderGroupLoans(); setMessage('Prestamos recargados.'); })],
        ['reload-group-loans-btn', () => loadLoans().then(() => { renderLoans(); renderGroupLoans(); setMessage('Prestamos del grupo recargados.'); })],
        ['reload-group-messages-btn', () => {
            const groupId = state.selectedGroup?.group?.id;
            return loadGroupMessages(groupId).then(() => { renderGroupMessages(); setMessage('Mensajes recargados.'); });
        }]
    ].forEach(([id, handler]) => {
        const button = $(id);
        button?.addEventListener('click', () => handler().catch((error) => setMessage(error.message)));
    });

    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        try {
            const action = button.dataset.action;
            if (action === 'join-group') await handleJoinPublicGroup(button.dataset.groupId);
            if (action === 'open-group-detail') await handleOpenGroupDetail(button.dataset.groupId);
            if (action === 'leave-group') await handleLeaveGroup(button.dataset.groupId);
            if (action === 'send-friend-request') await handleSendFriendRequest(button.dataset.userId);
            if (action === 'cancel-friend-request') await handleCancelFriendRequest(button.dataset.requestId);
            if (action === 'respond-friend-request') await handleRespondFriendRequest(button.dataset.requestId, button.dataset.response);
            if (action === 'respond-group-invitation') await handleRespondGroupInvitation(button.dataset.invitationId, button.dataset.response);
            if (action === 'open-group-loan-form') openGroupLoanForm(button.dataset.userId, button.dataset.userName);
            if (action === 'respond-loan') await handleRespondLoan(button.dataset.loanId, button.dataset.response);
            if (action === 'cancel-loan') await handleCancelLoan(button.dataset.loanId);
        } catch (error) {
            setMessage(error.message);
        }
    });
}

async function bootstrap() {
    setCurrentDate();
    setSessionStatus();
    setViewMode(false);
    setActiveView('inicio');
    configureGroupLoanDueDate();
    bindEvents();

    if (!state.token) return;

    try {
        await loadAll();
        setMessage('Sesion recuperada.');
    } catch (error) {
        localStorage.removeItem('splitwise_token');
        state.token = '';
        setViewMode(false);
        setMessage(error.message);
    }
}

bootstrap();
