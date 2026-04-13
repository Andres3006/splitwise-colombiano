const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    getUsers,
    getMyMovements,
    depositToWallet,
    withdrawFromWallet,
    getAdminGroups,
    moderateUser,
    deleteGroupAsAdmin
} = require('../controllers/users.controller');

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.get('/admin/groups', verifyToken, getAdminGroups);
router.get('/me/movements', verifyToken, getMyMovements);
router.post('/me/wallet/deposit', verifyToken, depositToWallet);
router.post('/me/wallet/withdraw', verifyToken, withdrawFromWallet);
router.patch('/admin/users/:userId/moderation', verifyToken, moderateUser);
router.delete('/admin/groups/:groupId', verifyToken, deleteGroupAsAdmin);

module.exports = router;
