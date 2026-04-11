const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    createGroup,
    addGroupMember,
    getMyGroups,
    getGroupDetails,
    inviteToGroup,
    respondToInvitation,
    getMyInvitations
} = require('../controllers/groups.controller');

const router = express.Router();

router.post('/', verifyToken, createGroup);
router.get('/me', verifyToken, getMyGroups);
router.get('/invitations/me', verifyToken, getMyInvitations);
router.get('/:groupId', verifyToken, getGroupDetails);
router.post('/:groupId/members', verifyToken, addGroupMember);
router.post('/:groupId/invitations', verifyToken, inviteToGroup);
router.patch('/invitations/:invitationId/respond', verifyToken, respondToInvitation);

module.exports = router;
