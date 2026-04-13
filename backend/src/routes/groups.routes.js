const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    createGroup,
    addGroupMember,
    getMyGroups,
    getPublicGroups,
    joinPublicGroup,
    getGroupDetails,
    inviteToGroup,
    respondToInvitation,
    getMyInvitations,
    leaveGroup,
    deleteGroup,
    getGroupMessages,
    sendGroupMessage
} = require('../controllers/groups.controller');

const router = express.Router();

router.post('/', verifyToken, createGroup);
router.get('/me', verifyToken, getMyGroups);
router.get('/public', verifyToken, getPublicGroups);
router.get('/invitations/me', verifyToken, getMyInvitations);
router.get('/:groupId/messages', verifyToken, getGroupMessages);
router.get('/:groupId', verifyToken, getGroupDetails);
router.post('/:groupId/join', verifyToken, joinPublicGroup);
router.delete('/:groupId', verifyToken, deleteGroup);
router.delete('/:groupId/leave', verifyToken, leaveGroup);
router.post('/:groupId/messages', verifyToken, sendGroupMessage);
router.post('/:groupId/members', verifyToken, addGroupMember);
router.post('/:groupId/invitations', verifyToken, inviteToGroup);
router.patch('/invitations/:invitationId/respond', verifyToken, respondToInvitation);

module.exports = router;
