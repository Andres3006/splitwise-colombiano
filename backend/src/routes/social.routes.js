const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    listUsers,
    sendFriendRequest,
    getFriendRequests,
    cancelFriendRequest,
    respondFriendRequest,
    getFriends
} = require('../controllers/social.controller');

const router = express.Router();

router.get('/users', verifyToken, listUsers);
router.post('/friend-requests', verifyToken, sendFriendRequest);
router.get('/friend-requests', verifyToken, getFriendRequests);
router.delete('/friend-requests/:requestId', verifyToken, cancelFriendRequest);
router.patch('/friend-requests/:requestId/respond', verifyToken, respondFriendRequest);
router.get('/friends', verifyToken, getFriends);

module.exports = router;
