const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getUsers, getMyMovements, depositToWallet, withdrawFromWallet } = require('../controllers/users.controller');

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.get('/me/movements', verifyToken, getMyMovements);
router.post('/me/wallet/deposit', verifyToken, depositToWallet);
router.post('/me/wallet/withdraw', verifyToken, withdrawFromWallet);

module.exports = router;
