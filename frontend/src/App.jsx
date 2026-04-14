import { useEffect, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { authApi, dashboardApi, groupsApi, socialApi } from './lib/api';

const TOKEN_KEY = 'splitwise_token';
const emptyFeedback = { message: '', tone: 'info' };

function useRouteState() {
  const [route, setRoute] = useState(window.location.pathname === '/register' ? '/register' : '/');

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname === '/register' ? '/register' : '/');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  return { route, navigate };
}

export default function App() {
  const { route, navigate } = useRouteState();
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState({});
  const [relationships, setRelationships] = useState([]);
  const [optimizedPayments, setOptimizedPayments] = useState({
    original_transfers: 0,
    optimized_transfers: 0,
    reduction: 0,
    participants: 0,
    payments: []
  });
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [feedback, setFeedback] = useState(emptyFeedback);

  const showFeedback = (message, tone = 'info') => {
    setFeedback({ message, tone });
  };

  const clearFeedback = () => setFeedback(emptyFeedback);

  const resetSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setDashboard({});
    setRelationships([]);
    setOptimizedPayments({
      original_transfers: 0,
      optimized_transfers: 0,
      reduction: 0,
      participants: 0,
      payments: []
    });
    setGroups([]);
    setPublicGroups([]);
    setInvitations([]);
    setSelectedGroup(null);
    setGroupMessages([]);
    setUsers([]);
    setFriends([]);
    setFriendRequests({ received: [], sent: [] });
  };

  const loadOverview = async (sessionToken) => {
    const [userResponse, dashboardResponse, relationshipsResponse, optimizedPaymentsResponse] = await Promise.all([
      authApi.getCurrentUser(sessionToken),
      dashboardApi.getSummary(sessionToken),
      dashboardApi.getRelationships(sessionToken),
      dashboardApi.getOptimizedPayments(sessionToken)
    ]);

    setUser(userResponse.user);
    setDashboard(dashboardResponse);
    setRelationships(relationshipsResponse.relationships || []);
    setOptimizedPayments(optimizedPaymentsResponse || {
      original_transfers: 0,
      optimized_transfers: 0,
      reduction: 0,
      participants: 0,
      payments: []
    });
  };

  const loadGroups = async (sessionToken) => {
    const [myGroupsResponse, publicGroupsResponse, invitationsResponse] = await Promise.all([
      groupsApi.getMine(sessionToken),
      groupsApi.getPublic(sessionToken),
      groupsApi.getInvitations(sessionToken)
    ]);

    setGroups(myGroupsResponse.groups || []);
    setPublicGroups(publicGroupsResponse.groups || []);
    setInvitations(invitationsResponse.invitations || []);
  };

  const loadSocial = async (sessionToken) => {
    const [usersResponse, friendsResponse, requestsResponse] = await Promise.all([
      socialApi.getUsers(sessionToken),
      socialApi.getFriends(sessionToken),
      socialApi.getRequests(sessionToken)
    ]);

    setUsers(usersResponse.users || []);
    setFriends(friendsResponse.friends || []);
    setFriendRequests({
      received: requestsResponse.received || [],
      sent: requestsResponse.sent || []
    });
  };

  const loadAppData = async (sessionToken) => {
    await Promise.all([loadOverview(sessionToken), loadGroups(sessionToken), loadSocial(sessionToken)]);
  };

  useEffect(() => {
    if (!token) return;

    loadAppData(token).catch((error) => {
      resetSession();
      showFeedback(error.message, 'error');
    });
  }, [token]);

  const handleLogin = async (payload) => {
    try {
      const response = await authApi.login(payload);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      navigate('/');
      showFeedback('Sesion iniciada correctamente.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleRegister = async (payload, resetForm) => {
    try {
      await authApi.register(payload);
      resetForm();
      navigate('/');
      showFeedback('Cuenta creada correctamente. Ya puedes iniciar sesion.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleCreateGroup = async (payload, onDone) => {
    try {
      await groupsApi.create(token, {
        name: payload.name,
        description: payload.description,
        max_members: payload.max_members,
        is_private: payload.is_private
      });
      await loadGroups(token);
      await loadOverview(token);
      onDone?.();
      showFeedback('Grupo creado correctamente.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await groupsApi.join(token, groupId);
      await loadGroups(token);
      await loadOverview(token);
      showFeedback('Te uniste al grupo correctamente.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleOpenGroup = async (groupId) => {
    try {
      const [detailsResponse, messagesResponse] = await Promise.all([
        groupsApi.getDetails(token, groupId),
        groupsApi.getMessages(token, groupId)
      ]);
      setSelectedGroup(detailsResponse);
      setGroupMessages(messagesResponse.messages || []);
      showFeedback('Detalle del grupo cargado.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleRespondInvitation = async (invitationId, action) => {
    try {
      await groupsApi.respondInvitation(token, invitationId, action);
      await loadGroups(token);
      await loadOverview(token);
      showFeedback(
        action === 'accept' ? 'Invitacion aceptada correctamente.' : 'Invitacion rechazada correctamente.',
        'success'
      );
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleSendGroupMessage = async (message) => {
    if (!selectedGroup?.group?.id) return;

    try {
      await groupsApi.sendMessage(token, selectedGroup.group.id, message);
      const messagesResponse = await groupsApi.getMessages(token, selectedGroup.group.id);
      setGroupMessages(messagesResponse.messages || []);
      showFeedback('Mensaje enviado correctamente.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await socialApi.sendRequest(token, userId);
      await loadSocial(token);
      showFeedback('Solicitud de amistad enviada.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleCancelFriendRequest = async (requestId) => {
    try {
      await socialApi.cancelRequest(token, requestId);
      await loadSocial(token);
      showFeedback('Solicitud cancelada.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleRespondFriendRequest = async (requestId, action) => {
    try {
      await socialApi.respondRequest(token, requestId, action);
      await loadSocial(token);
      showFeedback(
        action === 'accept' ? 'Solicitud aceptada correctamente.' : 'Solicitud rechazada correctamente.',
        'success'
      );
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await socialApi.removeFriend(token, friendId);
      await loadSocial(token);
      showFeedback('Amistad eliminada correctamente.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  };

  const handleLogout = () => {
    resetSession();
    navigate('/');
    showFeedback('Sesion cerrada.', 'success');
  };

  if (!token) {
    if (route === '/register') {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onNavigateToLogin={() => navigate('/')}
          feedback={feedback}
          onClearFeedback={clearFeedback}
        />
      );
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigateToRegister={() => navigate('/register')}
        feedback={feedback}
        onClearFeedback={clearFeedback}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      dashboard={dashboard}
      relationships={relationships}
      optimizedPayments={optimizedPayments}
      groups={groups}
      publicGroups={publicGroups}
      invitations={invitations}
      selectedGroup={selectedGroup}
      groupMessages={groupMessages}
      users={users}
      friends={friends}
      friendRequests={friendRequests}
      feedback={feedback}
      onClearFeedback={clearFeedback}
      onLogout={handleLogout}
      onReloadOverview={() => loadOverview(token)}
      onReloadGroups={() => loadGroups(token)}
      onReloadSocial={() => loadSocial(token)}
      onCreateGroup={handleCreateGroup}
      onJoinGroup={handleJoinGroup}
      onOpenGroup={handleOpenGroup}
      onRespondInvitation={handleRespondInvitation}
      onSendGroupMessage={handleSendGroupMessage}
      onSendFriendRequest={handleSendFriendRequest}
      onCancelFriendRequest={handleCancelFriendRequest}
      onRespondFriendRequest={handleRespondFriendRequest}
      onRemoveFriend={handleRemoveFriend}
    />
  );
}
